-- Tạo bảng để tracking từ đã học
CREATE TABLE IF NOT EXISTS user_words_learned (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    word_id INTEGER REFERENCES words(id) ON DELETE CASCADE,
    learned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, word_id)
);

-- Tạo index để tối ưu hóa
CREATE INDEX IF NOT EXISTS idx_user_words_learned_user_id ON user_words_learned(user_id);
CREATE INDEX IF NOT EXISTS idx_user_words_learned_word_id ON user_words_learned(word_id);

-- Tạo bảng user_stats đơn giản để track thống kê
CREATE TABLE IF NOT EXISTS user_stats (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    streak_days INTEGER DEFAULT 0,
    total_xp INTEGER DEFAULT 0,
    words_learned INTEGER DEFAULT 0,
    lessons_completed INTEGER DEFAULT 0,
    quizzes_passed INTEGER DEFAULT 0,
    last_activity_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
