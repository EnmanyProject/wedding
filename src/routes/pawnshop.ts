import { Router, Request, Response } from 'express';
import multer from 'multer';
import { pawnshopService } from '../services/pawnshopService';
import { authenticateToken } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Multer 설정 (메모리 스토리지 사용)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // 이미지 파일만 허용
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'));
    }
  },
});

// 인증 미들웨어 적용
router.use(authenticateToken);

/**
 * POST /api/pawnshop/pawn-photo
 * 사진 맡기기
 */
router.post('/pawn-photo', upload.single('photo'), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    // 파일 검증
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '사진 파일이 필요합니다.',
        timestamp: new Date().toISOString()
      });
    }

    // photoType 검증
    const { photoType } = req.body;
    if (!photoType) {
      return res.status(400).json({
        success: false,
        error: 'photoType이 필요합니다.',
        timestamp: new Date().toISOString()
      });
    }

    // photoType 값 검증
    const validPhotoTypes = ['face', 'body', 'hobby', 'lifestyle'];
    if (!validPhotoTypes.includes(photoType)) {
      return res.status(400).json({
        success: false,
        error: `올바르지 않은 photoType입니다. (허용: ${validPhotoTypes.join(', ')})`,
        timestamp: new Date().toISOString()
      });
    }

    // 파일 정보
    const file = req.file.buffer;
    const mimeType = req.file.mimetype;
    const fileSize = req.file.size;

    console.log('📸 [Pawnshop] 사진 맡기기 요청:', {
      userId,
      photoType,
      fileSize,
      mimeType
    });

    // 서비스 호출
    const result = await pawnshopService.pawnPhoto(
      userId,
      file,
      photoType,
      mimeType,
      fileSize
    );

    res.status(201).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('사진 맡기기 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message || '사진 맡기기에 실패했습니다.',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/pawnshop/pawn-info
 * 정보 맡기기
 */
// 요청 검증 스키마
const pawnInfoSchema = z.object({
  infoType: z.enum(['ideal_type', 'job', 'hobby']),
  content: z.string().min(1).max(1000),
});

router.post('/pawn-info', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    // 요청 검증
    const validation = pawnInfoSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: '올바르지 않은 요청입니다.',
        details: validation.error.errors,
        timestamp: new Date().toISOString()
      });
    }

    const { infoType, content } = validation.data;

    console.log('📝 [Pawnshop] 정보 맡기기 요청:', {
      userId,
      infoType,
      contentLength: content.length
    });

    // 서비스 호출
    const result = await pawnshopService.pawnInfo(
      userId,
      infoType,
      content
    );

    res.status(201).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('정보 맡기기 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message || '정보 맡기기에 실패했습니다.',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/pawnshop/my-photos
 * 내가 맡긴 사진 목록 조회
 */
router.get('/my-photos', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    const photos = await pawnshopService.getMyPawnedPhotos(userId);

    res.json({
      success: true,
      data: photos,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('맡긴 사진 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message || '맡긴 사진 목록 조회에 실패했습니다.',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/pawnshop/my-info
 * 내가 맡긴 정보 목록 조회
 */
router.get('/my-info', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    const info = await pawnshopService.getMyPawnedInfo(userId);

    res.json({
      success: true,
      data: info,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('맡긴 정보 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message || '맡긴 정보 목록 조회에 실패했습니다.',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/pawnshop/photos/:photoId
 * 맡긴 사진 삭제
 */
router.delete('/photos/:photoId', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    const photoId = parseInt(req.params.photoId);
    if (isNaN(photoId)) {
      return res.status(400).json({
        success: false,
        error: '올바르지 않은 photoId입니다.',
        timestamp: new Date().toISOString()
      });
    }

    await pawnshopService.deletePawnedPhoto(userId, photoId);

    res.json({
      success: true,
      message: '사진이 삭제되었습니다.',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('사진 삭제 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message || '사진 삭제에 실패했습니다.',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/pawnshop/info/:infoId
 * 맡긴 정보 삭제
 */
router.delete('/info/:infoId', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    const infoId = parseInt(req.params.infoId);
    if (isNaN(infoId)) {
      return res.status(400).json({
        success: false,
        error: '올바르지 않은 infoId입니다.',
        timestamp: new Date().toISOString()
      });
    }

    await pawnshopService.deletePawnedInfo(userId, infoId);

    res.json({
      success: true,
      message: '정보가 삭제되었습니다.',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('정보 삭제 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message || '정보 삭제에 실패했습니다.',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/pawnshop/ab-quiz/unanswered
 * 미응답 A&B 퀴즈 조회 (전당포용)
 */
router.get('/ab-quiz/unanswered', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    // 오늘 응답 수 확인
    const todayCount = await pawnshopService.getTodayPawnshopQuizCount(userId);
    const remainingCount = Math.max(0, 10 - todayCount);

    if (remainingCount === 0) {
      return res.json({
        success: true,
        data: null,
        todayCount,
        remainingCount: 0,
        message: '오늘은 더 이상 퀴즈에 답변할 수 없습니다. (하루 10개 제한)',
        timestamp: new Date().toISOString()
      });
    }

    // 미응답 퀴즈 조회
    const quiz = await pawnshopService.getUnansweredQuiz(userId);

    res.json({
      success: true,
      data: quiz,
      todayCount,
      remainingCount,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('미응답 퀴즈 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message || '미응답 퀴즈 조회에 실패했습니다.',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/pawnshop/ab-quiz/answer
 * A&B 퀴즈 답변 제출 (전당포용)
 */
const abQuizAnswerSchema = z.object({
  quizId: z.string().uuid(),
  choice: z.enum(['A', 'B']),
});

router.post('/ab-quiz/answer', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    // 요청 검증
    const validation = abQuizAnswerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: '올바르지 않은 요청입니다.',
        details: validation.error.errors,
        timestamp: new Date().toISOString()
      });
    }

    const { quizId, choice } = validation.data;

    console.log('🎯 [Pawnshop] A&B 퀴즈 답변 제출:', {
      userId,
      quizId,
      choice
    });

    // 서비스 호출
    const result = await pawnshopService.submitPawnshopQuizAnswer(
      userId,
      quizId,
      choice
    );

    // 남은 횟수 계산
    const todayCount = await pawnshopService.getTodayPawnshopQuizCount(userId);
    const remainingCount = Math.max(0, 10 - todayCount);

    res.status(201).json({
      success: true,
      data: {
        ...result,
        todayCount,
        remainingCount
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('A&B 퀴즈 답변 제출 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'A&B 퀴즈 답변 제출에 실패했습니다.',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
