function loginValidation(req, res, next) {
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  req.data = {
    email: email,
    password: password,
  };
  next();
}

function registerValidation(req, res, next) {
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  req.data = {
    username: username,
    email: email,
    password: password,
  };
  next();
}

function gameValidation(req, res, next) {
  const name = req.body.name;
  const pgn = req.body.pgn;

  if (!name || !pgn) {
    return res.status(400).json({ error: 'Name and pgn are required' });
  }

  req.data = {
    name: name,
    pgn: pgn,
  };
  next();
}

module.exports = {
  loginValidation,
  registerValidation,
  gameValidation,
};
