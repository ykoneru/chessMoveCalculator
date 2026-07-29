import { Chess } from 'https://cdn.jsdelivr.net/npm/chess.js@1.4.0/dist/esm/chess.js';
import { GEMINI_API_KEY } from './config.js';

const board = document.getElementById("board");

let selectedSquare = null;

// The Stockfish engine and the two things we need to know: is it ready,
// and what was the last move it suggested.
let engine = null;
let engineReady = false;
let engineReadyPromise = null;
let resolveEngineReady = null;
let resolveBestMove = null;
let lastBestMove = null;

// The game itself. chess.js handles the rules; this array is just what we
// loop over to draw pieces on screen.
let chessBoard = [
    ["bR","bN","bB","bQ","bK","bB","bN","bR"],
    ["bP","bP","bP","bP","bP","bP","bP","bP"],
    ["","","","","","","",""] ,
    ["","","","","","","",""] ,
    ["","","","","","","",""] ,
    ["","","","","","","",""] ,
    ["wP","wP","wP","wP","wP","wP","wP","wP"],
    ["wR","wN","wB","wQ","wK","wB","wN","wR"]
];

let playChess = new Chess();
let moves = [];        // list of moves from the loaded PGN
let currentIndex = 0;  // how many of those moves we've played so far

createBoard();
updateBoardFromChess();

// ---- Draw the board ----

function createBoard() {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement("div");
            square.classList.add("square");
            square.classList.add((row + col) % 2 === 0 ? "white" : "black");
            square.addEventListener("click", squareClicked);
            board.appendChild(square);
        }
    }
}

function drawPieces() {
    const squares = document.querySelectorAll(".square");
    squares.forEach(sq => sq.innerHTML = "");

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = chessBoard[row][col];
            if (piece !== "") {
                const img = document.createElement("img");
                img.src = "pieces/" + piece + ".svg";
                img.classList.add("piece");
                squares[row * 8 + col].appendChild(img);
            }
        }
    }
}

function squareClicked(event) {
    if (selectedSquare) selectedSquare.classList.remove("selected");
    selectedSquare = event.currentTarget;
    selectedSquare.classList.add("selected");
}

// Pulls the current position from chess.js and re-draws the board with it.
function updateBoardFromChess() {
    const boardState = playChess.board();
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const square = boardState[r][c];
            chessBoard[r][c] = square ? (square.color === 'w' ? 'w' : 'b') + square.type.toUpperCase() : "";
        }
    }
    drawPieces();
    updateUIStatus();
}

// ---- Load and step through a PGN ----

function loadPgnFromString(pgn) {
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

    // Start playback from the beginning, not wherever the PGN ends.
    playChess = new Chess();
    currentIndex = 0;
    updateBoardFromChess();
    document.getElementById('move-count').textContent = moves.length;

    document.getElementById('pgn-screen').classList.add('d-none');
    document.getElementById('analyzer-screen').classList.remove('d-none');
    setEngineStatus('Ready for suggestions');
}

function stepNext() {
    if (currentIndex >= moves.length) return;
    playChess.move(moves[currentIndex]);
    currentIndex++;
    updateBoardFromChess();
}

function stepPrev() {
    if (currentIndex === 0) return;
    playChess.undo();
    currentIndex--;
    updateBoardFromChess();
}

function resetToStart() {
    playChess = new Chess();
    currentIndex = 0;
    updateBoardFromChess();
}

function updateUIStatus() {
    document.getElementById('move-index').textContent = currentIndex;
    document.getElementById('current-move').textContent = currentIndex > 0 ? moves[currentIndex - 1] : '';
}

// ---- Stockfish: find the best move ----

function setEngineStatus(status) {
    document.getElementById('engine-status').textContent = status;
}

function initializeEngine() {
    if (engine) return engineReadyPromise;

    setEngineStatus('Loading engine...');

    engineReadyPromise = new Promise((resolve) => {
        resolveEngineReady = resolve;
    });

    // stockfish-18-lite-single.js looks at the URL's hash to find its wasm
    // file, so we pass that in when creating the worker.
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
    if (!engineReady) await engineReadyPromise;

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

// ---- Gemini: explain why it's the best move ----

async function explainBestMove(fen, move) {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
        return alert('Copy config.example.js to config.js and add your Gemini API key.');
    }

    document.getElementById('move-explanation').textContent = 'Loading...';

    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Chess position (FEN): ${fen}\nStockfish suggests the move: ${move}\nIn 2-3 sentences, explain why this move is strong.`
                    }]
                }]
            }),
        }
    );

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No explanation returned.';
    document.getElementById('move-explanation').textContent = text;
}

// ---- Wire up the buttons ----

document.addEventListener('DOMContentLoaded', () => {
    initializeEngine();

    document.getElementById('load-pgn').addEventListener('click', () => {
        const pgn = document.getElementById('pgn-input').value.trim();
        if (!pgn) return alert('Please paste PGN into the textbox or load a .pgn file.');
        loadPgnFromString(pgn);
    });

    document.getElementById('pgn-file').addEventListener('change', (ev) => {
        const file = ev.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            document.getElementById('pgn-input').value = reader.result;
        };
        reader.readAsText(file);
    });

    document.getElementById('next-move').addEventListener('click', stepNext);
    document.getElementById('prev-move').addEventListener('click', stepPrev);
    document.getElementById('reset-game').addEventListener('click', resetToStart);
    document.getElementById('edit-pgn').addEventListener('click', () => {
        document.getElementById('analyzer-screen').classList.add('d-none');
        document.getElementById('pgn-screen').classList.remove('d-none');
    });
    document.getElementById('suggest-move').addEventListener('click', suggestNextMove);
    document.getElementById('explain-move').addEventListener('click', () => {
        explainBestMove(playChess.fen(), lastBestMove);
    });
});