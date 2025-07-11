require('dotenv').config();
const AdminJS = require('adminjs');
const AdminJSExpress = require('@adminjs/express');
const AdminJSSql = require('@adminjs/sql');
const bcrypt = require('bcrypt');
const { pool } = require('../config/database');
const { exportData, viewStats, resetPassword, bulkDelete } = require('./actions');

// Register SQL adapter
AdminJS.registerAdapter(AdminJSSql);

const adminConfig = {
  branding: {
    companyName: 'Lexigo Admin',
    logo: '',
    softwareBrothers: false,
    theme: {
      colors: {
        primary100: '#667eea',
        primary80: '#764ba2',
        primary60: '#667eea',
        primary40: '#4c51bf',
        primary20: '#2d3748',
      },
    },
  },
  rootPath: '/admin',
  resources: [
    {
      resource: {
        model: pool,
        table: 'users',
        primaryKey: 'id',
      },
      options: {
        parent: 'User Management',
        properties: {
          id: { isId: true },
          email: {
            isRequired: true,
            type: 'email'
          },
          role: {
            availableValues: [
              { value: 'admin', label: 'Admin' },
              { value: 'customer', label: 'Customer' },
            ],
          },
          created_at: {
            isVisible: { edit: false },
            type: 'datetime'
          },
          updated_at: {
            isVisible: { edit: false },
            type: 'datetime'
          },
        },
        actions: {
          new: {
            before: async (request) => {
              if (request.payload && request.payload.password) {
                request.payload = {
                  ...request.payload,
                  password_hash: request.payload.password, // hoặc password: request.payload.password
                };
                delete request.payload.password;
              }
              return request;
            },
          },
          edit: {
            before: async (request) => {
              if (request.payload && request.payload.password) {
                request.payload = {
                  ...request.payload,
                  password_hash: request.payload.password, // hoặc password: request.payload.password
                };
                delete request.payload.password;
              }
              return request;
            },
          },
          exportData: exportData,
          viewStats: viewStats,
          resetPassword: resetPassword,
          bulkDelete: bulkDelete,
        },
      },
    },
    {
      resource: {
        model: pool,
        table: 'levels',
        primaryKey: 'id',
      },
      options: {
        parent: 'Learning System',
        properties: {
          id: { isId: true },
          level_code: { isRequired: true },
          level_name: { isRequired: true },
          color: { type: 'string' },
          created_at: {
            isVisible: { edit: false },
            type: 'datetime'
          },
        },
        actions: {
          exportData: exportData,
          viewStats: viewStats,
          bulkDelete: bulkDelete,
        },
      },
    },
    {
      resource: {
        model: pool,
        table: 'words',
        primaryKey: 'id',
      },
      options: {
        parent: 'Learning System',
        properties: {
          id: { isId: true },
          word: { isRequired: true },
          pronunciation: { type: 'string' },
          meaning: { isRequired: true },
          definition: { type: 'textarea' },
          example_sentence: { type: 'textarea' },
          difficulty_level: {
            availableValues: [
              { value: 'easy', label: 'Easy' },
              { value: 'medium', label: 'Medium' },
              { value: 'hard', label: 'Hard' },
              { value: 'expert', label: 'Expert' },
            ],
          },
          audio_url: { type: 'url' },
          image_url: { type: 'url' },
          created_at: {
            isVisible: { edit: false },
            type: 'datetime'
          },
        },
        actions: {
          exportData: exportData,
          viewStats: viewStats,
          bulkDelete: bulkDelete,
        },
      },
    },
    {
      resource: {
        model: pool,
        table: 'categories',
        primaryKey: 'id',
      },
      options: {
        parent: 'Learning System',
        properties: {
          id: { isId: true },
          name: { isRequired: true },
          description: { type: 'textarea' },
          icon: { type: 'string' },
          color: { type: 'string' },
          created_at: {
            isVisible: { edit: false },
            type: 'datetime'
          },
        },
        actions: {
          exportData: exportData,
          viewStats: viewStats,
          bulkDelete: bulkDelete,
        },
      },
    },
    {
      resource: {
        model: pool,
        table: 'quotes',
        primaryKey: 'id',
      },
      options: {
        parent: 'Content Management',
        properties: {
          id: { isId: true },
          content: {
            isRequired: true,
            type: 'textarea'
          },
          author: { type: 'string' },
          created_at: {
            isVisible: { edit: false },
            type: 'datetime'
          },
        },
        actions: {
          exportData: exportData,
          viewStats: viewStats,
          bulkDelete: bulkDelete,
        },
      },
    },
    {
      resource: {
        model: pool,
        table: 'quiz_sessions',
        primaryKey: 'id',
      },
      options: {
        parent: 'Quiz Management',
        properties: {
          id: { isId: true },
          user_id: {
            reference: 'users',
            isVisible: { edit: false }
          },
          level_id: {
            reference: 'levels'
          },
          total_questions: { type: 'number' },
          correct_answers: { type: 'number' },
          score: { type: 'number' },
          is_completed: { type: 'boolean' },
          created_at: {
            isVisible: { edit: false },
            type: 'datetime'
          },
          completed_at: {
            isVisible: { edit: false },
            type: 'datetime'
          },
        },
        actions: {
          exportData: exportData,
          viewStats: viewStats,
          bulkDelete: bulkDelete,
        },
      },
    },
    {
      resource: {
        model: pool,
        table: 'questions',
        primaryKey: 'question_id',
      },
      options: {
        parent: 'Quiz Management',
        properties: {
          question_id: { isId: true },
          question_text: {
            isRequired: true,
            type: 'textarea'
          },
          question_type: {
            availableValues: [
              { value: 'multiple_choice', label: 'Multiple Choice' },
              { value: 'true_false', label: 'True/False' },
              { value: 'fill_blank', label: 'Fill in the Blank' },
            ],
          },
          points: { type: 'number' },
          level_code: { type: 'string' },
          created_at: {
            isVisible: { edit: false },
            type: 'datetime'
          },
        },
        actions: {
          exportData: exportData,
          viewStats: viewStats,
          bulkDelete: bulkDelete,
        },
      },
    },
    {
      resource: {
        model: pool,
        table: 'speaking_sessions',
        primaryKey: 'id',
      },
      options: {
        parent: 'Speaking Management',
        properties: {
          id: { isId: true },
          user_id: {
            reference: 'users',
            isVisible: { edit: false }
          },
          session_type: {
            availableValues: [
              { value: 'practice', label: 'Practice' },
              { value: 'test', label: 'Test' },
            ],
          },
          level_code: { type: 'string' },
          total_words: { type: 'number' },
          completed_words: { type: 'number' },
          total_score: { type: 'number' },
          average_score: { type: 'number' },
          is_completed: { type: 'boolean' },
          created_at: {
            isVisible: { edit: false },
            type: 'datetime'
          },
          completed_at: {
            isVisible: { edit: false },
            type: 'datetime'
          },
        },
        actions: {
          exportData: exportData,
          viewStats: viewStats,
          bulkDelete: bulkDelete,
        },
      },
    },
    {
      resource: {
        model: pool,
        table: 'speaking_results',
        primaryKey: 'id',
      },
      options: {
        parent: 'Speaking Management',
        properties: {
          id: { isId: true },
          session_id: {
            reference: 'speaking_sessions'
          },
          user_id: {
            reference: 'users',
            isVisible: { edit: false }
          },
          word_id: {
            reference: 'words'
          },
          spoken_text: { type: 'textarea' },
          overall_score: { type: 'number' },
          feedback_text: { type: 'textarea' },
          audio_url: { type: 'url' },
          created_at: {
            isVisible: { edit: false },
            type: 'datetime'
          },
        },
        actions: {
          exportData: exportData,
          viewStats: viewStats,
          bulkDelete: bulkDelete,
        },
      },
    },
    {
      resource: {
        model: pool,
        table: 'bookmarks',
        primaryKey: 'id',
      },
      options: {
        parent: 'User Activity',
        properties: {
          id: { isId: true },
          user_id: {
            reference: 'users',
            isVisible: { edit: false }
          },
          word_id: {
            reference: 'words'
          },
          notes: { type: 'textarea' },
          created_at: {
            isVisible: { edit: false },
            type: 'datetime'
          },
        },
        actions: {
          exportData: exportData,
          viewStats: viewStats,
          bulkDelete: bulkDelete,
        },
      },
    },
    {
      resource: {
        model: pool,
        table: 'user_stats',
        primaryKey: 'user_id',
      },
      options: {
        parent: 'Analytics & Rankings',
        properties: {
          user_id: {
            isId: true,
            reference: 'users'
          },
          total_points: { type: 'number' },
          weekly_points: { type: 'number' },
          monthly_points: { type: 'number' },
          streak_days: { type: 'number' },
          words_mastered: { type: 'number' },
          quizzes_completed: { type: 'number' },
          speaking_sessions_completed: { type: 'number' },
          last_activity: {
            isVisible: { edit: false },
            type: 'datetime'
          },
          created_at: {
            isVisible: { edit: false },
            type: 'datetime'
          },
          updated_at: {
            isVisible: { edit: false },
            type: 'datetime'
          },
        },
        actions: {
          exportData: exportData,
          viewStats: viewStats,
          bulkDelete: bulkDelete,
        },
      },
    },
  ],
  locale: {
    language: 'en',
    availableLanguages: ['en', 'vi'],
    translations: {
      en: {
        resources: {
          users: {
            name: 'Users',
            properties: {
              user_id: 'User ID',
              username: 'Username',
              email: 'Email',
              full_name: 'Full Name',
              role: 'Role',
              created_at: 'Created At',
              updated_at: 'Updated At',
            },
          },
        },
        actions: {
          exportData: 'Export Data',
          viewStats: 'View Statistics',
          resetPassword: 'Reset Password',
          bulkDelete: 'Bulk Delete',
        },
      },
    },
  },
};

// Authentication configuration
const authenticate = async (email, password) => {
  try {
    const query = 'SELECT * FROM users WHERE email = $1 AND role = $2';
    const result = await pool.query(query, [email, 'admin']);

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];

    // For development, allow plain text comparison
    // In production, use bcrypt.compare
    const isValidPassword = password === user.password_hash ||
                           await bcrypt.compare(password, user.password_hash);

    if (isValidPassword) {
      return {
        id: user.id,
        email: user.email,
        role: user.role,
        title: user.full_name || user.username,
      };
    }

    return null;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
};

const adminJs = new AdminJS(adminConfig);

const adminRouter = AdminJSExpress.buildAuthenticatedRouter(
  adminJs,
  {
    authenticate,
    cookieName: 'adminjs',
    cookiePassword: process.env.ADMIN_COOKIE_SECRET || 'some-secret-password-used-to-secure-cookie',
  },
  null,
  {
    secret: process.env.ADMIN_SESSION_SECRET || 'some-secret-used-to-sign-session-id',
    cookie: {
      httpOnly: process.env.NODE_ENV === 'production',
      secure: process.env.NODE_ENV === 'production',
    },
    resave: true,
    saveUninitialized: true,
  }
);

module.exports = { adminJs, adminRouter };
