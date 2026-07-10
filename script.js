const board = document.getElementById("board");

let selectedSquare = null;

const chessBoard = [

    ["bR","bN","bB","bQ","bK","bB","bN","bR"],
    ["bP","bP","bP","bP","bP","bP","bP","bP"],
    ["","","","","","","",""],
    ["","","","","","","",""],
    ["","","","","","","",""],
    ["","","","","","","",""],
    ["wP","wP","wP","wP","wP","wP","wP","wP"],
    ["wR","wN","wB","wQ","wK","wB","wN","wR"]

];

createBoard();

drawPieces();

function createBoard() {

    for (let row = 0; row < 8; row++) {

        for (let col = 0; col < 8; col++) {

            const square = document.createElement("div");

            square.classList.add("square");

            if ((row + col) % 2 === 0) {
                square.classList.add("white");
            }
            else {
                square.classList.add("black");
            }

            square.dataset.row = row;
            square.dataset.col = col;

            square.addEventListener("click", squareClicked);

            board.appendChild(square);

        }

    }

}

function drawPieces() {

    const squares = document.querySelectorAll(".square");

    for (let row = 0; row < 8; row++) {

        for (let col = 0; col < 8; col++) {

            const piece = chessBoard[row][col];

            if (piece !== "") {

                const img = document.createElement("img");

                img.src = "pieces/" + piece + ".svg";

                img.classList.add("piece");

                const squareIndex = row * 8 + col;

                squares[squareIndex].appendChild(img);

            }

        }

    }

}

function squareClicked(event) {

    if (selectedSquare !== null) {

        selectedSquare.classList.remove("selected");

    }

    selectedSquare = event.currentTarget;

    selectedSquare.classList.add("selected");

}