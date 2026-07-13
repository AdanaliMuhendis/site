const api = window.miniAppApi;
const boardElement = document.getElementById("ludo-board");
const statusElement = document.getElementById("ludo-status");
const turnElement = document.getElementById("ludo-turn");
const diceButton = document.getElementById("ludo-dice");
const diceValue = document.getElementById("dice-value");
const playerList = document.getElementById("ludo-players");
const onlineNote = document.getElementById("ludo-online");
const startButton = document.getElementById("ludo-start");

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
const safeTrackIndexes = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const diceFaces = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const cells = new Map();
const key = (row, column) => `${row},${column}`;
const trackByCell = new Map(track.map((position, index) => [key(...position), index]));
const homeByCell = new Map();
Object.entries(definitions).forEach(([color, definition]) => {
  definition.home.forEach((position) => homeByCell.set(key(...position), color));
});

let state = null;
let busy = false;

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
  for (let row = 0; row < 15; row += 1) {
    for (let column = 0; column < 15; column += 1) {
      const cell = document.createElement("div");
      cell.className = "ludo-cell";
      const yard = yardColor(row, column);
      if (yard) cell.classList.add(`yard-${yard}`);
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
}

function tokenPosition(player, tokenIndex) {
  const definition = definitions[player.color];
  const progress = player.tokens[tokenIndex];
  if (progress === -1) return definition.yard[tokenIndex];
  if (progress < 52) return track[(player.offset + progress) % 52];
  return definition.home[progress - 52];
}

function tokenLayout(index, count) {
  if (count === 1) return { width: 70, left: 15, top: 15 };
  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  return { width: Math.min(48, 90 / columns), left: 5 + (index % columns) * (90 / columns), top: 5 + Math.floor(index / columns) * (90 / rows) };
}

function statusText() {
  if (!api?.available) return "Mini App'i Telegram grubundaki /oyun bağlantısından açın.";
  if (!state) return "Grup odasına bağlanıyor…";
  if (!state.started) return state.players.length < 2
    ? "Başlamak için en az bir grup arkadaşının katılması gerekiyor."
    : "Oda sahibi oyunu başlatabilir.";
  if (state.winner_id) return `${state.players.find((p) => p.id === state.winner_id)?.name || "Oyuncu"} kazandı!`;
  const current = state.players.find((p) => p.id === state.turn_user_id);
  if (state.current_roll !== null) return `${current?.name}: parlayan taşlardan birini seç.`;
  return `${current?.name || "Oyuncu"} zar atsın.`;
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

function renderPlayers() {
  playerList.replaceChildren();
  (state?.players || []).forEach((player) => {
    const finished = player.tokens.filter((progress) => progress === 57).length;
    const onRoad = player.tokens.filter((progress) => progress >= 0 && progress < 57).length;
    const card = document.createElement("div");
    const color = player.color || "waiting";
    card.className = `ludo-player ${color}${player.id === state.turn_user_id ? " active" : ""}`;
    card.innerHTML = `<b>${player.name}${player.id === state.you_id ? " (Sen)" : ""}</b>${state.started ? `Yolda ${onRoad} · Bitiren ${finished}/4` : "Oyuna hazır"}`;
    playerList.append(card);
  });
}

function render() {
  const current = state?.players?.find((player) => player.id === state.turn_user_id);
  const winner = state?.players?.find((player) => player.id === state.winner_id);
  const color = winner?.color || current?.color || "";
  turnElement.textContent = winner ? `${winner.name} kazandı` : current?.name || "Çevrim içi";
  turnElement.className = `turn-badge ${color}`;
  statusElement.textContent = statusText();
  onlineNote.textContent = state ? `${state.players.length}/4 oyuncu · ${state.role === "spectator" ? "İzleyici" : "Odadasın"}` : "Odaya bağlanıyor…";
  startButton.hidden = !state || state.started || state.host_id !== state.you_id;
  diceButton.textContent = state?.current_roll ? diceFaces[state.current_roll - 1] : diceFaces[0];
  diceValue.textContent = state?.current_roll ? `${state.current_roll} geldi` : "Zar at";
  diceButton.disabled = busy || !state?.started || state.winner_id !== null || state.current_roll !== null || state.turn_user_id !== state.you_id;
  renderTokens();
  renderPlayers();
}

function applyState(nextState) {
  state = nextState;
  render();
}

async function sync(join = false, quiet = false) {
  if (!api?.available || busy) return;
  busy = true;
  try {
    const payload = await api.request(`/api/games/ludo/${join ? "join" : "state"}`, { method: join ? "POST" : "GET" });
    if (!state || payload.state.version !== state.version) applyState(payload.state);
  } catch (error) {
    statusElement.textContent = error.message;
    if (!quiet) window.showMiniAppToast?.(error.message);
  } finally {
    busy = false;
    render();
  }
}

async function action(payload) {
  if (busy) return;
  busy = true;
  try {
    const result = await api.request("/api/games/ludo/action", { method: "POST", body: JSON.stringify(payload) });
    applyState(result.state);
    window.miniAppHaptic?.("medium");
  } catch (error) {
    window.showMiniAppToast?.(error.message);
  } finally {
    busy = false;
    render();
  }
}

diceButton?.addEventListener("click", () => action({ action: "roll" }));
startButton?.addEventListener("click", () => action({ action: "start" }));
buildBoard();
render();
sync(true);
setInterval(() => sync(false, true), 1800);
