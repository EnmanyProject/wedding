/**
 * Mock Recommendation Service
 * 데이터베이스 없이 추천 시스템 테스트용
 */

interface DailyRecommendation {
  id: string;
  recommendedUserId: string;
  score: number;
  rank: number;
  userName: string;
  userDisplayName: string;
  userAge: number;
  userRegion: string;
  similarityScore?: number;
  activityScore?: number;
  noveltyScore?: number;
}

interface RecommendationStats {
  totalRecommendations: number;
  activeUsers: number;
  avgViewRate: number;
  avgClickRate: number;
  avgConversionRate: number;
}

interface TopPerformer {
  userId: string;
  userName: string;
  userDisplayName: string;
  totalViews: number;
  totalClicks: number;
  totalQuizStarts: number;
  clickRate: number;
  conversionRate: number;
}

// Mock 데이터 (여성형)
const mockUsers = [
  { id: '1', name: 'user1', displayName: '서울공주', age: 28, region: '서울' },
  { id: '2', name: 'user2', displayName: '부산아가씨', age: 26, region: '부산' },
  { id: '3', name: 'user3', displayName: '대구공주', age: 30, region: '대구' },
  { id: '4', name: 'user4', displayName: '인천언니', age: 27, region: '인천' },
  { id: '5', name: 'user5', displayName: '광주공주', age: 29, region: '광주' },
  { id: '6', name: 'user6', displayName: '대전언니', age: 25, region: '대전' },
  { id: '7', name: 'user7', displayName: '울산아가씨', age: 31, region: '울산' },
  { id: '8', name: 'user8', displayName: '세종공주', age: 24, region: '세종' },
  { id: '9', name: 'user9', displayName: '제주아가씨', age: 33, region: '제주' },
  { id: '10', name: 'user10', displayName: '강원언니', age: 28, region: '강원' },
];

// Mock 추천 데이터 저장소
const mockRecommendations = new Map<string, DailyRecommendation[]>();
const mockStats = new Map<string, { viewed: boolean; clicked: boolean; quizStarted: boolean }>();

export class MockRecommendationService {
  /**
   * 특정 사용자의 오늘 추천 조회
   */
  static async getTodayRecommendations(userId: string): Promise<DailyRecommendation[]> {
    // 이미 생성된 추천이 있으면 반환
    if (mockRecommendations.has(userId)) {
      return mockRecommendations.get(userId)!;
    }

    // 새로운 추천 생성
    const recommendations = this.generateRecommendationsForUser(userId);
    mockRecommendations.set(userId, recommendations);

    return recommendations;
  }

  /**
   * 특정 사용자에 대한 추천 생성
   */
  private static generateRecommendationsForUser(userId: string): DailyRecommendation[] {
    // 자신을 제외한 사용자들
    const candidates = mockUsers.filter(u => u.id !== userId);

    // 랜덤 점수 생성 (실제로는 유사도 알고리즘)
    const scored = candidates.map(user => {
      const similarityScore = Math.floor(Math.random() * 50); // 0-50
      const activityScore = Math.floor(Math.random() * 30);   // 0-30
      const noveltyScore = Math.floor(Math.random() * 20);    // 0-20
      const totalScore = similarityScore + activityScore + noveltyScore;

      return {
        id: `rec-${userId}-${user.id}-${Date.now()}`,
        recommendedUserId: user.id,
        userName: user.name,
        userDisplayName: user.displayName,
        userAge: user.age,
        userRegion: user.region,
        similarityScore,
        activityScore,
        noveltyScore,
        score: totalScore,
        rank: 0, // 나중에 설정
      };
    });

    // 점수순 정렬
    scored.sort((a, b) => b.score - a.score);

    // Top 5 선택 및 랭크 부여
    const top5 = scored.slice(0, 5).map((rec, index) => ({
      ...rec,
      rank: index + 1,
    }));

    return top5;
  }

