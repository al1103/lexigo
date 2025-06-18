-- =============================================
-- LEXIGO DATABASE SAMPLE DATA INSERTION
-- =============================================

-- Clear existing data (optional)
-- TRUNCATE TABLE quiz_attempts, user_progress, quiz_questions, lessons, users RESTART IDENTITY CASCADE;

-- Insert Users
INSERT INTO users (username, email, password_hash, full_name, level, total_points, streak_days) VALUES
('john_doe', 'john@example.com', '$2b$10$hash1', 'John Doe', 'beginner', 150, 5),
('jane_smith', 'jane@example.com', '$2b$10$hash2', 'Jane Smith', 'intermediate', 320, 12),
('bob_wilson', 'bob@example.com', '$2b$10$hash3', 'Bob Wilson', 'advanced', 580, 25),
('alice_brown', 'alice@example.com', '$2b$10$hash4', 'Alice Brown', 'beginner', 90, 3),
('charlie_davis', 'charlie@example.com', '$2b$10$hash5', 'Charlie Davis', 'intermediate', 275, 8);

-- Insert Lessons
INSERT INTO lessons (title, description, difficulty_level, total_questions, is_published) VALUES
('Basic English Greetings', 'Learn how to greet people in English properly', 'easy', 5, true),
('Common Daily Conversations', 'Practice everyday English conversations', 'easy', 8, true),
('Business English Basics', 'Introduction to professional English communication', 'medium', 10, true),
('Advanced Grammar Rules', 'Master complex English grammar structures', 'hard', 12, true),
('English Pronunciation Guide', 'Improve your English pronunciation skills', 'medium', 6, true),
('Travel English Essentials', 'Essential English phrases for traveling', 'easy', 7, true);

-- Insert Quiz Questions for Lesson 1
INSERT INTO quiz_questions (lesson_id, question_text, correct_answer, option_a, option_b, option_c, option_d, explanation) VALUES
(1, 'What is the most common greeting in English?', 'A', 'Hello', 'Goodbye', 'Thank you', 'Please', 'Hello is the most universal greeting in English'),
(1, 'How do you respond to "How are you?"', 'B', 'Yes, please', 'I am fine, thank you', 'No, thanks', 'See you later', 'This is the standard polite response'),
(1, 'What do you say when meeting someone for the first time?', 'C', 'Goodbye', 'See you later', 'Nice to meet you', 'How are you', 'This phrase is used for first meetings'),
(1, 'Which greeting is more formal?', 'A', 'Good morning', 'Hey', 'Hi there', 'What''s up', 'Good morning is more formal and professional'),
(1, 'What is an appropriate evening greeting?', 'D', 'Good morning', 'Good afternoon', 'Good day', 'Good evening', 'Good evening is used after 6 PM');

-- Insert Quiz Questions for Lesson 2
INSERT INTO quiz_questions (lesson_id, question_text, correct_answer, option_a, option_b, option_c, option_d, explanation) VALUES
(2, 'How do you ask for the time?', 'A', 'What time is it?', 'How old are you?', 'Where are you?', 'What is your name?', 'This is the standard way to ask for time'),
(2, 'What do you say when you want to buy something?', 'B', 'I need help', 'I would like to buy this', 'Where is the bathroom?', 'How much money?', 'This is polite way to express purchase intent'),
(2, 'How do you ask for directions?', 'C', 'What is your name?', 'How are you?', 'Excuse me, where is...?', 'Thank you very much', 'This is the polite way to ask for directions'),
(2, 'What do you say when you don''t understand?', 'D', 'Yes, I know', 'That''s correct', 'Perfect', 'I don''t understand', 'This clearly expresses lack of understanding'),
(2, 'How do you apologize politely?', 'A', 'I am sorry', 'You are wrong', 'That''s good', 'Very nice', 'This is the standard apology phrase'),
(2, 'What do you say when leaving?', 'B', 'Hello', 'Goodbye', 'Thank you', 'Please', 'Goodbye is used when departing'),
(2, 'How do you ask for someone''s name?', 'C', 'How old are you?', 'Where do you live?', 'What is your name?', 'How are you?', 'This is the direct way to ask for someone''s name'),
(2, 'What do you say when someone helps you?', 'D', 'Hello', 'Goodbye', 'Please', 'Thank you', 'Thank you expresses gratitude for help');

-- Insert User Progress
INSERT INTO user_progress (user_id, lesson_id, score, is_completed, completed_at) VALUES
(1, 1, 85, true, '2024-01-15 10:30:00'),
(1, 2, 78, true, '2024-01-16 14:20:00'),
(2, 1, 92, true, '2024-01-14 09:15:00'),
(2, 2, 88, true, '2024-01-15 16:45:00'),
(3, 1, 95, true, '2024-01-13 13:20:00'),
(3, 2, 89, true, '2024-01-14 15:10:00'),
(4, 1, 72, true, '2024-01-17 08:30:00'),
(5, 1, 81, true, '2024-01-16 19:15:00');

-- Insert Quiz Attempts
INSERT INTO quiz_attempts (user_id, lesson_id, score, total_questions, correct_answers, completed_at) VALUES
(1, 1, 85, 5, 4, '2024-01-15 10:30:00'),
(1, 2, 78, 8, 6, '2024-01-16 14:20:00'),
(2, 1, 92, 5, 5, '2024-01-14 09:15:00'),
(2, 2, 88, 8, 7, '2024-01-15 16:45:00'),
(3, 1, 95, 5, 5, '2024-01-13 13:20:00'),
(3, 2, 89, 8, 7, '2024-01-14 15:10:00'),
(4, 1, 72, 5, 4, '2024-01-17 08:30:00'),
(5, 1, 81, 5, 4, '2024-01-16 19:15:00');

-- Verify data insertion
SELECT 'Users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'Lessons', COUNT(*) FROM lessons
UNION ALL
SELECT 'Quiz Questions', COUNT(*) FROM quiz_questions
UNION ALL
SELECT 'User Progress', COUNT(*) FROM user_progress
UNION ALL
SELECT 'Quiz Attempts', COUNT(*) FROM quiz_attempts;

COMMIT;
