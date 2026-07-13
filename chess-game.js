import { Chess } from "./vendor/chess.js";

const boardElement = document.getElementById("chess-board");
const statusElement = document.getElementById("chess-status");
const turnElement = document.getElementById("chess-turn");
const historyElement = document.getElementById("chess-history");
const storageKey = "alem-miniapp-chess-fen";

const pieces = {
  wp: "♙", wn: "♘", wb: "♗", wr: "♖", wq: "♕", wk: "♔",
  bp: "♟", bn: "♞", bb: "♝", br: "♜", bq: "♛", bk: "♚",
};

let game = new Chess();
let selectedSquare = null;
let orientation = "white";

try {
  const savedFen = localStorage.getItem(storageKey);
  if (savedFen) game.load(savedFen);
} catch {
  // Gizli modda depolama kapalı olabilir; yeni oyunla devam edilir.
}

function saveGame() {
  try {
    localStorage.setItem(storageKey, game.fen());
  } catch {
    // Oyun depolama olmadan da çalışır.
  }
}

function getStatus() {
  const side = game.turn() === "w" ? "Beyaz" : "Siyah";
  if (game.isCheckmate()) return `Şah mat! ${side === "Beyaz" ? "Siyah" : "Beyaz"} kazandı.`;
  if (game.isStalemate()) return "Pat! Oyun berabere.";
  if (game.isThreefoldRepetition()) return "Üç kez tekrar nedeniyle beraberlik.";
  if (game.isInsufficientMaterial()) return "Yetersiz taş nedeniyle beraberlik.";
  if (game.isDrawByFiftyMoves()) return "50 hamle kuralı nedeniyle beraberlik.";
  if (game.inCheck()) return `${side} şah altında.`;
  return `${side}ın sırası`;
}

function renderHistory() {
  const moves = game.history();
  historyElement.replaceChildren();
  moves.forEach((move, index) => {
    const item = document.createElement("li");
    item.value = Math.floor(index / 2) + 1;
    item.textContent = `${index % 2 === 0 ? "B" : "S"}: ${move}`;
    historyElement.append(item);
  });
  historyElement.scrollTop = historyElement.scrollHeight;
}

function renderBoard() {
  const files = orientation === "white"
    ? ["a", "b", "c", "d", "e", "f", "g", "h"]
    : ["h", "g", "f", "e", "d", "c", "b", "a"];
  const ranks = orientation === "white"
    ? [8, 7, 6, 5, 4, 3, 2, 1]
    : [1, 2, 3, 4, 5, 6, 7, 8];
  const legalMoves = selectedSquare
    ? game.moves({ square: selectedSquare, verbose: true })
    : [];
  const legalTargets = new Map(legalMoves.map((move) => [move.to, move]));

  boardElement.replaceChildren();
  ranks.forEach((rank, rowIndex) => {
    files.forEach((file, columnIndex) => {
      const squareName = `${file}${rank}`;
      const piece = game.get(squareName);
      const square = document.createElement("button");
      square.type = "button";
      square.className = "chess-square";
      square.dataset.square = squareName;
      square.setAttribute("role", "gridcell");
      square.setAttribute("aria-label", squareName);

      const canonicalFileIndex = file.charCodeAt(0) - 97;
      if ((canonicalFileIndex + rank) % 2 === 1) square.classList.add("dark");
      if (selectedSquare === squareName) square.classList.add("selected");
      if (legalTargets.has(squareName)) {
        square.classList.add("legal");
        if (piece || legalTargets.get(squareName).flags.includes("e")) square.classList.add("capture");
      }

      if (piece) {
        const pieceElement = document.createElement("span");
        pieceElement.className = `chess-piece ${piece.color === "w" ? "white" : "black"}`;
        pieceElement.textContent = pieces[`${piece.color}${piece.type}`];
        square.append(pieceElement);
      }

      if (columnIndex === 0) {
        const coordinate = document.createElement("span");
        coordinate.className = "coordinate rank";
        coordinate.textContent = rank;
        square.append(coordinate);
      }
      if (rowIndex === 7) {
        const coordinate = document.createElement("span");
        coordinate.className = "coordinate file";
        coordinate.textContent = file;
        square.append(coordinate);
      }

      square.addEventListener("click", () => handleSquare(squareName));
      boardElement.append(square);
    });
  });

  const turnName = game.turn() === "w" ? "Beyaz" : "Siyah";
  turnElement.textContent = turnName;
  statusElement.textContent = getStatus();
  renderHistory();
}

function selectSquare(square) {
  const piece = game.get(square);
  if (piece?.color === game.turn()) {
    selectedSquare = square;
    window.miniAppHaptic?.();
  } else {
    selectedSquare = null;
  }
  renderBoard();
}

function handleSquare(square) {
  if (game.isGameOver()) return;
  if (!selectedSquare) {
    selectSquare(square);
    return;
  }

  if (square === selectedSquare) {
    selectedSquare = null;
    renderBoard();
    return;
  }

  try {
    game.move({ from: selectedSquare, to: square, promotion: "q" });
    selectedSquare = null;
    saveGame();
    window.miniAppHaptic?.("medium");
    renderBoard();
  } catch {
    selectSquare(square);
  }
}

document.getElementById("chess-undo")?.addEventListener("click", () => {
  const move = game.undo();
  if (!move) {
    window.showMiniAppToast?.("Geri alınacak hamle yok");
    return;
  }
  selectedSquare = null;
  saveGame();
  renderBoard();
});

document.getElementById("chess-flip")?.addEventListener("click", () => {
  orientation = orientation === "white" ? "black" : "white";
  renderBoard();
});

document.getElementById("chess-reset")?.addEventListener("click", () => {
  game = new Chess();
  selectedSquare = null;
  saveGame();
  window.miniAppHaptic?.("medium");
  renderBoard();
});

renderBoard();
