const mariadb = require('mariadb');

// Shared pool so we don't open a new connection on every request.
const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  charset: process.env.DB_CHARSET,
  connectionLimit: 10,
});

// Run a SQL query, then put the connection back in the pool.
async function query(sql, params) {
  let conn;

  try {
    conn = await pool.getConnection();
    return await conn.query(sql, params);
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

// Shut down the pool (used when the process is exiting).
async function close() {
  await pool.end();
}

module.exports = {
  query,
  close,
};
