require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool } = require('../config/database');

async function setupAdmin() {
  try {
    console.log('🚀 Setting up admin user...');

    // Default admin credentials
    const adminData = {
      username: 'admin',
      email: 'admin@lexigo.com',
      password: 'admin123', // Will be hashed
      full_name: 'System Administrator',
      role: 'admin'
    };

    // Check if admin already exists
    const existingAdmin = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [adminData.username, adminData.email]
    );

    if (existingAdmin.rows.length > 0) {
      const user = existingAdmin.rows[0];
      console.log('⚠️  User already exists. Updating to admin role...');

      // Hash password
      const hashedPassword = await bcrypt.hash(adminData.password, 10);

      // Update existing user to admin
      const updateQuery = `
        UPDATE users
        SET role = $1, password_hash = $2, full_name = $3, updated_at = NOW()
        WHERE id = $4
        RETURNING id, username, email, role
      `;

      const result = await pool.query(updateQuery, [
        adminData.role,
        hashedPassword,
        adminData.full_name,
        user.id
      ]);

      console.log('✅ Admin user updated successfully!');
      console.log('👤 Admin Details:');
      console.log('   ID:', result.rows[0].id);
      console.log('   Email:', result.rows[0].email);
      console.log('   Password:', adminData.password);
      console.log('   Username:', result.rows[0].username);
      console.log('   Role:', result.rows[0].role);
      console.log('');
      console.log('🔗 Access AdminJS at: http://localhost:9999/admin');
      console.log('⚠️  Please change the default password after first login');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminData.password, 10);

    // Create admin user
    const insertQuery = `
      INSERT INTO users (
        username, email, password_hash, full_name, role, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, NOW(), NOW()
      ) RETURNING id, username, email, role
    `;

    const result = await pool.query(insertQuery, [
      adminData.username,
      adminData.email,
      hashedPassword,
      adminData.full_name,
      adminData.role
    ]);

    console.log('✅ Admin user created successfully!');
    console.log('👤 Admin Details:');
    console.log('   ID:', result.rows[0].id);
    console.log('   Email:', adminData.email);
    console.log('   Password:', adminData.password);
    console.log('   Username:', adminData.username);
    console.log('   Role:', adminData.role);
    console.log('');
    console.log('🔗 Access AdminJS at: http://localhost:9999/admin');
    console.log('⚠️  Please change the default password after first login');

  } catch (error) {
    console.error('❌ Error setting up admin user:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  setupAdmin()
    .then(() => {
      console.log('✅ Admin setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Admin setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupAdmin };
