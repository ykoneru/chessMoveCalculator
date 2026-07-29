What it actually does:

    Paste a PGN or upload a .pgn file and the board resets to move one. From there you can click through the game with Prev/Next, or jump back to the start whenever. Hit "Suggest Next Move" and Stockfish (compiled to WebAssembly, running in a Web Worker so it doesn't freeze the tab) chews on the position and spits out a move. Hit "Explain this move" and Gemini gives you a couple sentences on why.

Each part:
    
    chess.js does all the actual chess logic — legal moves, PGN parsing, all of it. I didn't write any rules myself.
    Stockfish is the engine. It's WASM, and it runs in a separate thread so the page stays responsive while it's searching.
    Gemini takes the position (as FEN) and the suggested move and explains it in normal language.
    Bootstrap for styling, because I'd rather spend my time on the chess/engine stuff than reinventing buttons.
    Docker, so you don't need Python or Node set up locally to run this — two commands and it's up.

How to run:

    python3 -m http.server 8080

    then go to http://localhost:8080.

Or with Docker:

    docker build -t chess-analyzer .
    docker run -p 8080:80 -v $(pwd)/config.js:/usr/share/nginx/html/config.js chess-analyzer

API key setup:

    The explain feature needs a Gemini key. It's free — no credit card, just sign in at Google AI Studio and grab one.

    cp config.example.js config.js

    Open config.js, paste your key in where it says YOUR_API_KEY_HERE. This file's gitignored, so it never ends up in the repo.

Example PGN:

    1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7

