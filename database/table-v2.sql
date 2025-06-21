-- Function update timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Bảng Users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    level VARCHAR(20) DEFAULT 'beginner' CHECK (level IN ('beginner', 'intermediate', 'advanced')),
    total_points INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Lessons
CREATE TABLE lessons (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    difficulty_level VARCHAR(10) DEFAULT 'easy' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    total_questions INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Quiz Questions (đơn giản hóa - questions thuộc lesson)
CREATE TABLE quiz_questions (
    id SERIAL PRIMARY KEY,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    correct_answer VARCHAR(200) NOT NULL,
    option_a VARCHAR(200),
    option_b VARCHAR(200),
    option_c VARCHAR(200),
    option_d VARCHAR(200),
    explanation TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng User Progress
CREATE TABLE user_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, lesson_id)
);

-- Bảng Quiz Attempts (lưu kết quả làm bài)
CREATE TABLE quiz_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7), -- Hex color code
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Words - Từ vựng
CREATE TABLE IF NOT EXISTS words (
    id SERIAL PRIMARY KEY,
    word VARCHAR(100) NOT NULL,
    pronunciation VARCHAR(100), -- IPA pronunciation
    meaning VARCHAR(500) NOT NULL,
    definition TEXT,
    example_sentence TEXT,
    category_id INTEGER,
    difficulty_level VARCHAR(20) DEFAULT 'easy' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    audio_url VARCHAR(255),
    image_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Triggers
CREATE TRIGGER trigger_users_updated_at
BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_quiz_questions_lesson ON quiz_questions(lesson_id);
CREATE INDEX idx_user_progress_user ON user_progress(user_id);
CREATE INDEX idx_quiz_attempts_user ON quiz_attempts(user_id);
