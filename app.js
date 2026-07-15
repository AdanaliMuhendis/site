const tg = window.Telegram?.WebApp;
const API_BASE = "https://api.alemmuzik.com";

function activeTelegramApp() {
  return window.Telegram?.WebApp;
}

const links = {
  bot: "https://t.me/AlemMuzikBot",
  support: "https://t.me/QuantumQuillCoder",
  channel: "https://t.me/AlemMuzik",
  community: "https://t.me/Alemciyiz",
};

const RADIO_STATIONS = [
  ["Alem FM", "https://alemfm.radyotvonline.net/alemfmaac"],
  ["Joy FM", "https://playerservices.streamtheworld.com/api/livestream-redirect/JOYTURK_AKUSTIK128AAC.aac?/;stream.mp3"],
  ["Genç FM", "https://gsbradyo.ercdn.net/gsbradyo/gsbradyo.m3u8"],
  ["Radyo 7", "https://moondigitaledge2.radyotvonline.net/radyo7arabesk/playlist.m3u8"],
  ["Power Türk", "https://live.powerapp.com.tr/powerturk/abr/playlist.m3u8"],
  ["Power Love", "https://listen.powerapp.com.tr/powerlove/abr/playlist.m3u8"],
  ["Slow Türk", "https://radyo.duhnet.tv/ak_dtvh_slowturk"],
  ["Kral FM", "https://dygedge2.radyotvonline.net/kralfm/playlist.m3u8"],
  ["Kral Pop", "https://dygedge.radyotvonline.net/kralpop/playlist.m3u8"],
  ["Number1", "https://eustr75.mediatriple.net//Number1Media/01_Number1Fm.stream/playlist.m3u8"],
  ["Number1 Türk", "https://eustr75.mediatriple.net/Number1Media/00_Number1_Turk_FM.stream/playlist.m3u8"],
  ["Baba Radyo", "https://edge1.radyotvonline.net/shoutcast/play/babaradyo?/;stream.mp3"],
  ["Radyo D", "https://moondigitaledge2.radyotvonline.net/radyod/playlist.m3u8"],
  ["Seymen", "https://yayin.radyoseymen.com.tr:1070/stream?/;stream.mp3"],
  ["Süper FM", "https://playerservices.streamtheworld.com/api/livestream-redirect/SUPER_FM_ITUNES.mp3"],
  ["Virgin", "https://playerservices.streamtheworld.com/api/livestream-redirect/VIRGIN_RADIO_ITUNES.mp3"],
  ["Sesiniz", "https://kesintisizyayin.com:1656/stream?type=http&nocache=4"],
  ["Radyo 45'lik", "https://stream.radyo45lik.com:4545/stream"],
  ["90's FM", "https://listen.radyotvonline.net/hls/play/show_90lar.m3u8"],
  ["Aturka", "https://yayin.jumboserver.net:9100/stream?/;stream.mp3"],
  ["Aşk FM", "https://stream.netradyom.com/radio/8000/radio.mp3?/;stream.mp3"],
  ["Vturka", "https://listen.radyotvonline.net/hls/play/viva_turca.m3u8"],
  ["Romantik", "https://radyo.yayin.com.tr:6042/stream?/;stream.mp3"],
  ["Metro FM", "https://playerservices.streamtheworld.com/api/livestream-redirect/METRO_FM128AAC.aac?/;stream.mp3"],
  ["Fenomen", "https://live.radyofenomen.com/fenomen/128/icecast.audio?/;stream.mp3"],
  ["Arabesk", "https://moondigitaledge2.radyotvonline.net/radyo7arabesk/playlist.m3u8"],
  ["Efkar", "https://playerservices.streamtheworld.com/api/livestream-redirect/EFKAR128AAC.aac?/;stream.mp3"],
  ["Mydonose", "https://playerservices.streamtheworld.com/api/livestream-redirect/RADIO_MYDONOSE128AAC.aac?/;stream.mp3"],
  ["Slow Hits", "https://playerservices.streamtheworld.com/api/livestream-redirect/SC030_SO1AAC.aac?/;stream.mp3"],
  ["Banko", "https://stream.netradyom.com/listen/radyobanko/radio.mp3/;stream.mp3"],
  ["Bayram", "https://sslyayin.netyayin.net/3442/stream/;stream.mp3"],
  ["Kalp FM", "https://yayin.kalpfm.com:8080/stream?/;stream.mp3"],
  ["Kafa FM", "https://moondigitaledge2.radyotvonline.net/kafaradyo/playlist.m3u8"],
  ["Diyanet", "https://eustr76.mediatriple.net/videoonlylive/mtikoimxnztxlive/broadcast_5e3c1171d7d2a.smil/playlist.m3u8"],
];

