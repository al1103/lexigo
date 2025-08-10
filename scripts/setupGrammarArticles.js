const { pool } = require('../config/database');

async function setupGrammarArticles() {
  console.log('🚀 Setting up Grammar Articles...');

  try {
    // Check if table exists
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'grammar_articles'
      );
    `;

    const tableExists = await pool.query(tableExistsQuery);

    if (tableExists.rows[0].exists) {
      console.log('⚠️  Grammar Articles table already exists!');

      // Ask user if they want to continue
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise((resolve) => {
        rl.question('Do you want to add sample data? (y/N): ', resolve);
      });

      rl.close();

      if (answer.toLowerCase() !== 'y') {
        console.log('❌ Setup cancelled');
        return;
      }
    } else {
      // Create table
      console.log('📋 Creating grammar_articles table...');

      const createTableQuery = `
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
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql';

        CREATE TRIGGER update_grammar_articles_updated_at
            BEFORE UPDATE ON grammar_articles
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();

        -- Index for better performance
        CREATE INDEX IF NOT EXISTS idx_grammar_articles_difficulty ON grammar_articles(difficulty_level);
        CREATE INDEX IF NOT EXISTS idx_grammar_articles_category ON grammar_articles(category);
        CREATE INDEX IF NOT EXISTS idx_grammar_articles_published ON grammar_articles(is_published);
        CREATE INDEX IF NOT EXISTS idx_grammar_articles_tags ON grammar_articles USING GIN(tags);
      `;

      await pool.query(createTableQuery);
      console.log('✅ Grammar Articles table created successfully!');
    }

    // Insert sample data
    console.log('📝 Inserting sample grammar articles...');

    const sampleArticles = [
      {
        title: 'Present Simple Tense',
        content: `Present Simple là thì hiện tại đơn, được sử dụng để diễn tả những hành động xảy ra thường xuyên, sự thật hiển nhiên, hoặc thói quen hàng ngày.

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
- They **don't play** football on Sundays.
- **Do** you **like** coffee?`,
        difficulty_level: 'beginner',
        category: 'Tenses',
        tags: ['present simple', 'basic grammar', 'tenses'],
        reading_time: 5
      },
      {
        title: 'Past Continuous Tense',
        content: `Past Continuous (thì quá khứ tiếp diễn) diễn tả hành động đang xảy ra tại một thời điểm cụ thể trong quá khứ.

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
- She **wasn't studying** when I called.
- **Were** you **working** last night?`,
        difficulty_level: 'intermediate',
        category: 'Tenses',
        tags: ['past continuous', 'intermediate grammar', 'tenses'],
        reading_time: 7
      },
      {
        title: 'Modal Verbs: Can, Could, May, Might',
        content: `Modal verbs (động từ khuyết thiếu) là những động từ đặc biệt được sử dụng để thể hiện khả năng, khả năng, xác suất, sự cho phép, hoặc nghĩa vụ.

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
- It **might** be difficult.`,
        difficulty_level: 'advanced',
        category: 'Modal Verbs',
        tags: ['modal verbs', 'can', 'could', 'may', 'might', 'advanced grammar'],
        reading_time: 10
      },
      {
        title: 'Passive Voice - Câu bị động',
        content: `Passive Voice (câu bị động) được sử dụng khi chúng ta muốn nhấn mạnh vào hành động hoặc kết quả của hành động hơn là người thực hiện hành động đó.

## Cấu trúc:
- **Chủ động**: S + V + O
- **Bị động**: S + be + V(ed/V3) + (by + O)

## Các thì trong câu bị động:
1. **Present Simple**: am/is/are + V(ed/V3)
   - Active: She cleans the room.
   - Passive: The room is cleaned by her.

2. **Past Simple**: was/were + V(ed/V3)
   - Active: They built this house in 1990.
   - Passive: This house was built in 1990.

3. **Present Perfect**: have/has + been + V(ed/V3)
   - Active: Someone has stolen my bike.
   - Passive: My bike has been stolen.

## Khi nào sử dụng:
- Không biết ai thực hiện hành động
- Không quan trọng ai thực hiện
- Muốn nhấn mạnh hành động hoặc kết quả
- Văn phong trang trọng, khoa học`,
        difficulty_level: 'intermediate',
        category: 'Grammar Structures',
        tags: ['passive voice', 'grammar structures', 'intermediate'],
        reading_time: 8
      },
      {
        title: 'Conditional Sentences - Câu điều kiện',
        content: `Conditional Sentences (câu điều kiện) được sử dụng để diễn tả một tình huống giả định và kết quả có thể xảy ra.

## Loại 0 - Zero Conditional:
**Cấu trúc**: If + Present Simple, Present Simple
**Sử dụng**: Sự thật hiển nhiên, quy luật tự nhiên
**Ví dụ**: If you heat water to 100°C, it boils.

## Loại 1 - First Conditional:
**Cấu trúc**: If + Present Simple, will + V
**Sử dụng**: Điều kiện có thể xảy ra trong tương lai
**Ví dụ**: If it rains tomorrow, I will stay home.

## Loại 2 - Second Conditional:
**Cấu trúc**: If + Past Simple, would + V
**Sử dụng**: Điều kiện không có thật ở hiện tại
**Ví dụ**: If I were rich, I would travel around the world.

## Loại 3 - Third Conditional:
**Cấu trúc**: If + Past Perfect, would have + V3
**Sử dụng**: Điều kiện không có thật trong quá khứ
**Ví dụ**: If I had studied harder, I would have passed the exam.

## Lưu ý:
- Có thể đảo ngược vị trí của mệnh đề If
- Trong văn nói thường dùng "were" cho tất cả các ngôi trong loại 2`,
        difficulty_level: 'advanced',
        category: 'Conditionals',
        tags: ['conditionals', 'if clauses', 'advanced grammar'],
        reading_time: 12
      }
    ];

    const insertQuery = `
      INSERT INTO grammar_articles (title, content, difficulty_level, category, tags, reading_time, is_published)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT DO NOTHING
    `;

    for (const article of sampleArticles) {
      try {
        await pool.query(insertQuery, [
          article.title,
          article.content,
          article.difficulty_level,
          article.category,
          article.tags,
          article.reading_time,
          true
        ]);
        console.log(`✅ Added: ${article.title}`);
      } catch (error) {
        console.log(`⚠️  Skipped: ${article.title} (may already exist)`);
      }
    }

    console.log('🎉 Grammar Articles setup completed!');
    console.log('📊 Summary:');

    const countResult = await pool.query('SELECT COUNT(*) as count FROM grammar_articles');
    console.log(`   Total articles: ${countResult.rows[0].count}`);

    const categoryResult = await pool.query('SELECT DISTINCT category FROM grammar_articles WHERE category IS NOT NULL');
    console.log(`   Categories: ${categoryResult.rows.map(r => r.category).join(', ')}`);

  } catch (error) {
    console.error('❌ Error setting up Grammar Articles:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  setupGrammarArticles()
    .then(() => {
      console.log('✅ Setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupGrammarArticles };
