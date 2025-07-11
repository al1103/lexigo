require('dotenv').config();
const { pool } = require('../config/database');

async function checkTableStructure() {
  try {
    console.log('🔍 Checking users table structure...');

    // Get table columns
    const columnsQuery = `
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `;

    const columnsResult = await pool.query(columnsQuery);

    if (columnsResult.rows.length === 0) {
      console.log('❌ Users table does not exist');
      return;
    }

    console.log('📋 Users table columns:');
    console.table(columnsResult.rows);

    // Get primary key
    const primaryKeyQuery = `
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'users' AND tc.constraint_type = 'PRIMARY KEY'
    `;

    const primaryKeyResult = await pool.query(primaryKeyQuery);

    if (primaryKeyResult.rows.length > 0) {
      console.log('🔑 Primary key column:', primaryKeyResult.rows[0].column_name);
    } else {
      console.log('⚠️  No primary key found');
    }

    // Check if users table has any data
    const countQuery = 'SELECT COUNT(*) as count FROM users';
    const countResult = await pool.query(countQuery);
    console.log('👥 Total users in table:', countResult.rows[0].count);

    // Show sample data (first few rows, excluding sensitive info)
    const sampleQuery = `
      SELECT
        ${primaryKeyResult.rows.length > 0 ? primaryKeyResult.rows[0].column_name : '*'},
        username,
        email,
        role,
        created_at
      FROM users
      LIMIT 3
    `;

    const sampleResult = await pool.query(sampleQuery);
    if (sampleResult.rows.length > 0) {
      console.log('📊 Sample data:');
      console.table(sampleResult.rows);
    }

  } catch (error) {
    console.error('❌ Error checking table structure:', error);
  } finally {
    await pool.end();
  }
}

// Run the check if this file is executed directly
if (require.main === module) {
  checkTableStructure()
    .then(() => {
      console.log('✅ Table structure check completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Table structure check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkTableStructure };
