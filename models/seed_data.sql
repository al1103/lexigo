-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  phone_number VARCHAR(20),
  address TEXT,
  wallet_balance DECIMAL(12, 2) DEFAULT 0,
  avatar TEXT,
  referral_code VARCHAR(20) UNIQUE,
  referred_by UUID REFERENCES users(user_id) NULL,
  role VARCHAR(20) DEFAULT 'customer',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert users
INSERT INTO users (user_id, username, email, password, full_name, phone_number, address, wallet_balance, referral_code, role)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'admin', 'admin@example.com', '123456', 'Admin User', '0123456789', 'Hanoi, Vietnam', 1000000.00, 'ADMIN123', 'admin'),
  ('22222222-2222-2222-2222-222222222222', 'user1', 'user1@example.com', '123456', 'User One', '0987654321', 'HCMC, Vietnam', 50000.00, 'USER1234', 'customer'),
  ('33333333-3333-3333-3333-333333333333', 'user2', 'user2@example.com', '123456', 'User Two', '0912345678', 'Danang, Vietnam', 25000.00, 'USER5678', 'customer');

-- Update referral relationship
UPDATE users SET referred_by = '11111111-1111-1111-1111-111111111111' WHERE user_id = '22222222-2222-2222-2222-222222222222';
UPDATE users SET referred_by = '22222222-2222-2222-2222-222222222222' WHERE user_id = '33333333-3333-3333-3333-333333333333';

-- VERIFICATION CODES TABLE
CREATE TABLE IF NOT EXISTS verification_codes (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(10) NOT NULL,
  type VARCHAR(20) DEFAULT 'register',
  expiration_time TIMESTAMP NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  user_data JSONB
);

-- Insert verification codes
INSERT INTO verification_codes (email, code, type, expiration_time, is_verified, user_data)
VALUES
  ('test@example.com', '123456', 'register', NOW() + INTERVAL '30 minutes', FALSE, '{"username": "testuser", "fullName": "Test User"}');

-- REFRESH TOKENS TABLE
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert refresh tokens
INSERT INTO refresh_tokens (user_id, token)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'sample-refresh-token-for-admin'),
  ('22222222-2222-2222-2222-222222222222', 'sample-refresh-token-for-user1');

-- REFERRAL TREE TABLE
CREATE TABLE IF NOT EXISTS referral_tree (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  ancestor_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  level INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, ancestor_id)
);

-- Insert referral tree relationships
INSERT INTO referral_tree (user_id, ancestor_id, level)
VALUES
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 1),
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 1),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 2);

