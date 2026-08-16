import { Chess } from 'https://cdn.jsdelivr.net/npm/chess.js@1.4.0/dist/esm/chess.js';

// helpers

async function apiRequest(path, options = {}) {
    const res = await fetch(`/api${path}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });

    let data = {};
    try {
        data = await res.json();
    } catch (err) {
        data = {};
    }

    if (!res.ok) {
        let errorMessage = 'Request failed';
        if (data.error) {
            errorMessage = data.error;
        }
        throw new Error(errorMessage);
    }

    return data;
}

const SCREEN_IDS = ['auth-screen', 'pgn-screen', 'analyzer-screen', 'my-games-screen'];

function showScreen(name) {
    SCREEN_IDS.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.toggle('d-none', id !== name);
        }
    });
}

function showAnalyzerScreen() {
    showScreen('analyzer-screen');
}

function showPgnScreen() {
    showScreen('pgn-screen');
}

function bindClick(id, handler) {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('click', handler);
    }
}

function updateBackToGamesButton() {
    const analyzerBtn = document.getElementById('back-to-games');
    if (analyzerBtn) {
        analyzerBtn.classList.toggle('d-none', !isLoggedIn);
    }

    const pgnBtn = document.getElementById('pgn-back-to-games');
    if (pgnBtn) {
        pgnBtn.classList.toggle('d-none', !isLoggedIn);
    }
}

// state

let isRegisterMode = false;
let isLoggedIn = false;
let currentPgnText = '';

const board = document.getElementById('board');

// stockfish worker, whether it's ready, and the last move it gave us
let engine = null;
let engineReady = false;
let engineReadyPromise = null;
let resolveEngineReady = null;
let resolveBestMove = null;
let lastBestMove = null;

// codes for drawing pieces - chess.js is the real game state
let chessBoard = [
    ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
    ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
    ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR'],
];

let playChess = new Chess();
let moves = [];
let currentIndex = 0;

// auth

function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    document.getElementById('auth-username').classList.toggle('d-none', !isRegisterMode);

    if (isRegisterMode) {
        document.getElementById('auth-title').textContent = 'Register';
        document.getElementById('auth-submit').textContent = 'Register';
    } else {
        document.getElementById('auth-title').textContent = 'Log In';
        document.getElementById('auth-submit').textContent = 'Log In';
    }

    document.getElementById('auth-error').textContent = '';
}

async function handleAuthSubmit() {
    document.getElementById('auth-error').textContent = '';

    try {
        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-password').value;

        if (isRegisterMode) {
            const username = document.getElementById('auth-username').value.trim();
            await apiRequest('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ username, email, password }),
            });
        } else {
            await apiRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });
        }

        isLoggedIn = true;
        updateBackToGamesButton();
        showScreen('my-games-screen');
        await loadGamesList();
    } catch (err) {
        document.getElementById('auth-error').textContent = err.message;
    }
}

async function handleLogout() {
    await apiRequest('/auth/logout', { method: 'POST' });
    isLoggedIn = false;
    updateBackToGamesButton();
    showScreen('auth-screen');
}

// saved games

function renderMiniBoard(container, pgn) {
    container.innerHTML = '';
    container.classList.add('mini-board');

    const tempChess = new Chess();
    try {
        tempChess.loadPgn(pgn, { strict: false });
    } catch (e) {
        return;
    }

    const boardState = tempChess.board();

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.classList.add('square');

            if ((row + col) % 2 === 0) {
                square.classList.add('white');
            } else {
                square.classList.add('black');
            }

            const piece = boardState[row][col];
            if (piece) {
                let colorCode = 'b';
                if (piece.color === 'w') {
                    colorCode = 'w';
                }

                const code = colorCode + piece.type.toUpperCase();
                const img = document.createElement('img');
                img.src = 'pieces/' + code + '.svg';
                img.classList.add('piece');
                square.appendChild(img);
            }

            container.appendChild(square);
        }
    }
}

async function loadGamesList() {
    const list = document.getElementById('games-list');
    if (!list) {
        return;
    }

    list.innerHTML = '';

    const games = await apiRequest('/games');

    games.forEach((game) => {
        const card = document.createElement('div');
        card.classList.add('saved-game-card');

        const boardDiv = document.createElement('div');
        boardDiv.classList.add('saved-game-board');
        boardDiv.title = 'Click to open this game';

        const boardInner = document.createElement('div');
        boardInner.classList.add('saved-game-board-inner');
        renderMiniBoard(boardInner, game.game_pgn);
        boardDiv.appendChild(boardInner);

        const label = document.createElement('div');
        label.classList.add('saved-game-label');
        label.textContent = game.game_name;
        label.title = game.game_name;
        boardDiv.appendChild(label);

        boardDiv.addEventListener('click', () => {
            apiRequest('/games/' + game.game_id).then((g) => {
                loadPgnFromString(g.game_pgn);
            });
        });
        card.appendChild(boardDiv);

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.title = 'Delete game';
        deleteBtn.setAttribute('aria-label', 'Delete game');
        deleteBtn.classList.add('saved-game-delete');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            apiRequest('/games/' + game.game_id, { method: 'DELETE' }).then(loadGamesList);
        });
        card.appendChild(deleteBtn);

        list.appendChild(card);
    });
}

function showSaveGameStatus(message, isError) {
    const saveBtn = document.getElementById('save-game-btn');
    if (!saveBtn) {
        return;
    }

    let status = document.getElementById('save-game-status');
    if (!status) {
        status = document.createElement('div');
        status.id = 'save-game-status';
        status.className = 'text-danger small mt-2';
        saveBtn.after(status);
    }

    status.textContent = message;

    if (isError) {
        status.className = 'text-danger small mt-2';
    } else {
        status.className = 'text-success small mt-2';
    }
}

async function handleSaveGame() {
    const name = document.getElementById('save-game-name').value.trim();

    try {
        await apiRequest('/games', {
            method: 'POST',
            body: JSON.stringify({ name, pgn: currentPgnText }),
        });
        showSaveGameStatus('Game saved.', false);
    } catch (err) {
        showSaveGameStatus(err.message, true);
    }
}

async function goBackToGames() {
    showScreen('my-games-screen');
    await loadGamesList();
}

// board

function createBoard() {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.classList.add('square');

            if ((row + col) % 2 === 0) {
                square.classList.add('white');
            } else {
                square.classList.add('black');
            }

            board.appendChild(square);
        }
    }
}

function drawPieces() {
    const squares = document.querySelectorAll('.square');
    squares.forEach((sq) => {
        sq.innerHTML = '';
    });

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = chessBoard[row][col];
            if (piece !== '') {
                const img = document.createElement('img');
                img.src = 'pieces/' + piece + '.svg';
                img.classList.add('piece');
                squares[row * 8 + col].appendChild(img);
            }
        }
    }
}

// copy chess.js position into chessBoard, then redraw
function updateBoardFromChess() {
    const boardState = playChess.board();

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const square = boardState[r][c];

            if (square) {
                let colorCode = 'b';
                if (square.color === 'w') {
                    colorCode = 'w';
                }
                chessBoard[r][c] = colorCode + square.type.toUpperCase();
            } else {
                chessBoard[r][c] = '';
            }
        }
    }

    drawPieces();
    updateUIStatus();
}

function updateUIStatus() {
    document.getElementById('move-index').textContent = currentIndex;

    if (currentIndex > 0) {
        document.getElementById('current-move').textContent = moves[currentIndex - 1];
    } else {
        document.getElementById('current-move').textContent = '';
    }
}

createBoard();
updateBoardFromChess();

// pgn load / stepping

function loadPgnFromString(pgn) {
    currentPgnText = pgn;
    const trimmed = pgn.trim();

    if (!trimmed) {
        alert('Please paste PGN into the textbox or load a .pgn file.');
        return;
    }

    const parsed = new Chess();
    try {
        parsed.loadPgn(trimmed, { strict: false });
    } catch (error) {
        alert('Failed to parse PGN. Please ensure moves are in standard algebraic notation.');
        return;
    }

    moves = parsed.history();
    if (moves.length === 0) {
        alert('Failed to parse PGN. Please ensure moves are in standard algebraic notation.');
        return;
    }

    // loadPgn leaves you at the end, so start over from move 0
    playChess = new Chess();
    currentIndex = 0;
    updateBoardFromChess();
    document.getElementById('move-count').textContent = moves.length;

    showAnalyzerScreen();
    setEngineStatus('Ready for suggestions');
    clearEngineSuggestion();
}

function stepNext() {
    if (currentIndex >= moves.length) {
        return;
    }

    playChess.move(moves[currentIndex]);
    currentIndex++;
    updateBoardFromChess();
}

function stepPrev() {
    if (currentIndex === 0) {
        return;
    }

    playChess.undo();
    currentIndex--;
    updateBoardFromChess();
}

function resetToStart() {
    playChess = new Chess();
    currentIndex = 0;
    updateBoardFromChess();
    clearEngineSuggestion();
}

// stockfish

function setEngineStatus(status) {
    document.getElementById('engine-status').textContent = status;
}

function clearEngineSuggestion() {
    document.getElementById('engine-move').textContent = '-';
    document.getElementById('move-explanation').textContent = '';
    document.getElementById('explain-move').disabled = true;
    lastBestMove = null;
}

function initializeEngine() {
    if (engine) {
        return engineReadyPromise;
    }

    setEngineStatus('Loading engine...');

    engineReadyPromise = new Promise((resolve) => {
        resolveEngineReady = resolve;
    });

    // worker finds its wasm file from the # in the url
    const wasmUrl = new URL('stockfish.wasm', location.href).href;
    const engineScriptUrl = new URL('stockfish-18-lite-single.js', location.href).href;
    engine = new Worker(engineScriptUrl + '#' + wasmUrl);

    engine.onmessage = handleEngineMessage;
    sendEngineCommand('uci');
    sendEngineCommand('isready');

    return engineReadyPromise;
}

function handleEngineMessage(event) {
    const message = event.data;

    if (message === 'readyok') {
        engineReady = true;
        setEngineStatus('Engine ready');
        resolveEngineReady();
        return;
    }

    if (message.startsWith('bestmove')) {
        const bestMove = message.split(' ')[1];
        document.getElementById('engine-move').textContent = bestMove;
        lastBestMove = bestMove;
        document.getElementById('explain-move').disabled = false;
        setEngineStatus('Analysis complete');
        resolveBestMove(bestMove);
        return;
    }
}

function sendEngineCommand(command) {
    engine.postMessage(command);
}

async function suggestNextMove() {
    await initializeEngine();

    if (!engineReady) {
        await engineReadyPromise;
    }

    setEngineStatus('Analyzing...');
    document.getElementById('engine-move').textContent = '-';

    const bestMovePromise = new Promise((resolve) => {
        resolveBestMove = resolve;
    });

    sendEngineCommand('ucinewgame');
    sendEngineCommand(`position fen ${playChess.fen()}`);
    sendEngineCommand('go depth 15');

    await bestMovePromise;
}

// gemini explain (hits our /explain-move route)

async function explainBestMove(fen, move) {
    document.getElementById('move-explanation').textContent = 'Loading...';

    try {
        const data = await apiRequest('/explain-move', {
            method: 'POST',
            body: JSON.stringify({ fen, move }),
        });
        document.getElementById('move-explanation').textContent = data.explanation;
    } catch (err) {
        document.getElementById('move-explanation').textContent = err.message;
    }
}

// button listeners + startup

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await apiRequest('/games');
        isLoggedIn = true;
        updateBackToGamesButton();
        showScreen('my-games-screen');
        await loadGamesList();
    } catch (err) {
        isLoggedIn = false;
        updateBackToGamesButton();
        showScreen('auth-screen');
    }

    initializeEngine();

    document.getElementById('load-pgn').addEventListener('click', () => {
        const pgn = document.getElementById('pgn-input').value.trim();
        if (!pgn) {
            alert('Please paste PGN into the textbox or load a .pgn file.');
            return;
        }
        loadPgnFromString(pgn);
    });

    document.getElementById('pgn-file').addEventListener('change', (ev) => {
        const file = ev.target.files[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            document.getElementById('pgn-input').value = reader.result;
        };
        reader.readAsText(file);
    });

    document.getElementById('next-move').addEventListener('click', stepNext);
    document.getElementById('prev-move').addEventListener('click', stepPrev);
    document.getElementById('reset-game').addEventListener('click', resetToStart);
    document.getElementById('edit-pgn').addEventListener('click', showPgnScreen);
    document.getElementById('suggest-move').addEventListener('click', suggestNextMove);
    document.getElementById('explain-move').addEventListener('click', () => {
        explainBestMove(playChess.fen(), lastBestMove);
    });

    bindClick('auth-toggle', toggleAuthMode);
    bindClick('auth-submit', handleAuthSubmit);
    bindClick('logout-btn', handleLogout);
    bindClick('new-game-btn', showPgnScreen);
    bindClick('save-game-btn', handleSaveGame);
    bindClick('back-to-games', goBackToGames);
    bindClick('pgn-back-to-games', goBackToGames);
});
