const api = window.miniAppApi;
const boardElement = document.getElementById("ludo-board");
const statusElement = document.getElementById("ludo-status");
const turnElement = document.getElementById("ludo-turn");
const diceButton = document.getElementById("ludo-dice");
const diceValue = document.getElementById("dice-value");
const playerList = document.getElementById("ludo-players");
const roomPlayers = document.getElementById("ludo-room-players");
const roomCard = document.getElementById("ludo-room-card");
const roomCodeElement = document.getElementById("ludo-room-code");
const onlineNote = document.getElementById("ludo-online");
const startButton = document.getElementById("ludo-start");
const createRow = document.querySelector("#ludo-lobby .room-create-row");
const lobby = document.getElementById("ludo-lobby");
const modeSelect = document.getElementById("ludo-mode");
const playerCountSelect = document.getElementById("ludo-player-count");
const teamBanner = document.getElementById("ludo-team-banner");
const timerElement = document.getElementById("ludo-timer");
const lastRollElement = document.getElementById("ludo-last-roll");
const boardNames = Object.fromEntries(["red", "green", "yellow", "blue"].map((color) => [color, document.getElementById(`ludo-board-name-${color}`)]));

const track = [
  [6,0],[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],
  [0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],
  [8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],
  [14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],
];
const definitions = {
  red: { name: "Kırmızı", offset: 0, yard: [[1,1],[1,4],[4,1],[4,4]], home: [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]] },
  green: { name: "Yeşil", offset: 13, yard: [[1,10],[1,13],[4,10],[4,13]], home: [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]] },
  yellow: { name: "Sarı", offset: 26, yard: [[10,10],[10,13],[13,10],[13,13]], home: [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]] },
  blue: { name: "Mavi", offset: 39, yard: [[10,1],[10,4],[13,1],[13,4]], home: [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]] },
};
const safeTrackIndexes = new Set([0,8,13,21,26,34,39,47]);
const diceFaces = ["⚀","⚁","⚂","⚃","⚄","⚅"];
const cells = new Map();
const key = (row, column) => `${row},${column}`;
const trackByCell = new Map(track.map((position, index) => [key(...position), index]));
const homeByCell = new Map();
Object.entries(definitions).forEach(([color, definition]) => definition.home.forEach((position) => homeByCell.set(key(...position), color)));
const yardSlots = new Set(Object.values(definitions).flatMap((definition) => definition.yard.map((position) => key(...position))));

let state = null;
let roomCode = sessionStorage.getItem("alem-ludo-room") || "";
let busy = false;
let serverClockOffset = 0;

function initials(name) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
}

function yardColor(row, column) {
  if (row < 6 && column < 6) return "red";
  if (row < 6 && column > 8) return "green";
  if (row > 8 && column > 8) return "yellow";
  if (row > 8 && column < 6) return "blue";
  return null;
}

function buildBoard() {
  boardElement.replaceChildren();
  cells.clear();
  for (let row = 0; row < 15; row += 1) for (let column = 0; column < 15; column += 1) {
    const cell = document.createElement("div");
    cell.className = "ludo-cell";
    const yard = yardColor(row, column);
    if (yard) cell.classList.add(`yard-${yard}`);
    if (yardSlots.has(key(row, column))) cell.classList.add("yard-slot");
    const trackIndex = trackByCell.get(key(row, column));
    if (trackIndex !== undefined) {
      cell.classList.add("track");
      if (safeTrackIndexes.has(trackIndex)) cell.classList.add("safe");
      const starter = Object.entries(definitions).find(([, item]) => item.offset === trackIndex);
      if (starter) cell.classList.add(`start-${starter[0]}`);
    }
    const homeColor = homeByCell.get(key(row, column));
    if (homeColor) cell.classList.add(`home-${homeColor}`);
    if (row === 7 && column === 7) cell.classList.add("center");
    boardElement.append(cell);
    cells.set(key(row, column), cell);
  }
}

function tokenPosition(player, tokenIndex) {
  const definition = definitions[player.color];
  const progress = player.tokens[tokenIndex];
  if (progress === -1) return definition.yard[tokenIndex];
  if (progress < 52) return track[(player.offset + progress) % 52];
  return definition.home[progress - 52];
}

function tokenLayout(index, count) {
  if (count === 1) return { width: 78, left: 11, top: 11 };
  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  return { width: Math.min(52, 94 / columns), left: 3 + (index % columns) * (94 / columns), top: 3 + Math.floor(index / columns) * (94 / rows) };
}

function statusText() {
  if (!api?.available) return "Mini App'i Telegram içinden açın.";
  if (!roomCode) return "Oyuncu sayısını seçip oda oluştur veya bir oda koduyla katıl.";
  if (!state) return "Odaya bağlanıyor…";
  if (!state.started) return state.players.length === state.required_players ? "Tüm oyuncular hazır. Oda sahibi başlatabilir." : `${state.required_players - state.players.length} oyuncu daha bekleniyor.`;
  if (state.winner_team) return `Takım ${state.winner_team} kazandı!`;
  if (state.winner_id) return `${state.players.find((player) => player.id === state.winner_id)?.name || "Oyuncu"} kazandı!`;
  const current = state.players.find((player) => player.id === state.turn_user_id);
  return state.current_roll !== null ? `${current?.name}: parlayan taşlardan birini seç.` : `${current?.name || "Oyuncu"} zar atsın.`;
}

