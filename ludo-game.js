const boardElement = document.getElementById("ludo-board");
const statusElement = document.getElementById("ludo-status");
const turnElement = document.getElementById("ludo-turn");
const diceButton = document.getElementById("ludo-dice");
const diceValue = document.getElementById("dice-value");
const playerList = document.getElementById("ludo-players");
const playerCountSelect = document.getElementById("ludo-player-count");

const track = [
  [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7], [0, 8], [1, 8], [2, 8], [3, 8], [4, 8],
  [5, 8], [6, 9], [6, 10], [6, 11], [6, 12], [6, 13],
  [6, 14], [7, 14], [8, 14], [8, 13], [8, 12], [8, 11],
  [8, 10], [8, 9], [9, 8], [10, 8], [11, 8], [12, 8],
  [13, 8], [14, 8], [14, 7], [14, 6], [13, 6], [12, 6],
  [11, 6], [10, 6], [9, 6], [8, 5], [8, 4], [8, 3],
  [8, 2], [8, 1], [8, 0], [7, 0],
];

const playerDefinitions = [
  {
    id: 0,
    name: "Kırmızı",
    color: "red",
    offset: 0,
    yard: [[1, 1], [1, 4], [4, 1], [4, 4]],
    home: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  },
  {
    id: 1,
    name: "Yeşil",
    color: "green",
    offset: 13,
    yard: [[1, 10], [1, 13], [4, 10], [4, 13]],
    home: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  },
  {
    id: 2,
    name: "Sarı",
    color: "yellow",
    offset: 26,
    yard: [[10, 10], [10, 13], [13, 10], [13, 13]],
    home: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  },
  {
    id: 3,
    name: "Mavi",
    color: "blue",
    offset: 39,
    yard: [[10, 1], [10, 4], [13, 1], [13, 4]],
    home: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
  },
];

const safeTrackIndexes = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const diceFaces = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const cells = new Map();

let players = [];
let turnIndex = 0;
let currentRoll = null;
let movableTokens = [];
let winner = null;

const key = (row, column) => `${row},${column}`;
const trackByCell = new Map(track.map((position, index) => [key(...position), index]));
const homeByCell = new Map();
playerDefinitions.forEach((player) => {
  player.home.forEach((position) => homeByCell.set(key(...position), player.color));
});

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
      cell.dataset.row = row;
      cell.dataset.column = column;

      const yard = yardColor(row, column);
      if (yard) cell.classList.add(`yard-${yard}`);

      const trackIndex = trackByCell.get(key(row, column));
      if (trackIndex !== undefined) {
        cell.classList.add("track");
        if (safeTrackIndexes.has(trackIndex)) cell.classList.add("safe");
        const starter = playerDefinitions.find((player) => player.offset === trackIndex);
        if (starter) cell.classList.add(`start-${starter.color}`);
      }

      const homeColor = homeByCell.get(key(row, column));
      if (homeColor) cell.classList.add(`home-${homeColor}`);
      if (row === 7 && column === 7) cell.classList.add("center");

      boardElement.append(cell);
      cells.set(key(row, column), cell);
    }
  }
}

function playerIndexesForCount(count) {
  if (count === 2) return [0, 2];
  if (count === 3) return [0, 1, 2];
  return [0, 1, 2, 3];
}

function newGame() {
  const count = Number(playerCountSelect.value);
  players = playerIndexesForCount(count).map((index) => ({
    ...playerDefinitions[index],
    tokens: [-1, -1, -1, -1],
  }));
  turnIndex = 0;
  currentRoll = null;
  movableTokens = [];
  winner = null;
  diceButton.textContent = diceFaces[0];
  diceValue.textContent = "Zar at";
  statusElement.textContent = `${players[0].name} zar atsın`;
  render();
}

function tokenPosition(player, tokenIndex) {
  const progress = player.tokens[tokenIndex];
  if (progress === -1) return player.yard[tokenIndex];
  if (progress < 52) return track[(player.offset + progress) % 52];
  return player.home[progress - 52];
}

function globalTrackIndex(player, progress) {
  return (player.offset + progress) % 52;
}

function canMove(player, tokenIndex, roll) {
  const progress = player.tokens[tokenIndex];
  if (progress === -1) return roll === 6;
  if (progress >= 57) return false;
  return progress + roll <= 57;
}

function randomDice() {
  if (crypto?.getRandomValues) {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    return (value[0] % 6) + 1;
  }
  return Math.floor(Math.random() * 6) + 1;
}

function nextTurn() {
  turnIndex = (turnIndex + 1) % players.length;
}

function rollDice() {
  if (winner || currentRoll !== null) return;
  const player = players[turnIndex];
  currentRoll = randomDice();
  movableTokens = player.tokens
    .map((_, index) => index)
    .filter((index) => canMove(player, index, currentRoll));

  diceButton.textContent = diceFaces[currentRoll - 1];
  diceButton.classList.remove("rolling");
  void diceButton.offsetWidth;
  diceButton.classList.add("rolling");
  diceValue.textContent = `${currentRoll} geldi`;
  window.miniAppHaptic?.("medium");

  if (movableTokens.length === 0) {
    const rolledSix = currentRoll === 6;
    currentRoll = null;
    if (!rolledSix) nextTurn();
    const nextPlayer = players[turnIndex];
    statusElement.textContent = rolledSix
      ? `${player.name} tekrar zar atsın`
      : `Hareket yok. Sıra ${nextPlayer.name} oyuncusunda`;
  } else {
    statusElement.textContent = `${player.name}: hareket edecek parlayan taşa dokun`;
  }
  render();
}

