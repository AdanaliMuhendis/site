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
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
}

function openLink(key) {
  const url = links[key];
  if (!url) return;
  if (tg?.openTelegramLink && url.startsWith("https://t.me/")) {
    tg.openTelegramLink(url);
    return;
  }
  if (tg?.openLink) {
    tg.openLink(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

function applyTelegramTheme() {
  if (!tg) return;
  tg.ready();
  tg.expand();
  const params = tg.themeParams || {};
  if (params.bg_color) document.documentElement.style.setProperty("--bg", params.bg_color);
  if (params.text_color) document.documentElement.style.setProperty("--text", params.text_color);
  if (params.hint_color) document.documentElement.style.setProperty("--muted", params.hint_color);
}

document.querySelectorAll("[data-open]").forEach((button) => {
  button.addEventListener("click", () => openLink(button.dataset.open));
});

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.tab)?.classList.add("active");
    tg?.HapticFeedback?.selectionChanged?.();
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
    tg?.HapticFeedback?.impactOccurred?.("light");
  });
});

applyTelegramTheme();
