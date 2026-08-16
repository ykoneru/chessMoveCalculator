const express = require('express');
const chessUserDao = require('../db/chessUserDao');
const { generateToken, removeToken } = require('../middleware/chessJwtAuth');
const { loginValidation, registerValidation } = require('../middleware/chessRequestValidation');

const router = express.Router();

router.post('/login', loginValidation, (req, res) => {
  chessUserDao
    .getUserByCredentials(req.data.email, req.data.password)
    .then((user) => {
      generateToken(req, res, user);
      res.status(200).json({
        id: user.id,
        username: user.username,
        email: user.email,
      });
    })
    .catch((err) => {
      let statusCode = 500;
      if (err.status) {
        statusCode = err.status;
      }

      let errorMessage = 'Login failed';
      if (err.message) {
        errorMessage = err.message;
      }

      res.status(statusCode).json({ error: errorMessage });
    });
});

router.post('/register', registerValidation, (req, res) => {
  chessUserDao
    .registerUser(req.data.username, req.data.email, req.data.password)
    .then((result) => {
      const user = {
        id: Number(result.insertId),
        username: req.data.username,
        email: req.data.email,
      };
      generateToken(req, res, user);
      res.status(201).json(user);
    })
    .catch((err) => {
      let statusCode = 500;
      if (err.status) {
        statusCode = err.status;
      }

      let errorMessage = 'Registration failed';
      if (err.message) {
        errorMessage = err.message;
      }

      res.status(statusCode).json({ error: errorMessage });
    });
});

router.post('/logout', (req, res) => {
  removeToken(req, res);
  res.status(200).json({ message: 'Logged out' });
});

module.exports = router;