  /**
   * 전체 사용자에 대한 추천 생성
   */
  static async generateAllDailyRecommendations(): Promise<void> {
    console.log('🔄 [Mock] Generating recommendations for all users...');

    // 모든 사용자에 대해 추천 생성
    for (const user of mockUsers) {
      const recommendations = this.generateRecommendationsForUser(user.id);
      mockRecommendations.set(user.id, recommendations);
    }

    console.log(`✅ [Mock] Generated recommendations for ${mockUsers.length} users`);
  }

  /**
   * 추천 클릭 기록
   */
  static async recordClick(recommendationId: string): Promise<void> {
    const stats = mockStats.get(recommendationId) || { viewed: true, clicked: false, quizStarted: false };
    stats.clicked = true;
    mockStats.set(recommendationId, stats);
  }

  /**
   * 퀴즈 시작 기록
   */
  static async recordQuizStart(recommendationId: string): Promise<void> {
    const stats = mockStats.get(recommendationId) || { viewed: true, clicked: true, quizStarted: false };
    stats.quizStarted = true;
    mockStats.set(recommendationId, stats);
  }

  /**
   * 추천 통계 조회
   */
  static async getRecommendationStats(userId: string): Promise<RecommendationStats> {
    const totalRecs = mockRecommendations.size * 5; // 사용자당 5개

    return {
      totalRecommendations: totalRecs,
      activeUsers: mockUsers.length,
      avgViewRate: 0.75,
      avgClickRate: 0.45,
      avgConversionRate: 0.25,
    };
  }

  /**
   * 오늘의 추천 통계 (관리자)
   */
  static async getTodayStats(): Promise<any[]> {
    const stats = [];

    for (const user of mockUsers.slice(0, 5)) { // 샘플 5명
      const recommendations = mockRecommendations.get(user.id) || [];

      stats.push({
        userId: user.id,
        userName: user.name,
        userDisplayName: user.displayName,
        recommendationCount: recommendations.length,
        viewedCount: Math.floor(recommendations.length * 0.8),
        clickedCount: Math.floor(recommendations.length * 0.5),
        quizStartedCount: Math.floor(recommendations.length * 0.3),
        viewRate: '80.0%',
        clickRate: '50.0%',
        conversionRate: '30.0%',
        lastGeneratedAt: new Date().toISOString(),
      });
    }

    return stats;
  }

  /**
   * 성과 상위 사용자 (관리자)
   */
  static async getTopPerformers(limit: number = 10): Promise<TopPerformer[]> {
    const performers = mockUsers.slice(0, limit).map((user, index) => ({
      userId: user.id,
      userName: user.name,
      userDisplayName: user.displayName,
      totalViews: Math.floor(Math.random() * 100) + 50,
      totalClicks: Math.floor(Math.random() * 50) + 20,
      totalQuizStarts: Math.floor(Math.random() * 30) + 10,
      clickRate: Math.random() * 0.5 + 0.3, // 30-80%
      conversionRate: Math.random() * 0.4 + 0.1, // 10-50%
    }));

    // 클릭률로 정렬
    performers.sort((a, b) => b.clickRate - a.clickRate);

    return performers;
  }

  /**
   * 전체 개요 (관리자)
   */
  static async getOverview(): Promise<any> {
    const totalRecs = mockRecommendations.size * 5;
    const totalViewed = Math.floor(totalRecs * 0.8);
    const totalClicked = Math.floor(totalRecs * 0.5);
    const totalQuizStarted = Math.floor(totalRecs * 0.3);

    return {
      total_users_with_recommendations: mockRecommendations.size,
      total_recommendations: totalRecs,
      total_viewed: totalViewed,
      total_clicked: totalClicked,
      total_quiz_started: totalQuizStarted,
      avg_score: 75.5,
    };
  }

  /**
   * 오래된 추천 정리
   */
  static async cleanupOldRecommendations(daysToKeep: number = 7): Promise<number> {
    console.log(`🧹 [Mock] Cleaning up recommendations older than ${daysToKeep} days...`);
    // Mock에서는 실제로 삭제하지 않음
    return 0;
  }

  /**
   * Mock 데이터 초기화
   */
  static resetMockData(): void {
    mockRecommendations.clear();
    mockStats.clear();
    console.log('🔄 [Mock] Reset all mock recommendation data');
  }
}
