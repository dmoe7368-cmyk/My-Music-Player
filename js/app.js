const audio = document.getElementById("audio");
const fileInput = document.getElementById("fileInput");
const songList = document.getElementById("songList");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");

let localSongs = [];
let driveSongs = [];
let currentSongs = [];
let currentIndex = -1;
let currentView = "local";
let shuffle = false;
let repeat = false;

const $ = id => document.getElementById(id);

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function makeId() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random();
}

function getLocalMeta(file) {
  return {
    id: makeId(),
    title: file.name.replace(/\.mp3$/i, ""),
    artist: "Local file",
    file,
    type: "local",
    duration: 0,
    favorite: false
  };
}

function visibleSongs() {
  const source = currentView === "drive" ? driveSongs : localSongs;
  if (currentView === "favorites") {
    return [...localSongs, ...driveSongs].filter(s => s.favorite);
  }
  const q = searchInput.value.trim().toLowerCase();
  return q ? source.filter(s => `${s.title} ${s.artist}`.toLowerCase().includes(q)) : source;
}

function render() {
  currentSongs = visibleSongs();
  $("songCount").textContent = `${currentSongs.length} song${currentSongs.length === 1 ? "" : "s"}`;
  songList.innerHTML = "";

  emptyState.classList.toggle("hidden", currentSongs.length > 0);
  if (!currentSongs.length) return;

  currentSongs.forEach((song, i) => {
    const row = document.createElement("div");
    row.className = "song" + (currentIndex >= 0 && currentSongs[currentIndex]?.id === song.id ? " active" : "");
    row.innerHTML = `
      <div class="song-cover">♪</div>
      <div class="song-meta">
        <strong class="song-title">${escapeHtml(song.title)}</strong>
        <span class="song-artist">${escapeHtml(song.artist || "Unknown")}</span>
      </div>
      <span class="song-duration">${formatTime(song.duration)}</span>
      <button class="fav-row" title="Favorite">${song.favorite ? "♥" : "♡"}</button>
    `;
    row.addEventListener("click", e => {
      if (e.target.closest(".fav-row")) {
        song.favorite = !song.favorite;
        render();
        return;
      }
      playIndex(i);
    });
    songList.appendChild(row);
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}

function playIndex(index) {
  if (!currentSongs[index]) return;
  currentIndex = index;
  const song = currentSongs[index];

  if (song.type === "local") {
    audio.src = URL.createObjectURL(song.file);
  } else if (song.type === "drive") {
    audio.src = song.streamUrl;
  }

  $("nowTitle").textContent = song.title;
  $("nowArtist").textContent = song.artist || "Unknown";
  $("favoriteBtn").textContent = song.favorite ? "♥" : "♡";
  audio.play().catch(err => console.warn("Playback:", err));
  render();
}

function next() {
  if (!currentSongs.length) return;
  if (shuffle) {
    currentIndex = Math.floor(Math.random() * currentSongs.length);
  } else {
    currentIndex = (currentIndex + 1) % currentSongs.length;
  }
  playIndex(currentIndex);
}

function previous() {
  if (!currentSongs.length) return;
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  currentIndex = (currentIndex - 1 + currentSongs.length) % currentSongs.length;
  playIndex(currentIndex);
}

$("chooseFilesBtn").onclick = () => fileInput.click();
$("emptyChooseBtn").onclick = () => fileInput.click();

fileInput.addEventListener("change", e => {
  const files = [...e.target.files].filter(f => f.name.toLowerCase().endsWith(".mp3"));
  localSongs.push(...files.map(getLocalMeta));
  currentView = "local";
  updateView();
  render();
  e.target.value = "";
});

$("clearLocalBtn").onclick = () => {
  localSongs = [];
  audio.pause();
  audio.removeAttribute("src");
  currentIndex = -1;
  render();
};

$("playBtn").onclick = () => {
  if (!audio.src && currentSongs.length) return playIndex(0);
  if (audio.paused) audio.play(); else audio.pause();
};
$("nextBtn").onclick = next;
$("prevBtn").onclick = previous;

$("shuffleBtn").onclick = () => {
  shuffle = !shuffle;
  $("shuffleBtn").classList.toggle("active", shuffle);
};
$("repeatBtn").onclick = () => {
  repeat = !repeat;
  $("repeatBtn").classList.toggle("active", repeat);
};

$("favoriteBtn").onclick = () => {
  if (currentSongs[currentIndex]) {
    currentSongs[currentIndex].favorite = !currentSongs[currentIndex].favorite;
    $("favoriteBtn").textContent = currentSongs[currentIndex].favorite ? "♥" : "♡";
    render();
  }
};

audio.addEventListener("play", () => $("playBtn").textContent = "⏸");
audio.addEventListener("pause", () => $("playBtn").textContent = "▶");
audio.addEventListener("loadedmetadata", () => {
  $("duration").textContent = formatTime(audio.duration);
  if (currentSongs[currentIndex]) {
    currentSongs[currentIndex].duration = audio.duration;
    render();
  }
});
audio.addEventListener("timeupdate", () => {
  $("currentTime").textContent = formatTime(audio.currentTime);
  $("progress").value = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
});
audio.addEventListener("ended", () => repeat ? playIndex(currentIndex) : next());

$("progress").addEventListener("input", e => {
  if (audio.duration) audio.currentTime = (Number(e.target.value) / 100) * audio.duration;
});
$("volume").addEventListener("input", e => audio.volume = Number(e.target.value));
audio.volume = 0.8;
searchInput.addEventListener("input", render);

document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    currentView = btn.dataset.view;
    updateView();
    render();
  });
});

function updateView() {
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === currentView));
  const titles = {
    local: ["Local Music", "Play MP3 files directly from your browser."],
    drive: ["Google Drive", "Play MP3 files from your Google Drive."],
    favorites: ["Favorites", "Your favorite songs."]
  };
  $("viewTitle").textContent = titles[currentView][0];
  $("viewSubtitle").textContent = titles[currentView][1];
  $("sectionTitle").textContent = currentView === "favorites" ? "Favorites" : "Songs";
  $("drivePanel").classList.toggle("hidden", currentView !== "drive");
}

async function connectDrive() {
  if (!DRIVE_CONFIG.clientId) {
    $("driveStatus").textContent = "Add your OAuth clientId in js/config.js first.";
    return;
  }
  $("driveStatus").textContent = "Google Drive OAuth integration is ready for configuration.";
  /*
    Recommended production implementation:
    - Load Google Identity Services (GIS)
    - Request drive.readonly scope
    - Use the OAuth access token with:
      GET https://www.googleapis.com/drive/v3/files
      q="'root' in parents and trashed=false and mimeType='audio/mpeg'"
    - For each file, use Drive API media download endpoint with the bearer token.

    This starter keeps credentials out of the repository and does not hard-code
    an access token.
  */
}
$("driveConnectBtn").onclick = connectDrive;
$("driveRefreshBtn").onclick = connectDrive;

updateView();
render();
