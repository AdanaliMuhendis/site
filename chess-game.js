import { Chess } from "./vendor/chess.js";

const api = window.miniAppApi;
const boardElement = document.getElementById("chess-board");
const statusElement = document.getElementById("chess-status");
const turnElement = document.getElementById("chess-turn");
const historyElement = document.getElementById("chess-history");
const pieces = {
  wp: "♙", wn: "♘", wb: "♗", wr: "♖", wq: "♕", wk: "♔",
  bp: "♟", bn: "♞", bb: "♝", br: "♜", bq: "♛", bk: "♚",
};

let game = new Chess();
let roomState = null;
let selectedSquare = null;
let orientation = "white";
let requestBusy = false;

function playerName(color) {
  return roomState?.players?.find((player) => player.color === color)?.name || "Bekleniyor";
}

function statusText() {
  if (!api?.available) return "Mini App'i Telegram grubundaki /oyun bağlantısından açın.";
  if (!roomState) return "Grup odasına bağlanıyor…";
  if (!roomState.ready) return `Rakip bekleniyor · Sen: ${roomState.role === "white" ? "Beyaz" : "İzleyici"}`;
  if (roomState.game_over) {
    if (roomState.result === "1-0") return `${playerName("white")} kazandı.`;
    if (roomState.result === "0-1") return `${playerName("black")} kazandı.`;
    return "Oyun beraberlikle tamamlandı.";
  }
  const current = roomState.turn === "white" ? "Beyaz" : "Siyah";
  const suffix = roomState.check ? " · Şah!" : "";
  return `${current} oynuyor (${playerName(roomState.turn)})${suffix} · Sen: ${roomState.role}`;
}

function renderHistory() {
  historyElement.replaceChildren();
  (roomState?.history || []).forEach((move, index) => {
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
  const ranks = orientation === "white" ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const legalMoves = selectedSquare ? game.moves({ square: selectedSquare, verbose: true }) : [];
  const legalTargets = new Map(legalMoves.map((move) => [move.to, move]));
  boardElement.replaceChildren();

  ranks.forEach((rank, rowIndex) => {
    files.forEach((file, columnIndex) => {
      const squareName = `${file}${rank}`;
      const piece = game.get(squareName);
      const square = document.createElement("button");
      square.type = "button";
      square.className = "chess-square";
      square.setAttribute("role", "gridcell");
      square.setAttribute("aria-label", squareName);
      if ((file.charCodeAt(0) - 97 + rank) % 2 === 1) square.classList.add("dark");
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

  turnElement.textContent = roomState ? (roomState.turn === "white" ? "Beyaz" : "Siyah") : "Çevrim içi";
  statusElement.textContent = statusText();
  renderHistory();
}

function applyState(state) {
  roomState = state;
  try { game.load(state.fen); } catch { return; }
  if (state.role === "white" || state.role === "black") orientation = state.role;
  selectedSquare = null;
  renderBoard();
}

async function sync(join = false, quiet = false) {
  if (!api?.available || requestBusy) return;
  requestBusy = true;
  try {
    const payload = await api.request(`/api/games/chess/${join ? "join" : "state"}`, {
      method: join ? "POST" : "GET",
    });
    if (!roomState || payload.state.version !== roomState.version) applyState(payload.state);
  } catch (error) {
    statusElement.textContent = error.message;
    if (!quiet) window.showMiniAppToast?.(error.message);
  } finally {
    requestBusy = false;
  }
}

async function sendAction(payload) {
  if (requestBusy) return;
  requestBusy = true;
  try {
    const result = await api.request("/api/games/chess/action", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    applyState(result.state);
    window.miniAppHaptic?.("medium");
  } catch (error) {
    window.showMiniAppToast?.(error.message);
    await sync(false, true);
  } finally {
    requestBusy = false;
  }
}

function handleSquare(square) {
  if (!roomState?.ready || roomState.game_over || roomState.role !== roomState.turn) return;
  if (!selectedSquare) {
    const piece = game.get(square);
    if (piece?.color === game.turn()) selectedSquare = square;
    renderBoard();
    return;
  }
  if (square === selectedSquare) {
    selectedSquare = null;
    renderBoard();
    return;
  }
  const legal = game.moves({ square: selectedSquare, verbose: true }).some((move) => move.to === square);
  if (legal) {
    const source = selectedSquare;
    selectedSquare = null;
    sendAction({ action: "move", from: source, to: square, promotion: "q" });
  } else {
    const piece = game.get(square);
    selectedSquare = piece?.color === game.turn() ? square : null;
    renderBoard();
  }
}

document.getElementById("chess-refresh")?.addEventListener("click", () => sync(false));
document.getElementById("chess-flip")?.addEventListener("click", () => {
  orientation = orientation === "white" ? "black" : "white";
  renderBoard();
});
document.getElementById("chess-reset")?.addEventListener("click", () => {
  if (roomState?.role !== "spectator") sendAction({ action: "reset" });
});

renderBoard();
sync(true);
setInterval(() => sync(false, true), 1800);