const TV_CHANNELS = [
  ["TRT 1", "https://tv-trt1.medya.trt.com.tr/master.m3u8"],
  ["TRT Haber", "https://tv-trthaber.medya.trt.com.tr/master_360.m3u8"],
  ["TRT Müzik", "https://tv-trtmuzik.medya.trt.com.tr/master.m3u8"],
  ["TRT Çocuk", "https://tv-trtcocuk.medya.trt.com.tr/master_720.m3u8"],
  ["TV8", "https://tv8.daioncdn.net/tv8/tv8_360p.m3u8"],
  ["TV8,5", "https://rkhubpaomb.turknet.ercdn.net/fwjkgpasof/tv8bucuk/tv8bucuk.m3u8"],
  ["Beyaz TV", "https://beyaztv-live.daioncdn.net/beyaztv/beyaztv.m3u8"],
  ["Halk TV", "https://halktv-live.daioncdn.net/halktv/halktv_360p.m3u8"],
  ["Ekol TV", "https://ekoltv-live.ercdn.net/ekoltv/ekoltv_360p.m3u8"],
  ["Minika GO", "https://rnttwmjcin.turknet.ercdn.net/lcpmvefbyo/minikago/minikago_480p.m3u8"],
];

const toast = document.getElementById("toast");
let toastTimer;

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
}

function haptic(style = "light") {
  tg?.HapticFeedback?.impactOccurred?.(style);
}

