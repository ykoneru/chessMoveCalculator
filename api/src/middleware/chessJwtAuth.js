const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'ChessAppToken';
const TOKEN_EXPIRY = '1h';

function verifyToken(req, res, next) {
  let token = null;

  if (req.cookies && req.cookies[COOKIE_NAME]) {
    token = req.cookies[COOKIE_NAME];
  } else {
    token = extractBearerToken(req);
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.API_SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function extractBearerToken(req) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
}

function isCookieSecure() {
  let cookieSecure = false;
  if (process.env.NODE_ENV === 'production') {
    cookieSecure = true;
  }
  return cookieSecure;
}

function generateToken(req, res, user) {
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
    },
    process.env.API_SECRET_KEY,
    {
      expiresIn: TOKEN_EXPIRY,
    }
  );

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isCookieSecure(),
    maxAge: 60 * 60 * 1000,
    sameSite: 'strict',
  });
}

function removeToken(req, res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isCookieSecure(),
    sameSite: 'strict',
  });
}

module.exports = {
  verifyToken,
  generateToken,
  removeToken,
};
