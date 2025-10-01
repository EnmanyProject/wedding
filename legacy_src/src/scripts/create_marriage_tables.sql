-- Marriage agency comprehensive data tables
-- Supports staged information disclosure based on affinity scores

-- Basic profile information (T1 - 10 points)
CREATE TABLE IF NOT EXISTS user_basic_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Basic demographics
    age INTEGER,
    height INTEGER, -- in cm
    weight INTEGER, -- in kg
    blood_type VARCHAR(5), -- A, B, AB, O
    zodiac_sign VARCHAR(20),

    -- Location
    residence_city VARCHAR(100),
    residence_district VARCHAR(100),
    hometown_city VARCHAR(100),
    hometown_district VARCHAR(100),

    -- Appearance
    body_type VARCHAR(20), -- slim, average, athletic, etc.
    face_shape VARCHAR(20),
    skin_tone VARCHAR(20),

    -- Basic personality
    personality_type VARCHAR(50), -- MBTI or other
    introduction TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Economic information (T2 - 50 points)
CREATE TABLE IF NOT EXISTS user_economic_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Employment
    occupation VARCHAR(100),
    company_name VARCHAR(200),
    company_size VARCHAR(50), -- startup, SME, large_corp, public
    position VARCHAR(100),
    years_of_experience INTEGER,
    work_location_city VARCHAR(100),

    -- Income
    annual_income BIGINT, -- in won
    income_level VARCHAR(20), -- low, middle, high, very_high
    additional_income BIGINT,

    -- Assets
    real_estate_owned TEXT[], -- array of properties
    real_estate_value BIGINT,
    savings_amount BIGINT,
    investments_value BIGINT,
    car_owned VARCHAR(100),
    car_value BIGINT,

    -- Financial status
    debt_amount BIGINT,
    credit_score INTEGER,
    financial_stability VARCHAR(20), -- stable, unstable, excellent

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Family information (T2 - 50 points)
CREATE TABLE IF NOT EXISTS user_family_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Parents
    father_alive BOOLEAN,
    father_age INTEGER,
    father_occupation VARCHAR(100),
    mother_alive BOOLEAN,
    mother_age INTEGER,
    mother_occupation VARCHAR(100),

    -- Family structure
    siblings_count INTEGER,
    birth_order INTEGER,
    family_income_level VARCHAR(20),
    family_social_status VARCHAR(50),

    -- Family background
    family_religion VARCHAR(50),
    family_political_view VARCHAR(50),
    family_values TEXT,

    -- Parent attitudes
    parents_marriage_view TEXT,
    family_support_level VARCHAR(20), -- supportive, neutral, opposed

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Marriage and relationship history (T3 - 100 points)
CREATE TABLE IF NOT EXISTS user_marriage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Marriage status
    marriage_status VARCHAR(20) NOT NULL, -- single, divorced, widowed, separated
    previous_marriages_count INTEGER DEFAULT 0,

    -- Previous marriage details
    previous_marriage_duration INTEGER, -- months
    divorce_reason TEXT,
    divorce_date DATE,

    -- Children
    has_children BOOLEAN DEFAULT FALSE,
    children_count INTEGER DEFAULT 0,
    children_ages INTEGER[],
    children_custody VARCHAR(50), -- full, shared, none, other
    child_support_amount BIGINT,

    -- Relationship history
    longest_relationship_duration INTEGER, -- months
    last_relationship_ended DATE,
    relationship_break_reasons TEXT[],

    -- Future plans
    wants_children BOOLEAN,
    desired_children_count INTEGER,
    marriage_timeline VARCHAR(50), -- within_1year, within_2years, etc.

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Education and career (T2 - 50 points)
CREATE TABLE IF NOT EXISTS user_education_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Formal education
    highest_education VARCHAR(50), -- high_school, bachelor, master, doctorate
    university_name VARCHAR(200),
    university_ranking VARCHAR(20), -- SKY, in-seoul, local, overseas
    major VARCHAR(100),
    graduation_year INTEGER,
    gpa DECIMAL(3,2),

    -- Additional education
    study_abroad_experience TEXT[],
    language_skills JSONB, -- {"english": "fluent", "chinese": "basic"}
    certifications TEXT[],

    -- Academic achievements
    academic_awards TEXT[],
    research_experience TEXT,
    publications TEXT[],

    -- Career trajectory
    career_goals TEXT,
    career_stability VARCHAR(20),
    career_ambition_level VARCHAR(20), -- low, moderate, high, very_high

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Lifestyle and preferences (T2 - 50 points)
CREATE TABLE IF NOT EXISTS user_lifestyle_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Lifestyle
    lifestyle_type VARCHAR(50), -- active, quiet, social, intellectual
    hobbies TEXT[],
    interests TEXT[],
    exercise_habits VARCHAR(50),
    diet_type VARCHAR(50), -- normal, vegetarian, vegan, etc.

    -- Social life
    social_circle_size VARCHAR(20), -- small, medium, large
    party_frequency VARCHAR(20), -- never, rarely, sometimes, often
    travel_frequency VARCHAR(20),
    favorite_travel_destinations TEXT[],

    -- Personal habits
    smoking_status VARCHAR(20), -- never, former, social, regular
    drinking_frequency VARCHAR(20), -- never, rarely, social, regular
    sleep_pattern VARCHAR(50),

    -- Values and beliefs
    religion VARCHAR(50),
    religious_devotion VARCHAR(20), -- not_religious, casual, devout
    political_view VARCHAR(50),
    life_philosophy TEXT,

    -- Preferences
    ideal_date_activities TEXT[],
    deal_breakers TEXT[],
    relationship_goals TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Health and medical information (T3 - 100 points)