function renderTokens() {
  boardElement.querySelectorAll(".ludo-token").forEach((token) => token.remove());
  if (!state?.started) return;
  const grouped = new Map();
  state.players.forEach((player) => player.tokens.forEach((_, tokenIndex) => {
    const positionKey = key(...tokenPosition(player, tokenIndex));
    if (!grouped.has(positionKey)) grouped.set(positionKey, []);
    grouped.get(positionKey).push({ player, tokenIndex });
  }));
  grouped.forEach((tokens, positionKey) => {
    const cell = cells.get(positionKey);
    tokens.forEach(({ player, tokenIndex }, index) => {
      const movable = state.you_id === state.turn_user_id && player.id === state.you_id && state.movable_tokens.includes(tokenIndex);
      const token = document.createElement("button");
      token.type = "button";
      token.className = `ludo-token ${player.color}${movable ? " movable" : ""}`;
      token.setAttribute("aria-label", `${player.name} ${tokenIndex + 1}. taş`);
      const layout = tokenLayout(index, tokens.length);
      Object.assign(token.style, { width: `${layout.width}%`, left: `${layout.left}%`, top: `${layout.top}%`, position: "absolute" });
      if (movable) token.addEventListener("click", () => action({ action: "move", token: tokenIndex }));
      cell.append(token);
    });
  });
}

function renderGamePlayers() {
  playerList.replaceChildren();
  (state?.players || []).forEach((player) => {
    const finished = player.tokens.filter((progress) => progress === 57).length;
    const onRoad = player.tokens.filter((progress) => progress >= 0 && progress < 57).length;
    const card = document.createElement("div");
    card.className = `ludo-player ${player.color || "waiting"}${player.id === state.turn_user_id ? " active" : ""}`;
    const team = state.mode === "teams" ? ` · Takım ${player.team}` : "";
    const name = document.createElement("b");
    name.textContent = `${player.name}${player.id === state.you_id ? " (Sen)" : ""}`;
    const summary = document.createElement("span");
    summary.textContent = state.started ? `${definitions[player.color]?.name || ""}${team} · Yolda ${onRoad} · Bitiş ${finished}/4` : "Hazır";
    card.append(name, summary);
    playerList.append(card);
  });
}

function renderRoomPlayers() {
  roomPlayers.replaceChildren();
  if (!state) return;
  (state?.players || []).forEach((player, index) => {
    const card = document.createElement("div");
    card.className = `room-player ${player.color || "waiting"}`;
    const avatar = document.createElement(player.photo_url ? "img" : "span");
    avatar.className = "player-avatar";
    if (player.photo_url) { avatar.src = player.photo_url; avatar.alt = ""; avatar.referrerPolicy = "no-referrer"; }
    else avatar.textContent = initials(player.name);
    const details = document.createElement("div");
    const waitingTeam = state.mode === "teams" ? ` · Takım ${index % 2 === 0 ? "A" : "B"}` : "";
    const name = document.createElement("b");
    name.textContent = `${player.name}${player.id === state.you_id ? " (Sen)" : ""}`;
    const role = document.createElement("span");
    role.textContent = `${index === 0 ? "Oda sahibi" : `Oyuncu ${index + 1}`}${waitingTeam}`;
    details.append(name, role);
    card.append(avatar, details);
    roomPlayers.append(card);
  });
  for (let index = state?.players?.length || 0; index < (state?.required_players || 0); index += 1) {
    const empty = document.createElement("div");
    empty.className = "room-player empty";
    empty.innerHTML = `<span class="player-avatar">+</span><div><b>Oyuncu bekleniyor</b><span>Oda kodunu paylaş</span></div>`;
    roomPlayers.append(empty);
  }
}

function renderBoardNames() {
  Object.values(boardNames).forEach((element) => { if (element) element.textContent = ""; });
  (state?.players || []).forEach((player) => {
    if (player.color && boardNames[player.color]) boardNames[player.color].textContent = player.name;
  });
}

function renderTimer() {
  if (!state?.started || !state.turn_deadline || state.winner_id || state.winner_team) {
    timerElement.textContent = "--";
    return;
  }
  const serverNow = (Date.now() / 1000) + serverClockOffset;
  timerElement.textContent = `${Math.max(0, Math.ceil(state.turn_deadline - serverNow))}s`;
}

