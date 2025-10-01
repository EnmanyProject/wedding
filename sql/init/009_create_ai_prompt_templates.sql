-- AI Prompt Templates for Image Generation
-- Allows administrators to manage Korean prompts with automatic English conversion

-- AI prompt templates table
CREATE TABLE ai_prompt_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(100) NOT NULL,
    description TEXT,
    korean_prompt TEXT NOT NULL,
    english_prompt TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin users table for prompt management authentication
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'ADMIN' CHECK (role IN ('ADMIN', 'SUPER_ADMIN')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Default admin user (password: admin)
INSERT INTO admin_users (username, password_hash)
VALUES ('admin', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8');

-- Default prompt templates
INSERT INTO ai_prompt_templates (title, description, korean_prompt, english_prompt, category, is_default) VALUES
('음식 사진', '맛있어 보이는 음식 사진', '맛있어 보이는 음식', 'delicious looking food', '음식', true),
('자연 풍경', '아름다운 자연 경치', '아름다운 자연 풍경', 'beautiful natural landscape', '자연', true),
('동물', '귀여운 동물', '귀여운 동물', 'cute animal', '동물', true),
('건물', '멋진 건축물', '멋진 건물', 'beautiful architecture', '건물', true),
('사람', '사람 인물 사진', '사람', 'person portrait', '사람', true),
('추상', '추상적인 이미지', '추상적인', 'abstract art', '추상', true);

-- Indexes for performance
CREATE INDEX idx_ai_prompt_templates_category ON ai_prompt_templates(category);
CREATE INDEX idx_ai_prompt_templates_active ON ai_prompt_templates(is_active);
CREATE INDEX idx_ai_prompt_templates_default ON ai_prompt_templates(is_default);
CREATE INDEX idx_admin_users_username ON admin_users(username);
CREATE INDEX idx_admin_users_active ON admin_users(is_active);

-- Trigger for updated_at timestamp
CREATE TRIGGER update_ai_prompt_templates_updated_at BEFORE UPDATE ON ai_prompt_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();