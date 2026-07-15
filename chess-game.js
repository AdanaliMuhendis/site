import { Chess } from "./vendor/chess.js";

const api = window.miniAppApi;
const boardElement = document.getElementById("chess-board");
const statusElement = document.getElementById("chess-status");
const turnElement = document.getElementById("chess-turn");
const historyElement = document.getElementById("chess-history");
const roomCard = document.getElementById("chess-room-card");
const roomCodeElement = document.getElementById("chess-room-code");
const roomCountElement = document.getElementById("chess-room-count");
const playersElement = document.getElementById("chess-players");
const createRow = document.querySelector("#chess-lobby .room-create-row");
const pieces = {
  wp: "♙", wn: "♘", wb: "♗", wr: "♖", wq: "♕", wk: "♔",
  bp: "♟", bn: "♞", bb: "♝", br: "♜", bq: "♛", bk: "♚",
};

let game = new Chess();
let state = null;
let roomCode = sessionStorage.getItem("alem-chess-room") || "";
let selectedSquare = null;
let orientation = "white";
let busy = false;
let syncing = false;
let realtimeSocket = null;
let realtimeConnecting = false;
let eventRoomCode = "";
let eventReconnectTimer = null;

function initials(name) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
}

function renderPlayers() {
  playersElement.replaceChildren();
  if (!state) return;
  (state?.players || []).forEach((player) => {
    const card = document.createElement("div");
    card.className = `room-player ${player.color || "waiting"}`;
    const avatar = document.createElement(player.photo_url ? "img" : "span");
    avatar.className = "player-avatar";
    if (player.photo_url) {
      avatar.src = player.photo_url;
      avatar.alt = "";
      avatar.referrerPolicy = "no-referrer";
    } else avatar.textContent = initials(player.name);
    const details = document.createElement("div");
    const isHost = player.id === state.host_id;
    details.innerHTML = `<b>${player.name}${player.id === state.you_id ? " (Sen)" : ""}</b><span>${isHost ? "Oda sahibi · " : ""}${player.color === "white" ? "Beyaz" : "Siyah"}</span>`;
    card.append(avatar, details);
    playersElement.append(card);
  });
  for (let index = state?.players?.length || 0; index < 2; index += 1) {
    const empty = document.createElement("div");
    empty.className = "room-player empty";
    empty.innerHTML = `<span class="player-avatar">+</span><div><b>Oyuncu bekleniyor</b><span>Oda kodunu paylaş</span></div>`;
    playersElement.append(empty);
  }
}

function playerName(color) {
  return state?.players?.find((player) => player.color === color)?.name || "Bekleniyor";
}

function statusText() {
  if (!api?.available) return "Mini App'i Telegram içinden açın.";
  if (!roomCode) return "Yeni bir oda oluştur veya arkadaşının oda kodunu gir.";
  if (!state) return "Odaya bağlanıyor…";
  if (!state.started) return state.players.length === 2 ? "Oyuncular tamamlandı. Oyun otomatik başlatılıyor…" : "İkinci oyuncu bekleniyor.";
  if (state.game_over) {
    if (state.result === "1-0") return `${playerName("white")} kazandı.`;
    if (state.result === "0-1") return `${playerName("black")} kazandı.`;
    return "Oyun beraberlikle tamamlandı.";
  }
  const current = state.turn === "white" ? "Beyaz" : "Siyah";
  return `${current} oynuyor · ${playerName(state.turn)}${state.check ? " · Şah!" : ""}`;
}

function renderHistory() {
  historyElement.replaceChildren();
  (state?.history || []).forEach((move, index) => {
    const item = document.createElement("li");
    item.value = Math.floor(index / 2) + 1;
    item.textContent = `${index % 2 === 0 ? "B" : "S"}: ${move}`;
    historyElement.append(item);
  });
}

function renderBoard() {
  const files = orientation === "white" ? ["a","b","c","d","e","f","g","h"] : ["h","g","f","e","d","c","b","a"];
  const ranks = orientation === "white" ? [8,7,6,5,4,3,2,1] : [1,2,3,4,5,6,7,8];
  const legalMoves = selectedSquare ? game.moves({ square: selectedSquare, verbose: true }) : [];
  const legalTargets = new Map(legalMoves.map((move) => [move.to, move]));
  boardElement.replaceChildren();
  ranks.forEach((rank, rowIndex) => files.forEach((file, columnIndex) => {
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
  }));
  turnElement.textContent = state?.started ? (state.turn === "white" ? "Beyaz" : "Siyah") : "Oda bekliyor";
  statusElement.textContent = statusText();
  renderHistory();
}

function renderRoom() {
  const joined = Boolean(roomCode && state);
  roomCard.hidden = !joined;
  createRow.hidden = joined;
  roomCodeElement.textContent = roomCode || "------";
  roomCountElement.textContent = `${state?.players?.length || 0}/2 oyuncu`;
  document.getElementById("chess-reset").disabled = !joined || !state.started || state.host_id !== state.you_id;
  renderPlayers();
  renderBoard();
}

function applyState(nextState) {
  state = nextState;
  roomCode = nextState.room;
  sessionStorage.setItem("alem-chess-room", roomCode);
  try { game.load(nextState.fen); } catch { game = new Chess(); }
  if (nextState.role === "white" || nextState.role === "black") orientation = nextState.role;
  selectedSquare = null;
  renderRoom();
}