async function apiRequest(path, options = {}) {
  let initData = activeTelegramApp()?.initData;
  if (!initData) {
    const deadline = Date.now() + 2500;
    while (!initData && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      initData = activeTelegramApp()?.initData;
    }
  }
  if (!initData) throw new Error("Mini App'i Telegram grubundaki bağlantıdan açın.");
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `tma ${initData}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Sunucu isteği tamamlanamadı.");
  return payload;
}

window.showMiniAppToast = showToast;
window.miniAppHaptic = haptic;
window.miniAppApi = {
  request: apiRequest,
  get available() { return Boolean(activeTelegramApp()?.initData); },
};

function openLink(key) {
  const url = links[key];
  if (!url) return;
  if (tg?.openTelegramLink && url.startsWith("https://t.me/")) tg.openTelegramLink(url);
  else if (tg?.openLink) tg.openLink(url);
  else window.open(url, "_blank", "noopener,noreferrer");
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
  if (!["music", "tv", "chess", "ludo", "menu"].includes(name)) return;
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
const stationGrid = document.getElementById("station-grid");
const searchStatus = document.getElementById("music-search-status");
const tvPlayer = document.getElementById("tv-player");
const tvTitle = document.getElementById("tv-title");
const tvGrid = document.getElementById("tv-grid");
const tvLiveBadge = document.getElementById("tv-live-badge");
let activeStation = null;
let hls = null;
let tvHls = null;
let trackObjectUrl = null;

function destroyHls() {
  hls?.destroy();
  hls = null;
}

function releaseTrackObjectUrl() {
  if (trackObjectUrl) URL.revokeObjectURL(trackObjectUrl);
  trackObjectUrl = null;
}

function destroyTvHls() {
  tvHls?.destroy();
  tvHls = null;
}

async function playStream(url, name) {
  tvPlayer?.pause();
  destroyHls();
  document.querySelectorAll(".station").forEach((item) => item.classList.remove("playing"));
  activeStation?.classList.add("playing");
  trackTitle.textContent = name;
  liveBadge.classList.add("connecting");
  liveBadge.lastChild.textContent = " Bağlanıyor";

  const isHls = /\.m3u8(?:$|\?)/i.test(url);
  if (isHls && window.Hls?.isSupported()) {
    hls = new window.Hls({ enableWorker: true, lowLatencyMode: true });
    hls.loadSource(url);
    hls.attachMedia(player);
  } else {
    player.src = url;
    player.load();
  }

  try {
    await player.play();
    haptic("medium");
  } catch {
    liveBadge.classList.remove("connecting");
    liveBadge.lastChild.textContent = " Hazır";
    showToast("Yayın başlatılamadı; başka istasyon deneyin");
  }
}

async function playTvStream(url, name, button) {
  destroyTvHls();
  destroyHls();
  player?.pause();
  document.querySelectorAll(".tv-channel").forEach((item) => item.classList.remove("playing"));
  button.classList.add("playing");
  tvTitle.textContent = name;
  tvLiveBadge.classList.add("connecting");
  tvLiveBadge.classList.remove("on-air");
  tvLiveBadge.lastChild.textContent = " Bağlanıyor";

  if (window.Hls?.isSupported()) {
    tvHls = new window.Hls({ enableWorker: true, lowLatencyMode: true });
    tvHls.loadSource(url);
    tvHls.attachMedia(tvPlayer);
  } else {
    tvPlayer.src = url;
    tvPlayer.load();
  }

  try {
    await tvPlayer.play();
    haptic("medium");
  } catch {
    tvLiveBadge.classList.remove("connecting");
    tvLiveBadge.lastChild.textContent = " Hazır";
    showToast("TV yayını başlatılamadı; başka kanal deneyin");
  }
}

TV_CHANNELS.forEach(([name, stream]) => {
  const channel = document.createElement("button");
  channel.type = "button";
  channel.className = "tv-channel";
  channel.innerHTML = `<span>▶</span><b>${name}</b><small>Canlı yayın</small>`;
  channel.addEventListener("click", () => playTvStream(stream, name, channel));
  tvGrid?.append(channel);
});

document.getElementById("stop-tv")?.addEventListener("click", () => {
  destroyTvHls();
  tvPlayer.pause();
  tvPlayer.removeAttribute("src");
  tvPlayer.load();
  document.querySelectorAll(".tv-channel").forEach((item) => item.classList.remove("playing"));
  tvTitle.textContent = "Bir kanal seç";
  tvLiveBadge.classList.remove("connecting", "on-air");
  tvLiveBadge.lastChild.textContent = " Hazır";
});

tvPlayer?.addEventListener("playing", () => {
  tvLiveBadge.classList.remove("connecting");
  tvLiveBadge.classList.add("on-air");
  tvLiveBadge.lastChild.textContent = " Canlı";
});

tvPlayer?.addEventListener("error", () => {
  tvLiveBadge.classList.remove("connecting", "on-air");
  tvLiveBadge.lastChild.textContent = " Hata";
  showToast("Bu TV yayını şu anda açılamıyor");
});

RADIO_STATIONS.forEach(([name, stream]) => {
  const station = document.createElement("button");
  station.type = "button";
  station.className = "station";
  station.innerHTML = `<b>${name}</b><span>Canlı radyo</span>`;
  station.addEventListener("click", () => {
    releaseTrackObjectUrl();
    activeStation = station;
    playStream(stream, name);
  });
  stationGrid.append(station);
});

document.getElementById("music-search-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button");
  const query = document.getElementById("music-query").value.trim();
  button.disabled = true;
  searchStatus.textContent = "Şarkı hazırlanıyor; bu işlem kısa bir süre alabilir…";
  try {
    const payload = await apiRequest("/api/music/search", {
      method: "POST",
      body: JSON.stringify({ query }),
    });
    searchStatus.textContent = "Şarkı uygulamaya yükleniyor…";
    const mediaResponse = await fetch(payload.track.media_url, { cache: "no-store" });
    if (!mediaResponse.ok) throw new Error("Şarkı dosyası alınamadı.");
    const audioBlob = await mediaResponse.blob();
    if (!audioBlob.size || (!audioBlob.type.startsWith("audio/") && audioBlob.type !== "application/octet-stream")) {
      throw new Error("Geçerli bir ses dosyası alınamadı.");
    }
    releaseTrackObjectUrl();
    trackObjectUrl = URL.createObjectURL(audioBlob.type.startsWith("audio/")
      ? audioBlob
      : new Blob([audioBlob], { type: "audio/mpeg" }));
    activeStation = null;
    await playStream(trackObjectUrl, payload.track.title);
    searchStatus.textContent = `${payload.track.channel || "Alem Müzik"} · Uygulama içinde oynatılıyor`;
  } catch (error) {
    searchStatus.textContent = error.message;
    showToast(error.message);
  } finally {
    button.disabled = false;
  }
});

document.getElementById("stop-music")?.addEventListener("click", () => {
  destroyHls();
  releaseTrackObjectUrl();
  player.pause();
  player.removeAttribute("src");
  player.load();
  activeStation?.classList.remove("playing");
  activeStation = null;
  trackTitle.textContent = "Bir istasyon veya şarkı seç";
  liveBadge.classList.remove("connecting", "on-air");
  liveBadge.lastChild.textContent = " Hazır";
  haptic();
});

player?.addEventListener("playing", () => {
  liveBadge.classList.remove("connecting");
  liveBadge.classList.add("on-air");
  liveBadge.lastChild.textContent = " Çalıyor";
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
  showToast("Bu yayın şu anda açılamıyor");
});

const initialTab = location.hash.slice(1);
if (initialTab) {
  activateTab(initialTab, false);
  requestAnimationFrame(() => window.scrollTo(0, 0));
}
applyTelegramTheme();
