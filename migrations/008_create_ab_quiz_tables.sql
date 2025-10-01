-- Create A&B quiz tables
CREATE TABLE IF NOT EXISTS ab_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    option_a_title VARCHAR(100) NOT NULL,
    option_a_description TEXT,
    option_a_image VARCHAR(255),
    option_b_title VARCHAR(100) NOT NULL,
    option_b_description TEXT,
    option_b_image VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create A&B quiz responses table for user responses
CREATE TABLE IF NOT EXISTS ab_quiz_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES ab_quizzes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    choice VARCHAR(1) NOT NULL CHECK (choice IN ('A', 'B')),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(quiz_id, user_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ab_quizzes_category ON ab_quizzes(category);
CREATE INDEX IF NOT EXISTS idx_ab_quizzes_active ON ab_quizzes(is_active);
CREATE INDEX IF NOT EXISTS idx_ab_quizzes_created_at ON ab_quizzes(created_at);
CREATE INDEX IF NOT EXISTS idx_ab_quiz_responses_quiz_id ON ab_quiz_responses(quiz_id);
CREATE INDEX IF NOT EXISTS idx_ab_quiz_responses_user_id ON ab_quiz_responses(user_id);