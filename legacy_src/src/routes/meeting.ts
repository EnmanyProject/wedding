import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { Database } from '../utils/database';
import { config } from '../utils/config';
import { v4 as uuidv4 } from 'uuid';
import {
  MeetingStateResponse,
  MeetingEnterRequest,
  MeetingEnterResponse,
  ApiResponse
} from '../types/api';

const router = Router();
const db = Database.getInstance();

// Validation schemas
const enterMeetingSchema = z.object({
  target_id: z.string().uuid()
});

/**
 * GET /me/meeting-state
 * Get user's meeting availability and active chats
 */
router.get('/me/meeting-state', authenticateToken, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.userId!;

  // Get available meetings (high affinity scores)
  const availableMeetings = await db.query(
    `SELECT
       a.target_id,
       u.name as target_name,
       a.score as affinity_score,
       ms.unlocked_at
     FROM affinity a
     JOIN users u ON a.target_id = u.id
     LEFT JOIN meeting_states ms ON (
       (ms.user1_id = $1 AND ms.user2_id = a.target_id) OR
       (ms.user2_id = $1 AND ms.user1_id = a.target_id)
     )
     WHERE a.viewer_id = $1
       AND a.score >= $2
       AND u.is_active = true
       AND (ms.state IS NULL OR ms.state = 'AVAILABLE')
     ORDER BY a.score DESC
     LIMIT 10`,
    [userId, config.AFFINITY_T3_THRESHOLD]
  );

  // Get active chats
  const activeChats = await db.query(
    `SELECT
       ms.id as meeting_id,
       CASE
         WHEN ms.user1_id = $1 THEN ms.user2_id
         ELSE ms.user1_id
       END as target_id,
       CASE
         WHEN ms.user1_id = $1 THEN u2.name
         ELSE u1.name
       END as target_name,
       cm.message as last_message,
       cm.created_at as last_message_at,
       (
         SELECT COUNT(*)
         FROM chat_messages cm2
         WHERE cm2.meeting_id = ms.id
           AND cm2.sender_id != $1
           AND cm2.read_at IS NULL
       ) as unread_count
     FROM meeting_states ms
     JOIN users u1 ON ms.user1_id = u1.id
     JOIN users u2 ON ms.user2_id = u2.id
     LEFT JOIN LATERAL (
       SELECT message, created_at
       FROM chat_messages
       WHERE meeting_id = ms.id
       ORDER BY created_at DESC
       LIMIT 1
     ) cm ON true
     WHERE (ms.user1_id = $1 OR ms.user2_id = $1)
       AND ms.state IN ('CONNECTED', 'CHATTING')
     ORDER BY COALESCE(cm.created_at, ms.connected_at) DESC`,
    [userId]
  );

  const response: ApiResponse<MeetingStateResponse> = {
    success: true,
    data: {
      available_meetings: availableMeetings.map(m => ({
        target_id: m.target_id,
        target_name: m.target_name,
        affinity_score: m.affinity_score,
        unlocked_at: m.unlocked_at || new Date()
      })),
      active_chats: activeChats.map(c => ({
        meeting_id: c.meeting_id,
        target_id: c.target_id,
        target_name: c.target_name,
        last_message: c.last_message,
        last_message_at: c.last_message_at,
        unread_count: parseInt(c.unread_count) || 0
      }))
    },
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * POST /meeting/enter
 * Enter meeting with target user
 */
router.post('/enter', authenticateToken, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const body = enterMeetingSchema.parse(req.body) as MeetingEnterRequest;
  const userId = req.userId!;
  const targetId = body.target_id;

  if (userId === targetId) {
    throw createError('Cannot meet with yourself', 400, 'SELF_MEETING_FORBIDDEN');
  }

  // Check affinity score
  const [affinity] = await db.query(
    'SELECT score FROM affinity WHERE viewer_id = $1 AND target_id = $2',
    [userId, targetId]
  );

  if (!affinity || affinity.score < config.AFFINITY_T3_THRESHOLD) {
    throw createError('Insufficient affinity to meet', 400, 'INSUFFICIENT_AFFINITY');
  }

  const result = await db.transaction(async (client) => {
    // Ensure consistent user ordering for meeting states
    const user1Id = userId < targetId ? userId : targetId;
    const user2Id = userId < targetId ? targetId : userId;

    // Check if meeting already exists
    let [meeting] = await client.query(
      'SELECT * FROM meeting_states WHERE user1_id = $1 AND user2_id = $2',
      [user1Id, user2Id]
    );

    if (!meeting) {
      // Create new meeting
      const meetingId = uuidv4();
      [meeting] = await client.query(
        `INSERT INTO meeting_states (id, user1_id, user2_id, state, unlocked_at, connected_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW(), NOW())
         RETURNING *`,
        [meetingId, user1Id, user2Id, 'CONNECTED']
      );
    } else if (meeting.state === 'LOCKED') {
      // Unlock existing meeting
      [meeting] = await client.query(
        `UPDATE meeting_states
         SET state = 'CONNECTED', unlocked_at = NOW(), connected_at = NOW(), updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [meeting.id]
      );
    } else if (meeting.state === 'AVAILABLE') {
      // Connect to available meeting
      [meeting] = await client.query(
        `UPDATE meeting_states
         SET state = 'CONNECTED', connected_at = NOW(), updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [meeting.id]
      );
    }

    return meeting;
  });

  const response: ApiResponse<MeetingEnterResponse> = {
    success: true,
    data: {
      meeting_id: meeting.id,
      state: meeting.state,
      connected_at: meeting.connected_at,
      chat_enabled: meeting.state === 'CONNECTED' || meeting.state === 'CHATTING'
    },
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * GET /meeting/:meetingId/messages
 * Get chat messages for a meeting
 */
router.get('/:meetingId/messages', authenticateToken, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.userId!;
  const meetingId = req.params.meetingId;
  const page = parseInt(req.query.page as string) || 1;
  const perPage = Math.min(parseInt(req.query.per_page as string) || 20, 50);
  const offset = (page - 1) * perPage;

  // Verify user is part of this meeting
  const [meeting] = await db.query(
    'SELECT * FROM meeting_states WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)',
    [meetingId, userId]
  );

  if (!meeting) {
    throw createError('Meeting not found or unauthorized', 404, 'MEETING_NOT_FOUND');
  }

  // Get messages
  const messages = await db.query(
    `SELECT
       cm.*,
       u.name as sender_name
     FROM chat_messages cm
     JOIN users u ON cm.sender_id = u.id
     WHERE cm.meeting_id = $1
     ORDER BY cm.created_at DESC
     LIMIT $2 OFFSET $3`,
    [meetingId, perPage, offset]
  );

  // Mark messages as read
  await db.query(
    `UPDATE chat_messages
     SET read_at = NOW()
     WHERE meeting_id = $1 AND sender_id != $2 AND read_at IS NULL`,
    [meetingId, userId]
  );

  const [total] = await db.query(
    'SELECT COUNT(*) as count FROM chat_messages WHERE meeting_id = $1',
    [meetingId]
  );

  const response: ApiResponse = {
    success: true,
    data: {
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        page,
        per_page: perPage,
        total: total?.count || 0,
        has_next: offset + perPage < (total?.count || 0),
        has_prev: page > 1
      }
    },
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * POST /meeting/:meetingId/message
 * Send a chat message
 */
router.post('/:meetingId/message', authenticateToken, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.userId!;
  const meetingId = req.params.meetingId;
  const { message, message_type = 'TEXT' } = req.body;

  if (!message || message.trim().length === 0) {
    throw createError('Message cannot be empty', 400, 'EMPTY_MESSAGE');
  }

  if (message.length > 1000) {
    throw createError('Message too long (max 1000 characters)', 400, 'MESSAGE_TOO_LONG');
  }

  // Verify user is part of this meeting
  const [meeting] = await db.query(
    'SELECT * FROM meeting_states WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)',
    [meetingId, userId]
  );

  if (!meeting) {
    throw createError('Meeting not found or unauthorized', 404, 'MEETING_NOT_FOUND');
  }

  if (meeting.state !== 'CONNECTED' && meeting.state !== 'CHATTING') {
    throw createError('Meeting not in active state', 400, 'MEETING_NOT_ACTIVE');
  }

  // Create message
  const messageId = uuidv4();
  const [chatMessage] = await db.query(
    `INSERT INTO chat_messages (id, meeting_id, sender_id, message, message_type, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING *`,
    [messageId, meetingId, userId, message.trim(), message_type]
  );

  // Update meeting state to CHATTING
  if (meeting.state === 'CONNECTED') {
    await db.query(
      `UPDATE meeting_states SET state = 'CHATTING', updated_at = NOW() WHERE id = $1`,
      [meetingId]
    );
  }

  const response: ApiResponse = {
    success: true,
    data: {
      message: chatMessage
    },
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

export default router;