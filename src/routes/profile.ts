import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { disclosureService } from '../services/disclosureService';
import { ApiResponse } from '../types/api';

const router = Router();

// Validation schemas
const profileViewSchema = z.object({
  target_id: z.string().uuid()
});

/**
 * GET /profile/:targetId/view
 * Get target user's profile based on disclosure milestones
 */
router.get('/:targetId/view', authenticateToken, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  console.log('👤 [ProfileRoute] GET /profile/:targetId/view 요청 시작');
  console.log('📝 [ProfileRoute] 요청 파라미터:', req.params);
  console.log('👤 [ProfileRoute] 인증된 사용자 ID:', req.userId);

  const targetId = req.params.targetId;
  const userId = req.userId!;

  console.log('✅ [ProfileRoute] 파라미터 검증:', { userId, targetId });

  if (userId === targetId) {
    console.error('❌ [ProfileRoute] 자기 자신 프로필 조회 시도');
    throw createError('자기 자신의 프로필은 조회할 수 없습니다', 400, 'SELF_PROFILE_FORBIDDEN');
  }

  try {
    console.log('🔧 [ProfileRoute] disclosureService.getUserProfileWithDisclosure 호출');
    const result = await disclosureService.getUserProfileWithDisclosure(userId, targetId);

    console.log('✅ [ProfileRoute] 프로필 조회 성공:', {
      hasBasicProfile: !!result.profile.basic,
      hasEconomicProfile: !!result.profile.economic,
      hasFamilyProfile: !!result.profile.family,
      hasEducationProfile: !!result.profile.education,
      hasLifestyleProfile: !!result.profile.lifestyle,
      hasMarriageProfile: !!result.profile.marriage,
      hasHealthProfile: !!result.profile.health,
      hasVerificationProfile: !!result.profile.verification,
      milestones: {
        t1: result.milestones.t1_unlocked,
        t2: result.milestones.t2_unlocked,
        t3: result.milestones.t3_unlocked,
        score: result.milestones.current_affinity_score
      }
    });

    const response: ApiResponse = {
      success: true,
      data: {
        target_id: targetId,
        profile: result.profile,
        milestones: {
          t1_unlocked: result.milestones.t1_unlocked,
          t1_unlocked_at: result.milestones.t1_unlocked_at,
          t2_unlocked: result.milestones.t2_unlocked,
          t2_unlocked_at: result.milestones.t2_unlocked_at,
          t3_unlocked: result.milestones.t3_unlocked,
          t3_unlocked_at: result.milestones.t3_unlocked_at,
          current_affinity_score: result.milestones.current_affinity_score
        }
      },
      timestamp: new Date().toISOString()
    };

    console.log('🎉 [ProfileRoute] 프로필 응답 전송 완료');
    res.json(response);
  } catch (error: any) {
    console.error('❌ [ProfileRoute] 프로필 조회 오류:', {
      message: error.message,
      stack: error.stack,
      requestData: { userId, targetId }
    });
    throw error;
  }
}));

/**
 * GET /profile/milestones/:targetId
 * Get disclosure milestones with target user
 */
router.get('/milestones/:targetId', authenticateToken, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  console.log('🏆 [ProfileRoute] GET /profile/milestones/:targetId 요청 시작');
  console.log('📝 [ProfileRoute] 요청 파라미터:', req.params);
  console.log('👤 [ProfileRoute] 인증된 사용자 ID:', req.userId);

  const targetId = req.params.targetId;
  const userId = req.userId!;

  if (userId === targetId) {
    throw createError('자기 자신과의 마일스톤은 조회할 수 없습니다', 400, 'SELF_MILESTONE_FORBIDDEN');
  }

  try {
    console.log('🔧 [ProfileRoute] disclosureService.getDisclosureMilestones 호출');
    const milestones = await disclosureService.getDisclosureMilestones(userId, targetId);

    console.log('✅ [ProfileRoute] 마일스톤 조회 성공:', milestones);

    const response: ApiResponse = {
      success: true,
      data: {
        target_id: targetId,
        milestones: milestones
      },
      timestamp: new Date().toISOString()
    };

    console.log('🎉 [ProfileRoute] 마일스톤 응답 전송 완료');
    res.json(response);
  } catch (error: any) {
    console.error('❌ [ProfileRoute] 마일스톤 조회 오류:', {
      message: error.message,
      stack: error.stack,
      requestData: { userId, targetId }
    });
    throw error;
  }
}));

/**
 * POST /profile/milestones/:targetId/update
 * Update milestones based on current affinity score
 */
router.post('/milestones/:targetId/update', authenticateToken, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  console.log('🔄 [ProfileRoute] POST /profile/milestones/:targetId/update 요청 시작');
  console.log('📝 [ProfileRoute] 요청 파라미터:', req.params);
  console.log('👤 [ProfileRoute] 인증된 사용자 ID:', req.userId);

  const targetId = req.params.targetId;
  const userId = req.userId!;

  if (userId === targetId) {
    throw createError('자기 자신과의 마일스톤은 업데이트할 수 없습니다', 400, 'SELF_MILESTONE_FORBIDDEN');
  }

  try {
    console.log('🔧 [ProfileRoute] disclosureService.updateMilestoneFromAffinity 호출');
    await disclosureService.updateMilestoneFromAffinity(userId, targetId);

    // Get updated milestones
    const milestones = await disclosureService.getDisclosureMilestones(userId, targetId);

    console.log('✅ [ProfileRoute] 마일스톤 업데이트 성공:', milestones);

    const response: ApiResponse = {
      success: true,
      data: {
        target_id: targetId,
        milestones: milestones
      },
      timestamp: new Date().toISOString()
    };

    console.log('🎉 [ProfileRoute] 마일스톤 업데이트 응답 전송 완료');
    res.json(response);
  } catch (error: any) {
    console.error('❌ [ProfileRoute] 마일스톤 업데이트 오류:', {
      message: error.message,
      stack: error.stack,
      requestData: { userId, targetId }
    });
    throw error;
  }
}));

export default router;