function captureOpponents(player, progress) {
  if (progress < 0 || progress >= 52) return 0;
  const landingIndex = globalTrackIndex(player, progress);
  if (safeTrackIndexes.has(landingIndex)) return 0;

  let captured = 0;
  players.forEach((opponent) => {
    if (opponent.id === player.id) return;
    opponent.tokens.forEach((opponentProgress, tokenIndex) => {
      if (
        opponentProgress >= 0 &&
        opponentProgress < 52 &&
        globalTrackIndex(opponent, opponentProgress) === landingIndex
      ) {
        opponent.tokens[tokenIndex] = -1;
        captured += 1;
      }
    });
  });
  return captured;
}

function moveToken(playerId, tokenIndex) {
  if (winner || currentRoll === null) return;
  const player = players[turnIndex];
  if (player.id !== playerId || !movableTokens.includes(tokenIndex)) return;

  const roll = currentRoll;
  if (player.tokens[tokenIndex] === -1) player.tokens[tokenIndex] = 0;
  else player.tokens[tokenIndex] += roll;

  const captured = captureOpponents(player, player.tokens[tokenIndex]);
  const finished = player.tokens.every((progress) => progress === 57);
  currentRoll = null;
  movableTokens = [];
  window.miniAppHaptic?.(captured ? "heavy" : "medium");

  if (finished) {
    winner = player.id;
    statusElement.textContent = `${player.name} kazandı!`;
    diceValue.textContent = "Oyun bitti";
    window.showMiniAppToast?.(`🏆 ${player.name} kazandı`);
  } else if (roll === 6 || captured > 0) {
    statusElement.textContent = captured > 0
      ? `${player.name} taş yakaladı; tekrar zar atsın`
      : `${player.name} 6 attı; tekrar zar atsın`;
  } else {
    nextTurn();
    statusElement.textContent = `${players[turnIndex].name} zar atsın`;
  }
  render();
}

function tokenLayout(index, count) {
  if (count === 1) return { width: 70, left: 15, top: 15 };
  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  const width = Math.min(48, 90 / columns);
  return {
    width,
    left: 5 + (index % columns) * (90 / columns),
    top: 5 + Math.floor(index / columns) * (90 / rows),
  };
}

function renderTokens() {
  boardElement.querySelectorAll(".ludo-token").forEach((token) => token.remove());
  const grouped = new Map();

  players.forEach((player) => {
    player.tokens.forEach((_, tokenIndex) => {
      const position = tokenPosition(player, tokenIndex);
      const positionKey = key(...position);
      if (!grouped.has(positionKey)) grouped.set(positionKey, []);
      grouped.get(positionKey).push({ player, tokenIndex });
    });
  });

  grouped.forEach((tokens, positionKey) => {
    const cell = cells.get(positionKey);
    tokens.forEach(({ player, tokenIndex }, index) => {
      const token = document.createElement("button");
      const isMovable =
        currentRoll !== null &&
        players[turnIndex].id === player.id &&
        movableTokens.includes(tokenIndex);
      token.type = "button";
      token.className = `ludo-token ${player.color}${isMovable ? " movable" : ""}`;
      token.setAttribute("aria-label", `${player.name} ${tokenIndex + 1}. taş`);
      const layout = tokenLayout(index, tokens.length);
      token.style.width = `${layout.width}%`;
      token.style.left = `${layout.left}%`;
      token.style.top = `${layout.top}%`;
      token.style.position = "absolute";
      token.addEventListener("click", () => moveToken(player.id, tokenIndex));
      cell.append(token);
    });
  });
}

function renderPlayers() {
  playerList.replaceChildren();
  players.forEach((player, index) => {
    const finished = player.tokens.filter((progress) => progress === 57).length;
    const onRoad = player.tokens.filter((progress) => progress >= 0 && progress < 57).length;
    const card = document.createElement("div");
    card.className = `ludo-player ${player.color}${index === turnIndex ? " active" : ""}`;
    card.innerHTML = `<b>${player.name}</b>Yolda ${onRoad} · Bitiren ${finished}/4`;
    playerList.append(card);
  });
}

function render() {
  const currentPlayer = players[turnIndex];
  turnElement.textContent = winner !== null
    ? `${players.find((player) => player.id === winner).name} kazandı`
    : currentPlayer.name;
  turnElement.className = `turn-badge ${winner !== null
    ? players.find((player) => player.id === winner).color
    : currentPlayer.color}`;
  diceButton.disabled = winner !== null || currentRoll !== null;
  renderTokens();
  renderPlayers();
}

diceButton?.addEventListener("click", rollDice);
document.getElementById("ludo-reset")?.addEventListener("click", () => {
  newGame();
  window.miniAppHaptic?.("medium");
});

buildBoard();
newGame();
