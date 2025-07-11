require('dotenv').config();
const { pool } = require('../config/database');

async function addRoleColumn() {
  try {
    console.log('🚀 Adding role column to users table...');

    // Check if role column already exists
    const checkColumnQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'role'
    `;

    const checkResult = await pool.query(checkColumnQuery);

    if (checkResult.rows.length > 0) {
      console.log('✅ Role column already exists');
      return;
    }

    // Add role column
    const addColumnQuery = `
      ALTER TABLE users
      ADD COLUMN role VARCHAR(50) DEFAULT 'customer'
    `;

    await pool.query(addColumnQuery);
    console.log('✅ Role column added successfully');

    // Update existing users to have customer role by default
    const updateUsersQuery = `
      UPDATE users
      SET role = 'customer'
      WHERE role IS NULL
    `;

    await pool.query(updateUsersQuery);
    console.log('✅ Updated existing users with customer role');

    // Create index on role column for better performance
    const createIndexQuery = `
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)
    `;

    await pool.query(createIndexQuery);
    console.log('✅ Created index on role column');

    console.log('✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Error adding role column:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  addRoleColumn()
    .then(() => {
      console.log('✅ Role column migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Role column migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addRoleColumn };