function clearRoom() {
  realtimeSocket?.close();
  realtimeSocket = null;
  realtimeConnecting = false;
  eventRoomCode = "";
  clearTimeout(eventReconnectTimer);
  roomCode = "";
  state = null;
  game = new Chess();
  sessionStorage.removeItem("alem-chess-room");
  renderRoom();
}

async function leaveRoom() {
  if (!roomCode || busy) {
    clearRoom();
    return;
  }
  busy = true;
  try {
    await api.request("/api/games/chess/action", {
      method: "POST",
      body: JSON.stringify({ room: roomCode, action: "leave" }),
    });
  } catch (error) {
    window.showMiniAppToast?.(error.message);
  } finally {
    busy = false;
    clearRoom();
  }
}

async function requestRoom(path, body) {
  if (!api || busy) return;
  busy = true;
  try {
    const result = await api.request(`/api/games/chess/${path}`, { method: "POST", body: JSON.stringify(body) });
    applyState(result.state);
    startRealtime();
  } catch (error) {
    window.showMiniAppToast?.(error.message);
    statusElement.textContent = error.message;
  } finally { busy = false; }
}

async function sync(quiet = false) {
  if (!api?.available || !roomCode || busy || syncing) return;
  syncing = true;
  try {
    const result = await api.request(`/api/games/chess/state?room=${encodeURIComponent(roomCode)}`, { cache: "no-store" });
    if (!busy && (!state || result.state.version > state.version)) applyState(result.state);
    startRealtime();
  } catch (error) {
    if (!quiet) window.showMiniAppToast?.(error.message);
    if (/bulunamadı/i.test(error.message)) clearRoom();
  } finally { syncing = false; }
}

async function startRealtime() {
  if (!api?.available || !roomCode || realtimeSocket || realtimeConnecting) return;
  realtimeConnecting = true;
  const connectedRoom = roomCode;
  eventRoomCode = connectedRoom;
  clearTimeout(eventReconnectTimer);
  try {
    const ticket = await api.request("/api/realtime/ticket", { method: "POST" });
    if (roomCode !== connectedRoom) return;
    const socket = new WebSocket(
      `wss://api.alemmuzik.com/api/games/chess/socket?room=${encodeURIComponent(connectedRoom)}&ticket=${encodeURIComponent(ticket.ticket)}`,
    );
    realtimeSocket = socket;
    socket.addEventListener("message", (event) => {
      if (roomCode !== connectedRoom) return;
      const payload = JSON.parse(event.data);
      if (payload.state && (!state || payload.state.version > state.version)) applyState(payload.state);
    });
    socket.addEventListener("close", () => {
      if (realtimeSocket === socket) {
        realtimeSocket = null;
        if (roomCode === connectedRoom) eventReconnectTimer = setTimeout(startRealtime, 1000);
      }
    });
    socket.addEventListener("error", () => socket.close());
  } catch (error) {
    console.warn("Satranç olay bağlantısı yenileniyor", error);
    if (roomCode === connectedRoom) eventReconnectTimer = setTimeout(startRealtime, 1000);
  } finally {
    realtimeConnecting = false;
  }
}

async function action(payload) {
  if (!roomCode || busy) return;
  busy = true;
  try {
    const result = await api.request("/api/games/chess/action", { method: "POST", body: JSON.stringify({ room: roomCode, ...payload }) });
    applyState(result.state);
    window.miniAppHaptic?.("medium");
  } catch (error) {
    window.showMiniAppToast?.(error.message);
  } finally { busy = false; }
}

function handleSquare(square) {
  if (!state?.started || state.game_over || state.role !== state.turn) return;
  if (!selectedSquare) {
    if (game.get(square)?.color === game.turn()) selectedSquare = square;
    renderBoard();
    return;
  }
  if (square === selectedSquare) { selectedSquare = null; renderBoard(); return; }
  if (game.moves({ square: selectedSquare, verbose: true }).some((move) => move.to === square)) {
    const source = selectedSquare;
    selectedSquare = null;
    action({ action: "move", from: source, to: square, promotion: "q" });
  } else {
    selectedSquare = game.get(square)?.color === game.turn() ? square : null;
    renderBoard();
  }
}

document.getElementById("chess-create")?.addEventListener("click", () => requestRoom("create", {}));
document.getElementById("chess-join-form")?.addEventListener("submit", (event) => {
  event.preventDefault();
  requestRoom("join", { room: document.getElementById("chess-room-input").value.trim().toUpperCase() });
});
roomCodeElement?.addEventListener("click", async () => {
  await navigator.clipboard.writeText(roomCode).catch(() => {});
  window.showMiniAppToast?.(`Oda kodu kopyalandı: ${roomCode}`);
});
document.getElementById("chess-leave")?.addEventListener("click", leaveRoom);
document.getElementById("chess-flip")?.addEventListener("click", () => { orientation = orientation === "white" ? "black" : "white"; renderBoard(); });
document.getElementById("chess-reset")?.addEventListener("click", () => action({ action: "reset" }));

renderRoom();
if (roomCode) sync();
setInterval(() => sync(true), 10000);
