-- Tạo bảng quotes cho Quote of the Day (đơn giản hóa)
CREATE TABLE IF NOT EXISTS quotes (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    author VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Thêm dữ liệu mẫu cho Quote of the Day
INSERT INTO quotes (content, author) VALUES
('The only way to do great work is to love what you do.', 'Steve Jobs'),
('Life is what happens to you while you''re busy making other plans.', 'John Lennon'),
('The future belongs to those who believe in the beauty of their dreams.', 'Eleanor Roosevelt'),
('It is during our darkest moments that we must focus to see the light.', 'Aristotle'),
('The way to get started is to quit talking and begin doing.', 'Walt Disney'),
('Education is the most powerful weapon which you can use to change the world.', 'Nelson Mandela'),
('The more that you read, the more things you will know. The more that you learn, the more places you''ll go.', 'Dr. Seuss'),
('Live as if you were to die tomorrow. Learn as if you were to live forever.', 'Mahatma Gandhi'),
('An investment in knowledge pays the best interest.', 'Benjamin Franklin'),
('The beautiful thing about learning is that no one can take it away from you.', 'B.B. King'),
('Success is not final, failure is not fatal: it is the courage to continue that counts.', 'Winston Churchill'),
('The only impossible journey is the one you never begin.', 'Tony Robbins'),
('Be yourself; everyone else is already taken.', 'Oscar Wilde'),
('A room without books is like a body without a soul.', 'Marcus Tullius Cicero'),
('Be the change that you wish to see in the world.', 'Mahatma Gandhi'),
('In the middle of difficulty lies opportunity.', 'Albert Einstein'),
('Yesterday is history, tomorrow is a mystery, today is a gift.', 'Eleanor Roosevelt'),
('Time you enjoy wasting is not wasted time.', 'Marthe Troly-Curtin'),
('The two most powerful warriors are patience and time.', 'Leo Tolstoy'),
('Lost time is never found again.', 'Benjamin Franklin'),
('All our dreams can come true, if we have the courage to pursue them.', 'Walt Disney'),
('The biggest adventure you can take is to live the life of your dreams.', 'Oprah Winfrey'),
('Dreams don''t work unless you do.', 'John C. Maxwell'),
('Every day is a new beginning.', 'Unknown'),
('Believe you can and you''re halfway there.', 'Theodore Roosevelt'),
('Small steps every day.', 'Unknown'),
('Keep going, you''re doing great.', 'Unknown'),
('Today is full of possibilities.', 'Unknown'),
('The best time to plant a tree was 20 years ago. The second best time is now.', 'Chinese Proverb'),
('You are never too old to set another goal or to dream a new dream.', 'C.S. Lewis');
