import { Colors } from "./const";
import "./style.css";

const CELL_SIZE = 28; // px
const BOARD_HEIGHT = 25; // cells
const BOARD_WIDTH = 15; // cells

enum CELLS {
    Empty,
    Piece,
    Block,
}

const PIECES: CELLS[][][] = [
    [
        [1, 1],
        [1, 1],
    ],
    [
        [0, 1],
        [0, 1],
        [1, 1],
    ],
    [
        [1, 0],
        [1, 0],
        [1, 1],
    ],
    [
        [0, 1, 0],
        [1, 1, 1],
    ],
    [[1, 1, 1, 1]],
];

const board = document.getElementById("board") as HTMLCanvasElement;
const boardCtx = board?.getContext("2d")!;
let boardState: CELLS[][];
let piece: {
    shape: CELLS[][];
    x: number;
    y: number;
};

let lastTime = 0,
    deltaTime = 0,
    descendCounter = 0;

let isGameOver = false;

const $score = document.getElementById("score");
let score = 0;

const $start = document.getElementById("start");

// 01 - Initialize canvas
function start() {
    board.height = BOARD_HEIGHT * CELL_SIZE;
    board.width = BOARD_WIDTH * CELL_SIZE;

    boardCtx.scale(CELL_SIZE, CELL_SIZE);

    boardState = _createEmptyBoard();

    // Create and place piece
    piece = _createPiece();

    // isGameOver
    isGameOver = false;

    // score
    addPoints(0);

    inputHandler();

    update(0);
}

function _createEmptyBoard() {
    return Array(BOARD_HEIGHT)
        .fill(null)
        .map(() => Array(BOARD_WIDTH).fill(CELLS.Empty));
}

function _createPiece() {
    return {
        shape: PIECES[Math.floor(Math.random() * PIECES.length)],
        x: Math.floor(Math.random() * (BOARD_WIDTH * 0.5)),
        y: 0,
    };
}

// 02 - Game loop on animation frame
function update(timestamp: number) {
    descendJob(timestamp);

    if (isGameOver) {
        window.alert(`Game Over! Score: ${score}`);
        score = 0;
        start();
    }

    draw();

    window.requestAnimationFrame(update);
}

// 07 - Automatic piece descend
function descendJob(timestamp: number) {
    deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    descendCounter += deltaTime;

    if (descendCounter > 1000) {
        moveOrCollision(() => {
            piece.y++;
        }, transformIntoBlock);

        descendCounter = 0;
    }
}

// 02 - Draw board
function draw() {
    boardState.forEach((row, y) => {
        row.forEach((cell, x) => {
            _drawCell(x, y, cell);
        });
    });

    piece.shape.forEach((row, y) => {
        row.forEach((cell, x) => {
            if (cell === CELLS.Piece) _drawCell(piece.x + x, piece.y + y, cell);
        });
    });
}

function _drawCell(x: number, y: number, cell: CELLS) {
    switch (cell) {
        case CELLS.Empty:
            boardCtx.fillStyle = Colors.primary[400];
            boardCtx.fillRect(x, y, 1, 1);
            break;
        case CELLS.Piece:
            boardCtx.fillStyle = Colors.primary[200];
            boardCtx.fillRect(x, y, 1, 1);
            break;
        case CELLS.Block:
            boardCtx.fillStyle = Colors.primary[600];
            boardCtx.fillRect(x, y, 1, 1);
            break;
    }
}

// 03 - Piece movement
function inputHandler() {
    document.addEventListener("keydown", (event) => {
        if (event.key === "ArrowLeft") {
            moveOrCollision(() => {
                piece.x--;
            }, transformIntoBlock);
        }
        if (event.key === "ArrowRight") {
            moveOrCollision(() => {
                piece.x++;
            }, transformIntoBlock);
        }
        if (event.key === "ArrowDown") {
            moveOrCollision(() => {
                piece.y++;
            }, transformIntoBlock);
        }
        if (event.key === "ArrowUp") {
            moveOrCollision(() => {
                const newShape = [];

                for (let i = 0; i < piece.shape[0].length; i++) {
                    const row = [];

                    for (let j = piece.shape.length - 1; j >= 0; j--) {
                        row.push(piece.shape[j][i]);
                    }

                    newShape.push(row);
                }

                piece.shape = newShape;
            }, transformIntoBlock);
        }
    });
}

// 04 - Check collisions
function moveOrCollision(movement: () => void, onCollision?: (isOutOfBounds: boolean) => void) {
    const previous = { ...piece };

    movement();
    let isOutOfBounds = false;

    const noCollision = piece.shape.every((row, y) => {
        return row.every((cell, x) => {
            if (cell === CELLS.Empty) {
                return true;
            }
            if (!boardState[piece.y + y] || boardState[piece.y + y][piece.x + x] === CELLS.Block) {
                return false;
            }
            if (boardState[piece.y + y][piece.x + x] === undefined) {
                isOutOfBounds = true;
                return false;
            }

            return true;

            // return (
            //     cell === CELLS.Empty ||
            //     (boardState[piece.y + y] && boardState[piece.y + y][piece.x + x] === CELLS.Empty)
            // );
        });
    });

    // Revert if collision
    if (!noCollision) {
        piece = previous;
        if (onCollision) onCollision(isOutOfBounds);
    }

    return noCollision;
}

// 05 - Turn piece into block
function transformIntoBlock(isOutOfBounds: boolean) {
    if (isOutOfBounds) return;

    piece.shape.forEach((row, y) => {
        row.forEach((cell, x) => {
            if (cell === CELLS.Piece) boardState[piece.y + y][piece.x + x] = CELLS.Block;
        });
    });

    piece = _createPiece();

    onBoardChange();
}

// 06 - Clear filled row
// 09 - Game over
function onBoardChange() {
    // Check if filled row exists
    const filledRows: number[] = [];
    boardState.forEach((row, y) => {
        if (row.every((cell) => cell === CELLS.Block)) {
            filledRows.push(y);
        }
    });
    filledRows.forEach((y) => {
        boardState.splice(y, 1);
        const newRow = Array(BOARD_WIDTH).fill(CELLS.Empty);
        boardState.unshift(newRow);
    });

    // Add points
    if (filledRows.length !== 0) {
        addPoints(Math.floor(100 * filledRows.length * (1 + 0.1 * (filledRows.length - 1))));
    }

    addPoints(Math.floor(piece.shape.length * piece.shape[0].length * 0.5));

    // Game over
    isGameOver = !piece.shape.every((row, y) => {
        return row.every((cell, x) => {
            return cell === CELLS.Empty || boardState[piece.y + y][piece.x + x] === CELLS.Empty;
        });
    });
}

// 10 - Add points on filled row
function addPoints(amount: number) {
    if ($score) {
        score += amount;
        $score.textContent = score.toString();
    }
}

$start?.addEventListener("click", () => {
    $start.remove();
    const audio = new window.Audio("./Tetris.ogg");
    audio.volume = 0.2;
    audio.play();
    start();
});
