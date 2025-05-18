const { Pool } = require("pg");
require("dotenv").config();

const config = {
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "food_db",
  password: process.env.DB_PASSWORD || "123123Abc.",
  port: process.env.DB_PORT || 5432,
  // If running locally, comment this 1 line ssl.
  // ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
};

// Create a connection pool
const pool = new Pool(config);
// Test the connection immediately
pool
  .connect()
  .then((client) => {
    console.log("🚀 Connected to PostgreSQL database");
    client.release(); // Release the client back to the pool
  })
  .catch((err) => {
    console.error("❌ Database Connection Failed:", err);
  });

// Export a function that returns a promise of a client from the pool
const poolPromise = {
  query: (text, params) => pool.query(text, params),
  connect: () => pool.connect(),
};

// Handle pool errors
pool.on(500, (err) => {
  console.error("Unexpected error on idle client", err);
});

module.exports = {
  pool,
  poolPromise,
};
