const tg = window.Telegram?.WebApp;

const links = {
  bot: "https://t.me/AlemMuzikBot",
  support: "https://t.me/AlemSupport",
  channel: "https://t.me/AlemMuzik",
  community: "https://t.me/Alemciyiz",
};

const toast = document.getElementById("toast");
let toastTimer;

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function haptic(style = "light") {
  tg?.HapticFeedback?.impactOccurred?.(style);
}

window.showMiniAppToast = showToast;
window.miniAppHaptic = haptic;

function openLink(key) {
  const url = links[key];
  if (!url) return;
  if (tg?.openTelegramLink && url.startsWith("https://t.me/")) {
    tg.openTelegramLink(url);
  } else if (tg?.openLink) {
    tg.openLink(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

function applyTelegramTheme() {
  if (!tg) return;
  tg.ready();
  tg.expand();
  tg.disableVerticalSwipes?.();
  const params = tg.themeParams || {};
  if (params.bg_color) document.documentElement.style.setProperty("--bg", params.bg_color);
  if (params.text_color) document.documentElement.style.setProperty("--text", params.text_color);
  if (params.hint_color) document.documentElement.style.setProperty("--muted", params.hint_color);
}

document.querySelectorAll("[data-open]").forEach((button) => {
  button.addEventListener("click", () => openLink(button.dataset.open));
});

function activateTab(name, updateHash = true) {
  if (!["music", "chess", "ludo", "menu"].includes(name)) return;
  const tab = document.querySelector(`.tab[data-tab="${name}"]`);
  const panel = document.getElementById(name);
  if (!tab || !panel) return;
  document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
  document.querySelectorAll(".panel").forEach((item) => item.classList.remove("active"));
  tab.classList.add("active");
  panel.classList.add("active");
  if (updateHash) history.replaceState(null, "", `#${name}`);
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    activateTab(tab.dataset.tab);
    tg?.HapticFeedback?.selectionChanged?.();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    const value = button.dataset.copy;
    try {
      await navigator.clipboard.writeText(value);
      showToast("Komut kopyalandı");
    } catch {
      showToast(value);
    }
    haptic();
  });
});

const player = document.getElementById("music-player");
const trackTitle = document.getElementById("track-title");
const liveBadge = document.querySelector(".live-badge");
let activeStation = null;

async function playStream(url, name) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    showToast("Geçerli bir yayın adresi girin");
    return;
  }
  if (parsed.protocol !== "https:") {
    showToast("Yayın adresi HTTPS olmalı");
    return;
  }

  document.querySelectorAll(".station").forEach((item) => item.classList.remove("playing"));
  activeStation?.classList.add("playing");
  trackTitle.textContent = name;
  liveBadge.classList.add("connecting");
  liveBadge.lastChild.textContent = " Bağlanıyor";
  player.src = url;
  player.load();

  try {
    await player.play();
    haptic("medium");
  } catch {
    liveBadge.classList.remove("connecting");
    liveBadge.lastChild.textContent = " Hazır";
    showToast("Yayın başlatılamadı; başka istasyon deneyin");
  }
}

document.querySelectorAll(".station").forEach((station) => {
  station.addEventListener("click", () => {
    activeStation = station;
    playStream(station.dataset.stream, station.dataset.name);
  });
});

document.getElementById("stream-form")?.addEventListener("submit", (event) => {
  event.preventDefault();
  activeStation = null;
  const input = document.getElementById("stream-url");
  playStream(input.value.trim(), "Özel yayın");
});

document.getElementById("stop-music")?.addEventListener("click", () => {
  player.pause();
  player.removeAttribute("src");
  player.load();
  activeStation?.classList.remove("playing");
  activeStation = null;
  trackTitle.textContent = "Bir istasyon seç";
  liveBadge.classList.remove("connecting", "on-air");
  liveBadge.lastChild.textContent = " Hazır";
  haptic();
});

player?.addEventListener("playing", () => {
  liveBadge.classList.remove("connecting");
  liveBadge.classList.add("on-air");
  liveBadge.lastChild.textContent = " Yayında";
  if ("mediaSession" in navigator && "MediaMetadata" in window) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: trackTitle.textContent,
      artist: "Alem Müzik Mini App",
      artwork: [{ src: "./assets/alem-muzik-profile.png", sizes: "512x512", type: "image/png" }],
    });
  }
});

player?.addEventListener("error", () => {
  liveBadge.classList.remove("connecting", "on-air");
  liveBadge.lastChild.textContent = " Hata";
  activeStation?.classList.remove("playing");
  showToast("Bu radyo yayını şu anda açılamıyor");
});

const initialTab = location.hash.slice(1);
if (initialTab) {
  activateTab(initialTab, false);
  requestAnimationFrame(() => window.scrollTo(0, 0));
}
applyTelegramTheme();