function renderLastRoll() {
  const player = state?.players?.find((candidate) => candidate.id === state.last_roll_user_id);
  if (!player || !state.last_roll) {
    lastRollElement.hidden = true;
    return;
  }
  lastRollElement.hidden = false;
  lastRollElement.className = `ludo-last-roll ${player.color || ""}`;
  const face = document.createElement("span");
  face.className = "last-dice";
  face.textContent = diceFaces[state.last_roll - 1];
  const details = document.createElement("div");
  const name = document.createElement("b");
  name.textContent = player.name;
  const result = document.createElement("strong");
  result.textContent = `${state.last_roll} attı`;
  details.append(name, result);
  lastRollElement.replaceChildren(face, details);
}

function render() {
  const joined = Boolean(roomCode && state);
  lobby.hidden = Boolean(state?.started);
  roomCard.hidden = !joined;
  createRow.hidden = joined;
  const roomCodeText = roomCodeElement.querySelector("strong");
  if (roomCodeText) roomCodeText.textContent = roomCode || "------";
  onlineNote.textContent = joined ? `♙ ${state.players.length}/${state.required_players} oyuncu` : "♙ Oda yok";
  startButton.hidden = !joined || state.started || state.host_id !== state.you_id;
  startButton.disabled = !joined || state.players.length !== state.required_players;
  const current = state?.players?.find((player) => player.id === state.turn_user_id);
  const winner = state?.players?.find((player) => player.id === state.winner_id);
  const teamWinner = state?.winner_team ? `Takım ${state.winner_team} kazandı` : "";
  turnElement.textContent = teamWinner || (winner ? `${winner.name} kazandı` : current?.name || "Oda bekliyor");
  turnElement.className = `turn-badge ${winner?.color || current?.color || ""}`;
  teamBanner.hidden = state?.mode !== "teams";
  statusElement.textContent = statusText();
  diceButton.textContent = state?.current_roll ? diceFaces[state.current_roll - 1] : diceFaces[0];
  diceValue.textContent = state?.current_roll ? `${state.current_roll} geldi` : "Zar at";
  diceButton.disabled = busy || !state?.started || Boolean(state.winner_id || state.winner_team) || state.current_roll !== null || state.turn_user_id !== state.you_id;
  renderTokens();
  renderGamePlayers();
  renderRoomPlayers();
  renderBoardNames();
  renderTimer();
  renderLastRoll();
}

function applyState(nextState) {
  state = nextState;
  if (Number.isFinite(nextState.server_time)) serverClockOffset = nextState.server_time - (Date.now() / 1000);
  roomCode = nextState.room;
  sessionStorage.setItem("alem-ludo-room", roomCode);
  render();
}

function leaveRoom() {
  roomCode = "";
  state = null;
  sessionStorage.removeItem("alem-ludo-room");
  render();
}

async function roomRequest(path, body) {
  if (!api?.available || busy) return;
  busy = true;
  try {
    const result = await api.request(`/api/games/ludo/${path}`, { method: "POST", body: JSON.stringify(body) });
    applyState(result.state);
  } catch (error) {
    window.showMiniAppToast?.(error.message);
    statusElement.textContent = error.message;
  } finally { busy = false; render(); }
}

async function sync(quiet = false) {
  if (!api?.available || !roomCode || busy) return;
  busy = true;
  try {
    const result = await api.request(`/api/games/ludo/state?room=${encodeURIComponent(roomCode)}`);
    if (!state || result.state.version !== state.version) applyState(result.state);
  } catch (error) {
    if (!quiet) window.showMiniAppToast?.(error.message);
    if (/bulunamadı/i.test(error.message)) leaveRoom();
  } finally { busy = false; render(); }
}

async function action(payload) {
  if (!roomCode || busy) return;
  busy = true;
  try {
    const result = await api.request("/api/games/ludo/action", { method: "POST", body: JSON.stringify({ room: roomCode, ...payload }) });
    applyState(result.state);
    window.miniAppHaptic?.("medium");
  } catch (error) { window.showMiniAppToast?.(error.message); }
  finally { busy = false; render(); }
}

document.getElementById("ludo-create")?.addEventListener("click", () => roomRequest("create", {
  players: Number(playerCountSelect.value),
  mode: modeSelect.value,
}));
document.getElementById("ludo-join-form")?.addEventListener("submit", (event) => {
  event.preventDefault();
  roomRequest("join", { room: document.getElementById("ludo-room-input").value.trim().toUpperCase() });
});
roomCodeElement?.addEventListener("click", async () => {
  await navigator.clipboard.writeText(roomCode).catch(() => {});
  window.showMiniAppToast?.(`Oda kodu kopyalandı: ${roomCode}`);
});
document.getElementById("ludo-leave")?.addEventListener("click", leaveRoom);
diceButton?.addEventListener("click", () => {
  diceButton.classList.remove("rolling");
  void diceButton.offsetWidth;
  diceButton.classList.add("rolling");
  action({ action: "roll" });
});
startButton?.addEventListener("click", () => action({ action: "start" }));
modeSelect?.addEventListener("change", () => {
  const teams = modeSelect.value === "teams";
  if (teams) playerCountSelect.value = "4";
  playerCountSelect.disabled = teams;
});

buildBoard();
render();
if (roomCode) sync();
setInterval(() => sync(true), 1800);
setInterval(renderTimer, 250);
