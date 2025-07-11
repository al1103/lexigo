-- Insert Categories
INSERT INTO categories (name, description, color, sort_order) VALUES
('Greetings', 'Basic greetings and introductions', '#FF5733', 1),
('Food', 'Food and drinks vocabulary', '#33FF57', 2),
('Travel', 'Travel and transportation', '#3357FF', 3),
('Animals', 'Animals and pets', '#FF33F5', 4),
('Family', 'Family members and relationships', '#F5FF33', 5);

-- Insert Words
INSERT INTO words (word, pronunciation, meaning, definition, example_sentence, category_id, difficulty_level) VALUES
('hello', '/həˈloʊ/', 'xin chào', 'A greeting used when meeting someone', 'Hello, how are you today?', 1, 'easy'),
('goodbye', '/ɡʊdˈbaɪ/', 'tạm biệt', 'A farewell greeting', 'Goodbye, see you tomorrow!', 1, 'easy'),
('thank you', '/θæŋk juː/', 'cảm ơn', 'Expression of gratitude', 'Thank you for your help.', 1, 'easy'),
('apple', '/ˈæpəl/', 'quả táo', 'A round fruit with red or green skin', 'I eat an apple every day.', 2, 'easy'),
('water', '/ˈwɔːtər/', 'nước', 'A clear liquid that we drink', 'Please give me a glass of water.', 2, 'easy'),
('cat', '/kæt/', 'con mèo', 'A small domestic animal', 'My cat likes to sleep on the sofa.', 4, 'easy'),
('dog', '/dɔːɡ/', 'con chó', 'A domestic animal, loyal companion', 'The dog is playing in the garden.', 4, 'easy'),
('mother', '/ˈmʌðər/', 'mẹ', 'Female parent', 'My mother cooks delicious food.', 5, 'easy');
 
-- Insert Lessons
INSERT INTO lessons (title, description, category_id, difficulty_level, total_words, estimated_time, is_published) VALUES
('Basic Greetings', 'Learn essential greeting phrases', 1, 'easy', 3, 15, true),
('Food Basics', 'Common food and drink vocabulary', 2, 'easy', 2, 10, true),
('Family Members', 'Learn about family relationships', 5, 'easy', 1, 8, true);

-- Insert Quizzes
INSERT INTO quizzes (title, description, lesson_id, quiz_type, time_limit, total_questions, passing_score) VALUES
('Greetings Quiz', 'Test your knowledge of basic greetings', 1, 'multiple_choice', 300, 3, 70),
('Food Vocabulary Quiz', 'Test your food vocabulary', 2, 'multiple_choice', 240, 2, 70);

-- Insert Quiz Questions
INSERT INTO quiz_questions (quiz_id, word_id, question_text, question_type, correct_answer, explanation, points, question_order) VALUES
(1, 1, 'What does "hello" mean in Vietnamese?', 'multiple_choice', 'xin chào', 'Hello is a basic greeting', 10, 1),
(1, 2, 'What does "goodbye" mean?', 'multiple_choice', 'tạm biệt', 'Goodbye is used when leaving', 10, 2),
(1, 3, 'How do you say "thank you" in English?', 'multiple_choice', 'thank you', 'Expression of gratitude', 10, 3),
(2, 4, 'What is "apple" in Vietnamese?', 'multiple_choice', 'quả táo', 'Apple is a common fruit', 10, 1),
(2, 5, 'What does "water" mean?', 'multiple_choice', 'nước', 'Water is essential for life', 10, 2);

-- Insert Quiz Options
INSERT INTO quiz_options (question_id, option_text, is_correct, option_order) VALUES
-- Question 1 options
(1, 'xin chào', true, 1),
(1, 'tạm biệt', false, 2),
(1, 'cảm ơn', false, 3),
(1, 'xin lỗi', false, 4),
-- Question 2 options
(2, 'xin chào', false, 1),
(2, 'tạm biệt', true, 2),
(2, 'cảm ơn', false, 3),
(2, 'xin lỗi', false, 4),
-- Question 3 options
(3, 'hello', false, 1),
(3, 'goodbye', false, 2),
(3, 'thank you', true, 3),
(3, 'sorry', false, 4),
-- Question 4 options
(4, 'quả táo', true, 1),
(4, 'quả cam', false, 2),
(4, 'quả chuối', false, 3),
(4, 'quả nho', false, 4),
-- Question 5 options
(5, 'nước', true, 1),
(5, 'sữa', false, 2),
(5, 'trà', false, 3),
(5, 'cà phê', false, 4);
