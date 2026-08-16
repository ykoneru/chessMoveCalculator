const crypto = require('crypto');
const db = require('./chessDatabase');

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = 'sha512';

function hashPassword(password, salt) {
  return crypto
    .pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
    .toString('hex');
}

// Creates a new user with a salted PBKDF2 password hash.
async function registerUser(username, email, password) {
  const salt = crypto.randomBytes(32).toString('hex');
  const hashedPassword = hashPassword(password, salt);

  try {
    const result = await db.query(
      'INSERT INTO user (usr_username, usr_email, usr_password, usr_salt) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, salt]
    );
    return result;
  } catch (err) {
    if (err.errno === 1062) {
      let message = 'Email already registered';

      if (err.message.includes('usr_username')) {
        message = 'Username already taken';
      }

      const error = new Error(message);
      error.status = 409;
      throw error;
    }

    throw err;
  }
}

// Finds a user by email and checks the password. Returns id, username, email.
async function getUserByCredentials(email, password) {
  const rows = await db.query(
    'SELECT usr_id, usr_username, usr_email, usr_password, usr_salt FROM user WHERE usr_email = ?',
    [email]
  );

  if (rows.length === 0) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  const user = rows[0];
  const derivedHash = hashPassword(password, user.usr_salt);

  if (user.usr_password !== derivedHash) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  return {
    id: user.usr_id,
    username: user.usr_username,
    email: user.usr_email,
  };
}

module.exports = {
  registerUser,
  getUserByCredentials,
};