CREATE TABLE IF NOT EXISTS user_health_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Physical health
    overall_health VARCHAR(20), -- excellent, good, fair, poor
    chronic_conditions TEXT[],
    medications TEXT[],
    allergies TEXT[],

    -- Mental health
    mental_health_status VARCHAR(20),
    therapy_history BOOLEAN,
    stress_level VARCHAR(20),

    -- Reproductive health
    fertility_status VARCHAR(50),
    genetic_conditions TEXT[],
    family_medical_history TEXT,

    -- Lifestyle health
    exercise_frequency VARCHAR(20),
    fitness_level VARCHAR(20),
    diet_restrictions TEXT[],

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Verification and authenticity (T3 - 100 points)
CREATE TABLE IF NOT EXISTS user_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Identity verification
    identity_verified BOOLEAN DEFAULT FALSE,
    identity_verification_date TIMESTAMP,
    identity_document_type VARCHAR(50),

    -- Income verification
    income_verified BOOLEAN DEFAULT FALSE,
    income_verification_date TIMESTAMP,
    income_document_type VARCHAR(50),

    -- Education verification
    education_verified BOOLEAN DEFAULT FALSE,
    education_verification_date TIMESTAMP,

    -- Employment verification
    employment_verified BOOLEAN DEFAULT FALSE,
    employment_verification_date TIMESTAMP,

    -- Background checks
    criminal_background_check BOOLEAN DEFAULT FALSE,
    credit_check_completed BOOLEAN DEFAULT FALSE,
    reference_checks TEXT[],

    -- Verification status
    overall_verification_score INTEGER DEFAULT 0, -- 0-100
    verification_level VARCHAR(20), -- basic, standard, premium

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Information disclosure milestones
CREATE TABLE IF NOT EXISTS user_disclosure_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Milestone thresholds
    t1_unlocked BOOLEAN DEFAULT FALSE, -- 10 points - basic info
    t1_unlocked_at TIMESTAMP,

    t2_unlocked BOOLEAN DEFAULT FALSE, -- 50 points - economic/family/education/lifestyle
    t2_unlocked_at TIMESTAMP,

    t3_unlocked BOOLEAN DEFAULT FALSE, -- 100 points - marriage history/health/verification
    t3_unlocked_at TIMESTAMP,

    -- Current affinity score
    current_affinity_score INTEGER DEFAULT 0,

    -- Unique constraint to prevent duplicates
    UNIQUE(user_id, target_user_id),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_basic_profiles_user_id ON user_basic_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_economic_profiles_user_id ON user_economic_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_family_profiles_user_id ON user_family_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_marriage_history_user_id ON user_marriage_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_education_profiles_user_id ON user_education_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lifestyle_profiles_user_id ON user_lifestyle_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_health_profiles_user_id ON user_health_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_verifications_user_id ON user_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_disclosure_milestones_user_target ON user_disclosure_milestones(user_id, target_user_id);
CREATE INDEX IF NOT EXISTS idx_user_disclosure_milestones_affinity ON user_disclosure_milestones(current_affinity_score);