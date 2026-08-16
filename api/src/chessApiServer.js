const express = require('express');
const cookieParser = require('cookie-parser');
const chessAuthRoutes = require('./routes/chessAuthRoutes');
const chessSavedGamesRoutes = require('./routes/chessSavedGamesRoutes');
const chessExplainRoutes = require('./routes/chessExplainRoutes');

const app = express();

let port = process.env.PORT;
if (!port) {
  port = 80;
}

app.use(cookieParser());
app.use(express.json());

app.use('/auth', chessAuthRoutes);
app.use('/', chessSavedGamesRoutes);
app.use('/', chessExplainRoutes);

app.listen(port);
