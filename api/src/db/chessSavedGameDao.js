const db = require('./chessDatabase');

// Insert a saved game for this user.
function addGame(userId, name, pgn) {
  return db.query(
    'INSERT INTO chess_game (game_user_id, game_name, game_pgn) VALUES (?, ?, ?)',
    [userId, name, pgn]
  );
}

// All games for this user, newest first.
function getGames(userId) {
  return db.query(
    'SELECT game_id, game_name, game_pgn, game_created_at FROM chess_game WHERE game_user_id = ? ORDER BY game_created_at DESC',
    [userId]
  );
}

// One game, but only if it belongs to this user.
function getGameById(gameId, userId) {
  return db.query(
    'SELECT game_id, game_name, game_pgn, game_created_at FROM chess_game WHERE game_id = ? AND game_user_id = ?',
    [gameId, userId]
  );
}

// Delete a game if it belongs to this user.
function deleteGame(gameId, userId) {
  return db.query(
    'DELETE FROM chess_game WHERE game_id = ? AND game_user_id = ?',
    [gameId, userId]
  );
}

module.exports = {
  addGame,
  getGames,
  getGameById,
  deleteGame,
};
