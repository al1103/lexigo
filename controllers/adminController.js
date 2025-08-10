const { pool } = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const moment = require('moment');

const adminController = {
  // Admin Dashboard
  dashboard: async (req, res) => {
    try {
      // Get dashboard statistics with safe queries
      const dashboardData = {
        totalUsers: 0,
        adminUsers: 0,
        newUsersThisWeek: 0,
        totalWords: 0,
        totalGrammarArticles: 0,
        totalQuizSessions: 0,
        completedQuizSessions: 0,
        totalSpeakingSessions: 0,
        averageQuizScore: 0,
      };

      // Safe query for users
      try {
        const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
        dashboardData.totalUsers = parseInt(usersResult.rows[0].count) || 0;
      } catch (error) {
        console.log('Users table not found or error:', error.message);
      }

      // Safe query for admin users
      try {
        const adminResult = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = $1', ['admin']);
        dashboardData.adminUsers = parseInt(adminResult.rows[0].count) || 0;
      } catch (error) {
        console.log('Admin users query error:', error.message);
      }

      // Safe query for new users this week
      try {
        const newUsersResult = await pool.query('SELECT COUNT(*) as count FROM users WHERE created_at >= NOW() - INTERVAL \'7 days\'');
        dashboardData.newUsersThisWeek = parseInt(newUsersResult.rows[0].count) || 0;
      } catch (error) {
        console.log('New users query error:', error.message);
      }

      // Safe query for words
      try {
        const wordsResult = await pool.query('SELECT COUNT(*) as count FROM words WHERE is_active = true');
        dashboardData.totalWords = parseInt(wordsResult.rows[0].count) || 0;
      } catch (error) {
        console.log('Words table not found or error:', error.message);
      }

      // Safe query for grammar articles
      try {
        const grammarResult = await pool.query('SELECT COUNT(*) as count FROM grammar_articles WHERE is_published = true');
        dashboardData.totalGrammarArticles = parseInt(grammarResult.rows[0].count) || 0;
      } catch (error) {
        console.log('Grammar articles table not found or error:', error.message);
      }

      // Safe query for speaking sessions
      try {
        const speakingSessionsResult = await pool.query('SELECT COUNT(*) as count FROM speaking_sessions');
        dashboardData.totalSpeakingSessions = parseInt(speakingSessionsResult.rows[0].count) || 0;
      } catch (error) {
        console.log('Speaking sessions table not found or error:', error.message);
      }

      // Safe query for recent users
      let recentUsers = [];
      try {
        const recentUsersResult = await pool.query(`
          SELECT id, username, email, role, created_at
          FROM users
          ORDER BY created_at DESC
          LIMIT 5
        `);
        recentUsers = recentUsersResult.rows || [];
      } catch (error) {
        console.log('Recent users query error:', error.message);
      }

      // Set default values for quiz-related fields since quiz_sessions table doesn't exist
      dashboardData.totalQuizSessions = 0;
      dashboardData.completedQuizSessions = 0;
      dashboardData.averageQuizScore = 0;

      // Empty array for recent quizzes since table doesn't exist
      let recentQuizzes = [];

      res.render('admin/dashboard', {
        layout: 'admin/layout',
        title: 'Admin Dashboard',
        stats: dashboardData,
        recentUsers: recentUsers,
        recentQuizzes: recentQuizzes,
        adminUser: req.adminUser,
        moment
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).render('admin/error', {
        layout: 'admin/layout',
        title: 'Error',
        error: 'Failed to load dashboard',
        adminUser: req.adminUser
      });
    }
  },

  // Admin Login Page
  loginPage: (req, res) => {
    res.render('admin/login', { layout: false, title: 'Admin Login', error: null });
  },

  // Admin Login Process
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.render('admin/login', {
          layout: false,
          title: 'Admin Login',
          error: 'Email and password are required'
        });
      }

      // Find admin user
      const userResult = await pool.query(
        'SELECT * FROM users WHERE email = $1 AND role = $2',
        [email, 'admin']
      );

      if (userResult.rows.length === 0) {
        return res.render('admin/login', {
          layout: false,
          title: 'Admin Login',
          error: 'Invalid credentials or insufficient permissions'
        });
      }

      const user = userResult.rows[0];

      // Check password
      const isValidPassword = password === user.password_hash ||
                             await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        return res.render('admin/login', {
          layout: false,
          title: 'Admin Login',
          error: 'Invalid credentials'
        });
      }

      // Create JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET_KEY || 'default-secret',
        { expiresIn: '24h' }
      );

      // Set cookie
      res.cookie('admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      res.redirect('/admin/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      res.render('admin/login', {
        layout: false,
        title: 'Admin Login',
        error: 'Login failed. Please try again.'
      });
    }
  },

  // Admin Logout
  logout: (req, res) => {
    res.clearCookie('admin_token');
    res.redirect('/admin/login');
  },

  // Users Management
  usersIndex: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 20;
      const offset = (page - 1) * limit;

      const countResult = await pool.query('SELECT COUNT(*) as count FROM users');
      const totalUsers = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(totalUsers / limit);

      const users = await pool.query(`
        SELECT id, username, email, full_name, role, total_points, created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);

      res.render('admin/users/index', {
        layout: 'admin/layout',
        title: 'Users Management',
        users: users.rows,
        currentPage: page,
        totalPages,
        totalUsers,
        adminUser: req.adminUser,
        moment
      });
    } catch (error) {
      console.error('Users index error:', error);
      res.status(500).render('admin/error', {
        layout: 'admin/layout',
        title: 'Error',
        error: 'Failed to load users',
        adminUser: req.adminUser
      });
    }
  },

  // User Details
  userShow: async (req, res) => {
    try {
      const { id } = req.params;

      const userResult = await pool.query(`
        SELECT *
        FROM users
        WHERE id = $1
      `, [id]);

      if (userResult.rows.length === 0) {
        return res.status(404).render('admin/error', {
          layout: 'admin/layout',
          title: 'Error',
          error: 'User not found',
          adminUser: req.adminUser
        });
      }

      const user = userResult.rows[0];

      // Add default stats values since user_stats table doesn't exist
      user.total_points = user.total_points || 0;
      user.weekly_points = 0;
      user.monthly_points = 0;
      user.streak_days = 0;
      user.words_mastered = 0;
      user.quizzes_completed = 0;
      user.speaking_sessions_completed = 0;

      // Empty arrays since tables don't exist
      const quizSessions = [];
      const speakingSessions = [];

      res.render('admin/users/show', {
        layout: 'admin/layout',
        title: `User: ${user.username}`,
        user,
        quizSessions: quizSessions,
        speakingSessions: speakingSessions,
        adminUser: req.adminUser,
        moment
      });
    } catch (error) {
      console.error('User show error:', error);
      res.status(500).render('admin/error', {
        layout: 'admin/layout',
        title: 'Error',
        error: 'Failed to load user details',
        adminUser: req.adminUser
      });
    }
  },

  // Delete User
  userDelete: async (req, res) => {
    try {
      const { id } = req.params;

      await pool.query('DELETE FROM users WHERE id = $1', [id]);

      res.redirect('/admin/users?success=User deleted successfully');
    } catch (error) {
      console.error('User delete error:', error);
      res.redirect('/admin/users?error=Failed to delete user');
    }
  },

  // Words Management
  wordsIndex: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 20;
      const offset = (page - 1) * limit;

      const countResult = await pool.query('SELECT COUNT(*) as count FROM words WHERE is_active = true');
      const totalWords = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(totalWords / limit);

      const words = await pool.query(`
        SELECT id, word, meaning, difficulty_level, created_at
        FROM words
        WHERE is_active = true
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);

      res.render('admin/words/index', {
        layout: 'admin/layout',
        title: 'Words Management',
        words: words.rows,
        currentPage: page,
        totalPages,
        totalWords,
        adminUser: req.adminUser,
        moment
      });
    } catch (error) {
      console.error('Words index error:', error);
      res.status(500).render('admin/error', {
        layout: 'admin/layout',
        title: 'Error',
        error: 'Failed to load words',
        adminUser: req.adminUser
      });
    }
  },

  // Word Edit Form
  wordEdit: async (req, res) => {
    try {
      const { id } = req.params;

      const wordResult = await pool.query(`
        SELECT id, word, meaning, difficulty_level, pronunciation, example_sentence,
               definition, audio_url, image_url, is_active, created_at
        FROM words
        WHERE id = $1
      `, [id]);

      if (wordResult.rows.length === 0) {
        return res.status(404).render('admin/error', {
          layout: 'admin/layout',
          title: 'Error',
          error: 'Word not found',
          adminUser: req.adminUser
        });
      }

      const word = wordResult.rows[0];

      res.render('admin/words/edit', {
        layout: 'admin/layout',
        title: `Edit Word: ${word.word}`,
        word,
        adminUser: req.adminUser,
        successMessage: req.query.success || null,
        errorMessage: req.query.error || null
      });
    } catch (error) {
      console.error('Word edit error:', error);
      res.status(500).render('admin/error', {
        layout: 'admin/layout',
        title: 'Error',
        error: 'Failed to load word for editing',
        adminUser: req.adminUser
      });
    }
  },

  // Word Update
  wordUpdate: async (req, res) => {
    try {
      const { id } = req.params;
      const { word, meaning, difficulty_level, pronunciation, example_sentence, definition, audio_url, image_url } = req.body;

      // Validate required fields
      if (!word || !meaning || !difficulty_level) {
        return res.redirect(`/admin/words/${id}/edit?error=Word, meaning, and difficulty level are required`);
      }

      // Check if word already exists (excluding current word)
      const existingWord = await pool.query(
        'SELECT id FROM words WHERE LOWER(word) = LOWER($1) AND id != $2',
        [word, id]
      );

      if (existingWord.rows.length > 0) {
        return res.redirect(`/admin/words/${id}/edit?error=This word already exists`);
      }

      // Update word
      await pool.query(`
        UPDATE words
        SET word = $1, meaning = $2, difficulty_level = $3, pronunciation = $4,
            example_sentence = $5, definition = $6, audio_url = $7, image_url = $8
        WHERE id = $9
      `, [word, meaning, difficulty_level, pronunciation, example_sentence, definition, audio_url, image_url, id]);

      res.redirect('/admin/words?success=Word updated successfully');
    } catch (error) {
      console.error('Word update error:', error);
      res.redirect(`/admin/words/${req.params.id}/edit?error=Failed to update word`);
    }
  },

  // Word Delete
  wordDelete: async (req, res) => {
    try {
      const { id } = req.params;

      // Soft delete - set is_active to false
      await pool.query('UPDATE words SET is_active = false WHERE id = $1', [id]);

      res.redirect('/admin/words?success=Word deleted successfully');
    } catch (error) {
      console.error('Word delete error:', error);
      res.redirect('/admin/words?error=Failed to delete word');
    }
  },

  // Word Add Form
  wordAddForm: async (req, res) => {
    try {
      res.render('admin/words/add', {
        layout: 'admin/layout',
        title: 'Add New Word',
        adminUser: req.adminUser,
        successMessage: req.query.success || null,
        errorMessage: req.query.error || null
      });
    } catch (error) {
      console.error('Word add form error:', error);
      res.status(500).render('admin/error', {
        layout: 'admin/layout',
        title: 'Error',
        error: 'Failed to load add word form',
        adminUser: req.adminUser
      });
    }
  },

  // Word Add
  wordAdd: async (req, res) => {
    try {
      const { word, meaning, difficulty_level, pronunciation, example_sentence, definition, audio_url, image_url } = req.body;

      // Validate required fields
      if (!word || !meaning || !difficulty_level) {
        return res.redirect('/admin/words/add?error=Word, meaning, and difficulty level are required');
      }

      // Check if word already exists
      const existingWord = await pool.query(
        'SELECT id FROM words WHERE LOWER(word) = LOWER($1)',
        [word]
      );

      if (existingWord.rows.length > 0) {
        return res.redirect('/admin/words/add?error=This word already exists');
      }

      // Add word
      await pool.query(`
        INSERT INTO words (word, meaning, difficulty_level, pronunciation, example_sentence,
                          definition, audio_url, image_url, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())
      `, [word, meaning, difficulty_level, pronunciation, example_sentence, definition, audio_url, image_url]);

      res.redirect('/admin/words?success=Word added successfully');
    } catch (error) {
      console.error('Word add error:', error);
      res.redirect('/admin/words/add?error=Failed to add word');
    }
  },

  // Quiz Sessions Management
  quizSessionsIndex: async (req, res) => {
    try {
      // Since quiz_sessions table doesn't exist, show empty page
      res.render('admin/quiz-sessions/index', {
        layout: 'admin/layout',
        title: 'Quiz Sessions Management',
        sessions: [],
        currentPage: 1,
        totalPages: 1,
        totalSessions: 0,
        adminUser: req.adminUser,
        moment
      });
    } catch (error) {
      console.error('Quiz sessions index error:', error);
      res.status(500).render('admin/error', {
        layout: 'admin/layout',
        title: 'Error',
        error: 'Failed to load quiz sessions',
        adminUser: req.adminUser
      });
    }
  },

  // Speaking Words Management (thay đổi từ Speaking Sessions)
  speakingSessionsIndex: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 20;
      const offset = (page - 1) * limit;
      const { difficulty_level } = req.query;

      // Build query with optional filters
      let whereConditions = ['is_active = true'];
      let queryParams = [];
      let paramIndex = 1;

      if (difficulty_level) {
        whereConditions.push(`difficulty_level = $${paramIndex}`);
        queryParams.push(difficulty_level);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as count
        FROM words
        WHERE ${whereClause}
      `;
      const countResult = await pool.query(countQuery, queryParams);
      const totalWords = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(totalWords / limit);

      // Get words with pagination
      const wordsQuery = `
        SELECT id, word, meaning, difficulty_level, pronunciation,
               example_sentence, definition, audio_url, image_url, created_at
        FROM words
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      queryParams.push(limit, offset);
      const words = await pool.query(wordsQuery, queryParams);

      res.render('admin/speaking-sessions/index', {
        layout: 'admin/layout',
        title: 'Speaking Words Management',
        words: words.rows,
        currentPage: page,
        totalPages,
        totalWords,
        filters: {
          difficulty_level: difficulty_level || ''
        },
        adminUser: req.adminUser,
        moment
      });
    } catch (error) {
      console.error('Speaking words index error:', error);
      res.status(500).render('admin/error', {
        layout: 'admin/layout',
        title: 'Error',
        error: 'Failed to load speaking words',
        adminUser: req.adminUser
      });
    }
  },

  // Export Data
  exportData: async (req, res) => {
    try {
      const { table } = req.params;

      // Validate table name to prevent SQL injection
      const allowedTables = ['users', 'words', 'speaking_sessions', 'levels', 'categories'];
      if (!allowedTables.includes(table)) {
        return res.status(400).send('Invalid table name');
      }

      const result = await pool.query(`SELECT * FROM ${table} ORDER BY created_at DESC`);

      // Convert to CSV
      if (result.rows.length === 0) {
        return res.send('No data available');
      }

      const headers = Object.keys(result.rows[0]).join(',');
      const rows = result.rows.map(row =>
        Object.values(row).map(value =>
          typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
        ).join(',')
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${table}_export.csv"`);
      res.send([headers, ...rows].join('\n'));
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).send('Export failed');
    }
  },

  // === GRAMMAR ARTICLES MANAGEMENT ===

  // Grammar articles index
  grammarIndex: async (req, res) => {
    try {
      const { page = 1, limit = 10, difficulty, category, search } = req.query;
      const offset = (page - 1) * limit;

      let queryParams = [];
      let paramIndex = 0;
      let whereConditions = ['is_published = true OR is_published = false']; // Show all articles for admin

      // Build query conditions
      if (difficulty) {
        paramIndex++;
        whereConditions.push(`difficulty_level = $${paramIndex}`);
        queryParams.push(difficulty);
      }

      if (category) {
        paramIndex++;
        whereConditions.push(`category ILIKE $${paramIndex}`);
        queryParams.push(`%${category}%`);
      }

      if (search) {
        paramIndex++;
        whereConditions.push(`(title ILIKE $${paramIndex} OR content ILIKE $${paramIndex})`);
        queryParams.push(`%${search}%`);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get articles
      const articlesQuery = `
        SELECT id, title, content, difficulty_level, category, tags, reading_time,
               view_count, is_published, created_at, updated_at
        FROM grammar_articles
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
      `;
      queryParams.push(limit, offset);

      const articlesResult = await pool.query(articlesQuery, queryParams);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM grammar_articles
        ${whereClause}
      `;
      const countResult = await pool.query(countQuery, queryParams.slice(0, -2)); // Remove limit and offset
      const totalArticles = parseInt(countResult.rows[0].total);

      // Get categories for filter dropdown
      const categoriesResult = await pool.query(`
        SELECT DISTINCT category
        FROM grammar_articles
        WHERE category IS NOT NULL AND category != ''
        ORDER BY category
      `);
      const categories = categoriesResult.rows.map(row => row.category);

      const pagination = {
        current_page: parseInt(page),
        total_pages: Math.ceil(totalArticles / limit),
        total_items: totalArticles,
        items_per_page: parseInt(limit)
      };

      // Check for success/error messages from URL
      const flashMessages = {};
      if (req.query.success) {
        flashMessages.success = decodeURIComponent(req.query.success);
      }
      if (req.query.error) {
        flashMessages.error = decodeURIComponent(req.query.error);
      }

      res.render('admin/grammar/index', {
        layout: 'admin/layout',
        title: 'Grammar Articles Management',
        articles: articlesResult.rows,
        categories,
        pagination,
        query: req.query,
        flash: Object.keys(flashMessages).length > 0 ? flashMessages : undefined,
        adminUser: req.adminUser
      });
    } catch (error) {
      console.error('Grammar index error:', error);
      res.redirect('/admin/grammar?error=' + encodeURIComponent('Failed to load grammar articles'));
    }
  },

  // Grammar add form
  grammarAddForm: async (req, res) => {
    try {
      // Check for error messages from URL
      const flashMessages = {};
      if (req.query.error) {
        flashMessages.error = decodeURIComponent(req.query.error);
      }

      res.render('admin/grammar/add', {
        layout: 'admin/layout',
        title: 'Add Grammar Article',
        flash: Object.keys(flashMessages).length > 0 ? flashMessages : undefined,
        adminUser: req.adminUser
      });
    } catch (error) {
      console.error('Grammar add form error:', error);
      res.redirect('/admin/grammar?error=' + encodeURIComponent('Failed to load add form'));
    }
  },

  // Grammar add
  grammarAdd: async (req, res) => {
    try {
      const {
        title,
        content,
        difficulty_level = 'beginner',
        category,
        tags,
        reading_time,
        is_published = false
      } = req.body;

      // Validate required fields
      if (!title || !content) {
        return res.redirect('/admin/grammar/add?error=' + encodeURIComponent('Title and content are required'));
      }

      // Process tags
      let processedTags = [];
      if (tags) {
        try {
          processedTags = JSON.parse(tags);
        } catch (e) {
          processedTags = typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : [];
        }
      }

      const query = `
        INSERT INTO grammar_articles (title, content, difficulty_level, category, tags, reading_time, is_published)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `;

      const values = [
        title.trim(),
        content.trim(),
        difficulty_level,
        category ? category.trim() : null,
        processedTags,
        reading_time ? parseInt(reading_time) : null,
        is_published === 'true' || is_published === true
      ];

      await pool.query(query, values);

      res.redirect('/admin/grammar?success=' + encodeURIComponent('Article created successfully'));
    } catch (error) {
      console.error('Grammar add error:', error);
      res.status(500).render('admin/error', {
        layout: 'admin/layout',
        title: 'Error',
        error: 'Failed to create article',
        adminUser: req.adminUser
      });
    }
  },

  // Grammar edit form
  grammarEdit: async (req, res) => {
    try {
      const { id } = req.params;

      const query = `
        SELECT id, title, content, difficulty_level, category, tags, reading_time,
               view_count, is_published, created_at, updated_at
        FROM grammar_articles
        WHERE id = $1
      `;

      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        return res.redirect('/admin/grammar?error=' + encodeURIComponent('Article not found'));
      }

      // Check for error messages from URL
      const flashMessages = {};
      if (req.query.error) {
        flashMessages.error = decodeURIComponent(req.query.error);
      }

      res.render('admin/grammar/edit', {
        layout: 'admin/layout',
        title: 'Edit Grammar Article',
        article: result.rows[0],
        flash: Object.keys(flashMessages).length > 0 ? flashMessages : undefined,
        adminUser: req.adminUser
      });
    } catch (error) {
      console.error('Grammar edit form error:', error);
      res.status(500).render('admin/error', {
        layout: 'admin/layout',
        title: 'Error',
        error: 'Failed to load edit form',
        adminUser: req.adminUser
      });
    }
  },

  // Grammar update
  grammarUpdate: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        title,
        content,
        difficulty_level,
        category,
        tags,
        reading_time,
        is_published = false
      } = req.body;

      // Validate required fields
      if (!title || !content) {
        return res.redirect(`/admin/grammar/${id}/edit?error=` + encodeURIComponent('Title and content are required'));
      }

      // Process tags
      let processedTags = [];
      if (tags) {
        try {
          processedTags = JSON.parse(tags);
        } catch (e) {
          processedTags = typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : [];
        }
      }

      const query = `
        UPDATE grammar_articles
        SET title = $1, content = $2, difficulty_level = $3, category = $4,
            tags = $5, reading_time = $6, is_published = $7, updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
      `;

      const values = [
        title.trim(),
        content.trim(),
        difficulty_level,
        category ? category.trim() : null,
        processedTags,
        reading_time ? parseInt(reading_time) : null,
        is_published === 'true' || is_published === true,
        id
      ];

      const result = await pool.query(query, values);

      if (result.rowCount === 0) {
        return res.status(404).render('admin/error', {
          layout: 'admin/layout',
          title: 'Error',
          error: 'Article not found',
          adminUser: req.adminUser
        });
      }

      res.redirect('/admin/grammar?success=' + encodeURIComponent('Article updated successfully'));
    } catch (error) {
      console.error('Grammar update error:', error);
      res.status(500).render('admin/error', {
        layout: 'admin/layout',
        title: 'Error',
        error: 'Failed to update article',
        adminUser: req.adminUser
      });
    }
  },

  // Grammar delete
  grammarDelete: async (req, res) => {
    try {
      const { id } = req.params;

      const query = `DELETE FROM grammar_articles WHERE id = $1`;
      const result = await pool.query(query, [id]);

      if (result.rowCount === 0) {
        return res.status(404).render('admin/error', {
          layout: 'admin/layout',
          title: 'Error',
          error: 'Article not found',
          adminUser: req.adminUser
        });
      }

      res.redirect('/admin/grammar?success=' + encodeURIComponent('Article deleted successfully'));
    } catch (error) {
      console.error('Grammar delete error:', error);
      res.status(500).render('admin/error', {
        layout: 'admin/layout',
        title: 'Error',
        error: 'Failed to delete article',
        adminUser: req.adminUser
      });
    }
  },
};

module.exports = adminController;
