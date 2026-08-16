const express = require('express');
const chessSavedGameDao = require('../db/chessSavedGameDao');
const { verifyToken } = require('../middleware/chessJwtAuth');
const { gameValidation } = require('../middleware/chessRequestValidation');

const router = express.Router();

router.use(verifyToken);

router.get('/games', (req, res) => {
  chessSavedGameDao
    .getGames(req.user.id)
    .then((games) => {
      res.status(200).json(games);
    })
    .catch((err) => {
      let errorMessage = 'Failed to fetch games';
      if (err.message) {
        errorMessage = err.message;
      }

      res.status(500).json({ error: errorMessage });
    });
});

router.get('/games/:id', (req, res) => {
  chessSavedGameDao
    .getGameById(req.params.id, req.user.id)
    .then((rows) => {
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Game not found' });
      }

      res.status(200).json(rows[0]);
    })
    .catch((err) => {
      let errorMessage = 'Failed to fetch game';
      if (err.message) {
        errorMessage = err.message;
      }

      res.status(500).json({ error: errorMessage });
    });
});

router.post('/games', gameValidation, (req, res) => {
  chessSavedGameDao
    .addGame(req.user.id, req.data.name, req.data.pgn)
    .then((result) => {
      res.status(201).json({
        game_id: Number(result.insertId),
        game_name: req.data.name,
        game_pgn: req.data.pgn,
      });
    })
    .catch((err) => {
      let errorMessage = 'Failed to save game';
      if (err.message) {
        errorMessage = err.message;
      }

      res.status(500).json({ error: errorMessage });
    });
});

router.delete('/games/:id', (req, res) => {
  chessSavedGameDao
    .deleteGame(req.params.id, req.user.id)
    .then((result) => {
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Game not found' });
      }

      res.status(200).json({ message: 'Game deleted' });
    })
    .catch((err) => {
      let errorMessage = 'Failed to delete game';
      if (err.message) {
        errorMessage = err.message;
      }

      res.status(500).json({ error: errorMessage });
    });
});

module.exports = router;
