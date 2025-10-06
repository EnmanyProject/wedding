-- =====================================================
-- 011: Daily Recommendations System
-- =====================================================
-- 일일 추천 시스템 테이블 생성
-- 룰 베이스 알고리즘으로 개인화된 일일 파트너 추천

-- =====================================================
-- 1. daily_recommendations 테이블
-- =====================================================
-- 사용자별 일일 추천 목록 저장

CREATE TABLE IF NOT EXISTS daily_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recommended_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 추천 점수 (0-100)
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),

    -- 추천 점수 세부 내역
    similarity_score INTEGER NOT NULL DEFAULT 0 CHECK (similarity_score >= 0 AND similarity_score <= 50),
    activity_score INTEGER NOT NULL DEFAULT 0 CHECK (activity_score >= 0 AND activity_score <= 30),
    novelty_score INTEGER NOT NULL DEFAULT 0 CHECK (novelty_score >= 0 AND novelty_score <= 20),

    -- 추천 순위 (1-5)
    rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 5),

    -- 추천 날짜
    recommendation_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- 사용자 반응
    viewed_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    quiz_started_at TIMESTAMP WITH TIME ZONE,

    -- 메타데이터
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 제약 조건
    CONSTRAINT unique_daily_recommendation UNIQUE (user_id, recommended_user_id, recommendation_date),
    CONSTRAINT no_self_recommendation CHECK (user_id != recommended_user_id)
);

-- 인덱스 생성
CREATE INDEX idx_daily_recommendations_user_date ON daily_recommendations(user_id, recommendation_date DESC);
CREATE INDEX idx_daily_recommendations_recommended_user ON daily_recommendations(recommended_user_id);
CREATE INDEX idx_daily_recommendations_score ON daily_recommendations(score DESC);
CREATE INDEX idx_daily_recommendations_date ON daily_recommendations(recommendation_date DESC);

-- =====================================================
-- 2. recommendation_history 테이블
-- =====================================================
-- 추천 통계 및 성과 추적

CREATE TABLE IF NOT EXISTS recommendation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 통계 날짜
    date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- 추천 통계
    total_recommendations INTEGER NOT NULL DEFAULT 5,
    viewed_count INTEGER NOT NULL DEFAULT 0,
    clicked_count INTEGER NOT NULL DEFAULT 0,
    quiz_started_count INTEGER NOT NULL DEFAULT 0,

    -- 성과 지표
    view_rate DECIMAL(5,2) DEFAULT 0.00, -- viewed / total * 100
    click_rate DECIMAL(5,2) DEFAULT 0.00, -- clicked / total * 100
    conversion_rate DECIMAL(5,2) DEFAULT 0.00, -- quiz_started / total * 100

    -- 메타데이터
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 제약 조건
    CONSTRAINT unique_recommendation_history UNIQUE (user_id, date)
);

-- 인덱스 생성
CREATE INDEX idx_recommendation_history_user ON recommendation_history(user_id);
CREATE INDEX idx_recommendation_history_date ON recommendation_history(date DESC);

-- =====================================================
-- 3. recommendation_settings 테이블
-- =====================================================
-- 사용자별 추천 설정

CREATE TABLE IF NOT EXISTS recommendation_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

    -- 추천 활성화
    enabled BOOLEAN NOT NULL DEFAULT TRUE,

    -- 추천 필터
    min_age INTEGER,
    max_age INTEGER,
    preferred_gender VARCHAR(20), -- 'male', 'female', 'any'
    preferred_region VARCHAR(100), -- 특정 지역 선호

    -- 추천 알고리즘 가중치 조정 (기본값: 50, 30, 20)
    similarity_weight INTEGER DEFAULT 50 CHECK (similarity_weight >= 0 AND similarity_weight <= 100),
    activity_weight INTEGER DEFAULT 30 CHECK (activity_weight >= 0 AND activity_weight <= 100),
    novelty_weight INTEGER DEFAULT 20 CHECK (novelty_weight >= 0 AND novelty_weight <= 100),

    -- 메타데이터
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. 자동 통계 업데이트 트리거
-- =====================================================

-- viewed_at 업데이트 시 통계 갱신
CREATE OR REPLACE FUNCTION update_recommendation_stats_on_view()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.viewed_at IS NOT NULL AND OLD.viewed_at IS NULL THEN
        INSERT INTO recommendation_history (user_id, date, viewed_count)
        VALUES (NEW.user_id, NEW.recommendation_date, 1)
        ON CONFLICT (user_id, date)
        DO UPDATE SET
            viewed_count = recommendation_history.viewed_count + 1,
            view_rate = (recommendation_history.viewed_count + 1) * 100.0 / recommendation_history.total_recommendations,
            updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stats_on_view
AFTER UPDATE OF viewed_at ON daily_recommendations
FOR EACH ROW
EXECUTE FUNCTION update_recommendation_stats_on_view();

-- clicked_at 업데이트 시 통계 갱신
CREATE OR REPLACE FUNCTION update_recommendation_stats_on_click()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.clicked_at IS NOT NULL AND OLD.clicked_at IS NULL THEN
        INSERT INTO recommendation_history (user_id, date, clicked_count)
        VALUES (NEW.user_id, NEW.recommendation_date, 1)
        ON CONFLICT (user_id, date)
        DO UPDATE SET
            clicked_count = recommendation_history.clicked_count + 1,
            click_rate = (recommendation_history.clicked_count + 1) * 100.0 / recommendation_history.total_recommendations,
            updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stats_on_click
AFTER UPDATE OF clicked_at ON daily_recommendations
FOR EACH ROW
EXECUTE FUNCTION update_recommendation_stats_on_click();

-- quiz_started_at 업데이트 시 통계 갱신
CREATE OR REPLACE FUNCTION update_recommendation_stats_on_quiz()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quiz_started_at IS NOT NULL AND OLD.quiz_started_at IS NULL THEN
        INSERT INTO recommendation_history (user_id, date, quiz_started_count)
        VALUES (NEW.user_id, NEW.recommendation_date, 1)
        ON CONFLICT (user_id, date)
        DO UPDATE SET
            quiz_started_count = recommendation_history.quiz_started_count + 1,
            conversion_rate = (recommendation_history.quiz_started_count + 1) * 100.0 / recommendation_history.total_recommendations,
            updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stats_on_quiz
AFTER UPDATE OF quiz_started_at ON daily_recommendations
FOR EACH ROW
EXECUTE FUNCTION update_recommendation_stats_on_quiz();

-- =====================================================
-- 5. 편의 함수
-- =====================================================

-- 오래된 추천 삭제 (30일 이상)
CREATE OR REPLACE FUNCTION cleanup_old_recommendations()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM daily_recommendations
    WHERE recommendation_date < CURRENT_DATE - INTERVAL '30 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 사용자의 오늘 추천 가져오기
CREATE OR REPLACE FUNCTION get_today_recommendations(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    recommended_user_id UUID,
    score INTEGER,
    rank INTEGER,
    user_name VARCHAR,
    user_display_name VARCHAR,
    user_age INTEGER,
    user_region VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        dr.id,
        dr.recommended_user_id,
        dr.score,
        dr.rank,
        u.name,
        u.display_name,
        u.age,
        u.region
    FROM daily_recommendations dr
    JOIN users u ON dr.recommended_user_id = u.id
    WHERE dr.user_id = p_user_id
    AND dr.recommendation_date = CURRENT_DATE
    ORDER BY dr.rank ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 완료
-- =====================================================
-- Migration 011 완료: Daily Recommendations System