-- REFERRAL COMMISSION RATES TABLE
CREATE TABLE IF NOT EXISTS referral_commission_rates (
  id SERIAL PRIMARY KEY,
  level INTEGER UNIQUE NOT NULL,
  rate DECIMAL(5, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert referral commission rates
INSERT INTO referral_commission_rates (level, rate)
VALUES 
  (1, 10.0),
  (2, 5.0),
  (3, 3.0),
  (4, 2.0),
  (5, 1.0)
ON CONFLICT (level) DO NOTHING;

-- REFERRALS TABLE
CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  referrer_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  referred_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  commission DECIMAL(12, 2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  level INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert referrals
INSERT INTO referrals (referrer_id, referred_id, commission, status, level)
VALUES
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 5000.00, 'completed', 1),
  ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 2500.00, 'completed', 1);

-- WALLET TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  reference_id TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert wallet transactions
INSERT INTO wallet_transactions (user_id, amount, transaction_type, description)
VALUES
  ('11111111-1111-1111-1111-111111111111', 10000.00, 'deposit', 'Initial deposit'),
  ('22222222-2222-2222-2222-222222222222', 5000.00, 'signup_bonus', 'Signup bonus'),
  ('11111111-1111-1111-1111-111111111111', -1000.00, 'withdrawal', 'Withdrawal to bank account');

-- VOCABULARIES TABLE
CREATE TABLE IF NOT EXISTS vocabularies (
  id SERIAL PRIMARY KEY,
  word VARCHAR(100) NOT NULL,
  pronunciation VARCHAR(100),
  part_of_speech VARCHAR(20),
  definition TEXT NOT NULL,
  example TEXT,
  image_url VARCHAR(255),
  audio_url VARCHAR(255),
  difficulty_level INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert vocabularies
INSERT INTO vocabularies (word, pronunciation, part_of_speech, definition, example, difficulty_level)
VALUES
  ('hello', 'həˈloʊ', 'exclamation', 'Used as a greeting or to begin a phone conversation', 'Hello, how are you today?', 1),
  ('goodbye', 'ɡʊdˈbaɪ', 'noun', 'A farewell remark', 'They said their goodbyes before leaving', 1),
  ('computer', 'kəmˈpjuːtər', 'noun', 'An electronic device for storing and processing data', 'I need to buy a new computer', 2),
  ('algorithm', 'ˈælɡəˌrɪðəm', 'noun', 'A process or set of rules to be followed in calculations or problem-solving', 'The search algorithm ranks pages by relevance', 4);

-- CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert categories
INSERT INTO categories (name, description)
VALUES
  ('Greetings', 'Common greeting expressions'),
  ('Technology', 'Tech-related vocabulary'),
  ('Academic', 'Words commonly used in academic contexts'),
  ('Everyday', 'Common everyday words');

-- VOCABULARY CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS vocabulary_categories (
  vocabulary_id INTEGER REFERENCES vocabularies(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (vocabulary_id, category_id)
);

-- Insert vocabulary-category mappings
INSERT INTO vocabulary_categories (vocabulary_id, category_id)
VALUES
  (1, 1), -- hello - Greetings
  (1, 4), -- hello - Everyday
  (2, 1), -- goodbye - Greetings
  (2, 4), -- goodbye - Everyday
  (3, 2), -- computer - Technology
  (4, 2), -- algorithm - Technology
  (4, 3); -- algorithm - Academic

-- LESSONS TABLE
CREATE TABLE IF NOT EXISTS lessons (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT,
  category_id INTEGER REFERENCES categories(id),
  difficulty_level INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert lessons
INSERT INTO lessons (title, description, content, category_id, difficulty_level)
VALUES
  ('Basic Greetings', 'Learn basic greeting expressions', 'Content for basic greetings lesson', 1, 1),
  ('Tech Vocabulary 101', 'Introduction to tech vocabulary', 'Content for tech vocabulary lesson', 2, 2),
  ('Advanced Computer Terms', 'Advanced level tech vocabulary', 'Content for advanced tech lesson', 2, 4);

-- USER STATS TABLE
CREATE TABLE IF NOT EXISTS user_stats (
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  words_learned INTEGER DEFAULT 0,
  lessons_completed INTEGER DEFAULT 0,
  quizzes_completed INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id)
);

-- Insert user stats
INSERT INTO user_stats (user_id, words_learned, lessons_completed, quizzes_completed, streak_days, last_activity_date)
VALUES
  ('22222222-2222-2222-2222-222222222222', 10, 1, 2, 3, CURRENT_DATE),
  ('33333333-3333-3333-3333-333333333333', 5, 0, 1, 1, CURRENT_DATE);

-- USER VOCABULARY TABLE
CREATE TABLE IF NOT EXISTS user_vocabulary (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  vocabulary_id INTEGER REFERENCES vocabularies(id) ON DELETE CASCADE,
  mastery_level INTEGER DEFAULT 1,
  last_reviewed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  next_review TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, vocabulary_id)
);

-- Insert user vocabulary
INSERT INTO user_vocabulary (user_id, vocabulary_id, mastery_level, next_review)
VALUES
  ('22222222-2222-2222-2222-222222222222', 1, 3, CURRENT_TIMESTAMP + INTERVAL '2 days'),
  ('22222222-2222-2222-2222-222222222222', 2, 2, CURRENT_TIMESTAMP + INTERVAL '1 day'),
  ('33333333-3333-3333-3333-333333333333', 1, 2, CURRENT_TIMESTAMP + INTERVAL '1 day'); 