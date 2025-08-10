-- Bảng Grammar Articles - Các bài viết ngữ pháp tiếng Anh
CREATE TABLE IF NOT EXISTS grammar_articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    difficulty_level VARCHAR(20) DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    category VARCHAR(100), -- Grammar category like 'Tenses', 'Conditionals', 'Modal Verbs', etc.
    tags TEXT[], -- Array of tags for better search
    reading_time INTEGER, -- Estimated reading time in minutes
    is_published BOOLEAN DEFAULT TRUE,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger để tự động cập nhật updated_at
CREATE TRIGGER update_grammar_articles_updated_at
    BEFORE UPDATE ON grammar_articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_grammar_articles_difficulty ON grammar_articles(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_grammar_articles_category ON grammar_articles(category);
CREATE INDEX IF NOT EXISTS idx_grammar_articles_published ON grammar_articles(is_published);
CREATE INDEX IF NOT EXISTS idx_grammar_articles_tags ON grammar_articles USING GIN(tags);

-- Chèn một số dữ liệu mẫu
INSERT INTO grammar_articles (title, content, difficulty_level, category, tags, reading_time) VALUES
('Present Simple Tense',
'Present Simple là thì hiện tại đơn, được sử dụng để diễn tả những hành động xảy ra thường xuyên, sự thật hiển nhiên, hoặc thói quen hàng ngày.

## Cấu trúc:
- **Khẳng định**: S + V(s/es) + O
- **Phủ định**: S + do/does + not + V + O
- **Nghi vấn**: Do/Does + S + V + O?

## Cách sử dụng:
1. **Thói quen, hành động lặp lại**: I go to school every day.
2. **Sự thật hiển nhiên**: The sun rises in the east.
3. **Lịch trình cố định**: The train leaves at 8 AM.

## Ví dụ:
- She **works** in a hospital.
- They **don''t play** football on Sundays.
- **Do** you **like** coffee?',
'beginner', 'Tenses', ARRAY['present simple', 'basic grammar', 'tenses'], 5),

('Past Continuous Tense',
'Past Continuous (thì quá khứ tiếp diễn) diễn tả hành động đang xảy ra tại một thời điểm cụ thể trong quá khứ.

## Cấu trúc:
- **Khẳng định**: S + was/were + V-ing + O
- **Phủ định**: S + was/were + not + V-ing + O
- **Nghi vấn**: Was/Were + S + V-ing + O?

## Cách sử dụng:
1. **Hành động đang diễn ra tại thời điểm cụ thể trong quá khứ**: At 8 PM yesterday, I was watching TV.
2. **Hai hành động xảy ra song song**: While she was cooking, he was reading.
3. **Hành động bị gián đoạn**: I was sleeping when the phone rang.

## Ví dụ:
- They **were playing** tennis at 3 PM.
- She **wasn''t studying** when I called.
- **Were** you **working** last night?',
'intermediate', 'Tenses', ARRAY['past continuous', 'intermediate grammar', 'tenses'], 7),

('Modal Verbs: Can, Could, May, Might',
'Modal verbs (động từ khuyết thiếu) là những động từ đặc biệt được sử dụng để thể hiện khả năng, khả năng, xác suất, sự cho phép, hoặc nghĩa vụ.

## Can / Could:
### Can:
- **Khả năng hiện tại**: I can swim.
- **Xin phép (thân mật)**: Can I borrow your pen?

### Could:
- **Khả năng trong quá khứ**: When I was young, I could run very fast.
- **Xin phép (lịch sự)**: Could you help me?
- **Khả năng có thể**: It could rain tomorrow.

## May / Might:
### May:
- **Xin phép (trang trọng)**: May I come in?
- **Khả năng 50-50**: It may rain today.

### Might:
- **Khả năng thấp hơn may**: It might snow tomorrow.
- **Xin phép trong quá khứ**: He asked if he might leave early.

## Ví dụ:
- You **can** speak English very well.
- **Could** you pass me the salt?
- **May** I ask you a question?
- It **might** be difficult.',
'advanced', 'Modal Verbs', ARRAY['modal verbs', 'can', 'could', 'may', 'might', 'advanced grammar'], 10);
