// ============================================
// XAMOE MUSIC PLAYER
// Local MP3 + PUBLIC GOOGLE DRIVE
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  const audio = document.getElementById("audio");
  const songTitle = document.getElementById("nowTitle");
  const songArtist = document.getElementById("nowArtist");
  const playBtn = document.getElementById("playBtn");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const progressBar = document.getElementById("progress");
  const currentTimeEl = document.getElementById("currentTime");
  const durationEl = document.getElementById("duration");
  const volumeBar = document.getElementById("volume");
  const shuffleBtn = document.getElementById("shuffleBtn");
  const repeatBtn = document.getElementById("repeatBtn");
  const searchInput = document.getElementById("searchInput");
  const localFilesInput = document.getElementById("fileInput");
  const chooseFilesBtn = document.getElementById("chooseFilesBtn");
  const emptyChooseBtn = document.getElementById("emptyChooseBtn");
  const clearLocalBtn = document.getElementById("clearLocalBtn");
  const songList = document.getElementById("songList");
  const drivePanel = document.getElementById("drivePanel");
  const driveConnectBtn = document.getElementById("driveConnectBtn");
  const driveRefreshBtn = document.getElementById("driveRefreshBtn");
  const driveStatus = document.getElementById("driveStatus");
  const songCount = document.getElementById("songCount");
  const emptyState = document.getElementById("emptyState");
  const sectionTitle = document.getElementById("sectionTitle");
  const viewTitle = document.getElementById("viewTitle");
  const viewSubtitle = document.getElementById("viewSubtitle");
  const navButtons = document.querySelectorAll(".nav-btn");
  const favoriteBtn = document.getElementById("favoriteBtn");

  let localSongs = [];
  let driveSongs = [];
  let favorites = JSON.parse(localStorage.getItem("myMusicFavorites") || "[]");
  let currentView = "local";
  let currentIndex = -1;
  let currentSongs = [];
  let isShuffle = false;
  let repeatMode = "off";
  let localObjectUrl = null;

  if (!audio) return;

  audio.volume = Number(volumeBar?.value || 0.8);

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value == null ? "" : String(value);
    return div.innerHTML;
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${String(secs).padStart(2, "0")}`;
  }

  function getDriveUrl(fileId) {
    return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&key=${encodeURIComponent(window.DRIVE_CONFIG.apiKey)}`;
  }

  function saveFavorites() {
    localStorage.setItem("myMusicFavorites", JSON.stringify(favorites));
  }

  function isFavorite(song) {
    return !!song && favorites.includes(song.id);
  }

  function toggleFavorite(song) {
    if (!song) return;

    if (isFavorite(song)) {
      favorites = favorites.filter(id => id !== song.id);
    } else {
      favorites.push(song.id);
    }

    saveFavorites();
    renderCurrentView();
    updateFavoriteButton();
  }

  function updateFavoriteButton() {
    if (!favoriteBtn) return;
    const song = currentSongs[currentIndex];
    favoriteBtn.textContent = song && isFavorite(song) ? "♥" : "♡";
  }

  function getBaseSongs() {
    if (currentView === "drive") return driveSongs;

    if (currentView === "favorites") {
      return [...localSongs, ...driveSongs].filter(isFavorite);
    }

    return localSongs;
  }

  function getFilteredSongs() {
    const query = String(searchInput?.value || "").trim().toLowerCase();
    const songs = getBaseSongs();

    if (!query) return [...songs];

    return songs.filter(song =>
      String(song.title || "").toLowerCase().includes(query) ||
      String(song.artist || "").toLowerCase().includes(query) ||
      String(song.fileName || "").toLowerCase().includes(query)
    );
  }

  function renderSongs() {
    if (!songList) return;

    currentSongs = getFilteredSongs();

    if (songCount) songCount.textContent = `${currentSongs.length} songs`;
    if (emptyState) emptyState.classList.toggle("hidden", currentSongs.length > 0);

    if (!currentSongs.length) {
      songList.innerHTML = "";
      return;
    }

    songList.innerHTML = currentSongs.map((song, index) => `
      <div class="song-item ${index === currentIndex ? "active" : ""}">
        <button class="song-main" data-play-index="${index}" type="button">
          <span class="song-number">${index + 1}</span>
          <span class="song-details">
            <strong>${escapeHtml(song.title)}</strong>
            <small>${escapeHtml(song.artist || "")}</small>
          </span>
        </button>
        <button
          class="icon-btn song-favorite ${isFavorite(song) ? "active" : ""}"
          data-favorite-index="${index}"
          type="button"
          aria-label="Favorite"
        >${isFavorite(song) ? "♥" : "♡"}</button>
      </div>
    `).join("");

    songList.querySelectorAll("[data-play-index]").forEach(button => {
      button.addEventListener("click", () => playSong(Number(button.dataset.playIndex)));
    });

    songList.querySelectorAll("[data-favorite-index]").forEach(button => {
      button.addEventListener("click", event => {
        event.stopPropagation();
        toggleFavorite(currentSongs[Number(button.dataset.favoriteIndex)]);
      });
    });
  }

  function renderCurrentView() {
    renderSongs();
    updateFavoriteButton();
  }

  function setView(view) {
    currentView = view;
    currentIndex = -1;

    document.body.classList.toggle("drive-view", view === "drive");
    document.body.classList.toggle("favorites-view", view === "favorites");

    navButtons.forEach(button => {
      button.classList.toggle("active", button.dataset.view === view);
    });

    if (view === "drive") {
      if (viewTitle) viewTitle.textContent = "XAMOE Drive";
      if (viewSubtitle) viewSubtitle.textContent = "";
      if (sectionTitle) sectionTitle.textContent = "Songs";
      drivePanel?.classList.add("hidden");

      if (!driveSongs.length) loadPublicDriveMusic();
    } else if (view === "favorites") {
      if (viewTitle) viewTitle.textContent = "Favorites";
      if (viewSubtitle) viewSubtitle.textContent = "";
      if (sectionTitle) sectionTitle.textContent = "Favorites";
      drivePanel?.classList.add("hidden");
    } else {
      if (viewTitle) viewTitle.textContent = "Local Music";
      if (viewSubtitle) viewSubtitle.textContent = "";
      if (sectionTitle) sectionTitle.textContent = "Songs";
      drivePanel?.classList.add("hidden");
    }

    renderCurrentView();
  }

  function playSong(index) {
    const songs = getFilteredSongs();
    if (!songs.length || index < 0 || index >= songs.length) return;

    currentSongs = songs;
    currentIndex = index;
    const song = songs[index];

    if (localObjectUrl) {
      URL.revokeObjectURL(localObjectUrl);
      localObjectUrl = null;
    }

    if (song.source === "local") {
      localObjectUrl = URL.createObjectURL(song.file);
      audio.src = localObjectUrl;
    } else {
      audio.src = song.streamUrl;
    }

    if (songTitle) songTitle.textContent = song.title;
    if (songArtist) songArtist.textContent = song.artist || "";

    updateFavoriteButton();
    renderSongs();
    audio.load();
    audio.play().catch(error => console.warn("Playback could not start:", error));
  }

  function togglePlay() {
    if (!audio.src) {
      const songs = getFilteredSongs();
      if (songs.length) playSong(0);
      return;
    }

    if (audio.paused) audio.play().catch(error => console.warn(error));
    else audio.pause();
  }

  function playPrevious() {
    const songs = getFilteredSongs();
    if (!songs.length) return;

    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    let index = currentIndex - 1;
    if (index < 0) index = songs.length - 1;
    playSong(index);
  }

  function playNext() {
    const songs = getFilteredSongs();
    if (!songs.length) return;

    let index;

    if (isShuffle && songs.length > 1) {
      do {
        index = Math.floor(Math.random() * songs.length);
      } while (index === currentIndex);
    } else {
      index = currentIndex + 1;
      if (index >= songs.length) index = 0;
    }

    playSong(index);
  }

  function updatePlayButton() {
    if (!playBtn) return;
    playBtn.textContent = audio.paused ? "▶" : "❚❚";
    playBtn.title = audio.paused ? "Play" : "Pause";
  }

  function updateModeButtons() {
    if (shuffleBtn) {
      shuffleBtn.classList.toggle("active", isShuffle);
      shuffleBtn.setAttribute("aria-pressed", String(isShuffle));
    }

    if (repeatBtn) {
      const active = repeatMode !== "off";
      repeatBtn.classList.toggle("active", active);
      repeatBtn.setAttribute("aria-pressed", String(active));
      repeatBtn.textContent = repeatMode === "one" ? "🔂" : "🔁";
    }
  }

  async function loadPublicDriveMusic() {
    if (!window.DRIVE_CONFIG) {
      if (driveStatus) driveStatus.textContent = "DRIVE_CONFIG not found.";
      return;
    }

    if (!DRIVE_CONFIG.folderId || !DRIVE_CONFIG.apiKey) {
      if (driveStatus) driveStatus.textContent = "Google Drive Folder ID or API Key is missing.";
      return;
    }

    if (driveStatus) driveStatus.textContent = "Loading...";

    if (driveConnectBtn) {
      driveConnectBtn.disabled = true;
      driveConnectBtn.textContent = "Loading...";
    }

    try {
      const query = `'${DRIVE_CONFIG.folderId}' in parents and trashed = false`;

      const params = new URLSearchParams({
        q: query,
        key: DRIVE_CONFIG.apiKey,
        pageSize: "1000",
        fields: "files(id,name,mimeType,size,webContentLink),nextPageToken"
      });

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?${params.toString()}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message || `Google Drive API error ${response.status}`);
      }

      const files = Array.isArray(data.files) ? data.files : [];

      driveSongs = files
        .filter(file => /\.(mp3|wma)$/i.test(file.name || ""))
        .map((file, index) => ({
          id: `drive-${file.id}`,
          fileId: file.id,
          title: String(file.name || `Song ${index + 1}`)
            .replace(/\.(mp3|wma)$/i, "")
            .trim(),
          artist: "XAMOE Drive",
          fileName: file.name,
          mimeType: file.mimeType,
          size: file.size || null,
          streamUrl: getDriveUrl(file.id),
          source: "drive"
        }))
        .sort((a, b) =>
          a.fileName.localeCompare(b.fileName, undefined, {
            numeric: true,
            sensitivity: "base"
          })
        );

      if (driveStatus) driveStatus.textContent = `${driveSongs.length} songs loaded`;

      renderCurrentView();
    } catch (error) {
      console.error("XAMOE Drive error:", error);

      if (driveStatus) {
        driveStatus.textContent = `Could not load XAMOE Drive: ${error.message}`;
      }

      renderCurrentView();
    } finally {
      if (driveConnectBtn) {
        driveConnectBtn.disabled = false;
        driveConnectBtn.textContent = "Load";
      }
    }
  }

  function addLocalFiles(files) {
    const selected = Array.from(files || []).filter(file =>
      /\.mp3$/i.test(file.name) || file.type === "audio/mpeg"
    );

    selected.forEach(file => {
      const id = `local-${file.name}-${file.size}-${file.lastModified}`;
      if (localSongs.some(song => song.id === id)) return;

      localSongs.push({
        id,
        title: file.name.replace(/\.mp3$/i, ""),
        artist: "Local Music",
        fileName: file.name,
        file,
        source: "local"
      });
    });

    if (currentView !== "local") setView("local");
    else renderCurrentView();
  }

  function clearLocalSongs() {
    if (localObjectUrl) {
      URL.revokeObjectURL(localObjectUrl);
      localObjectUrl = null;
    }

    localSongs = [];

    if (audio.src && currentSongs.some(song => song.source === "local")) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();

      if (songTitle) songTitle.textContent = "Nothing playing";
      if (songArtist) songArtist.textContent = "—";
    }

    renderCurrentView();
  }

  navButtons.forEach(button => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  chooseFilesBtn?.addEventListener("click", () => localFilesInput?.click());
  emptyChooseBtn?.addEventListener("click", () => localFilesInput?.click());

  localFilesInput?.addEventListener("change", event => {
    addLocalFiles(event.target.files);
    event.target.value = "";
  });

  clearLocalBtn?.addEventListener("click", clearLocalSongs);
  driveConnectBtn?.addEventListener("click", loadPublicDriveMusic);
  driveRefreshBtn?.addEventListener("click", loadPublicDriveMusic);

  playBtn?.addEventListener("click", togglePlay);
  prevBtn?.addEventListener("click", playPrevious);
  nextBtn?.addEventListener("click", playNext);

  favoriteBtn?.addEventListener("click", () => {
    toggleFavorite(currentSongs[currentIndex]);
  });

  shuffleBtn?.addEventListener("click", () => {
    isShuffle = !isShuffle;
    updateModeButtons();
  });

  repeatBtn?.addEventListener("click", () => {
    repeatMode =
      repeatMode === "off" ? "all" :
      repeatMode === "all" ? "one" : "off";

    updateModeButtons();
  });

  searchInput?.addEventListener("input", renderCurrentView);

  volumeBar?.addEventListener("input", () => {
    audio.volume = Number(volumeBar.value);
  });

  progressBar?.addEventListener("input", () => {
    if (audio.duration) {
      audio.currentTime =
        (Number(progressBar.value) / 100) * audio.duration;
    }
  });

  audio.addEventListener("play", updatePlayButton);
  audio.addEventListener("pause", updatePlayButton);

  audio.addEventListener("timeupdate", () => {
    if (audio.duration && progressBar) {
      progressBar.value = (audio.currentTime / audio.duration) * 100;
    }

    if (currentTimeEl) {
      currentTimeEl.textContent = formatTime(audio.currentTime);
    }
  });

  audio.addEventListener("loadedmetadata", () => {
    if (durationEl) durationEl.textContent = formatTime(audio.duration);
  });

  audio.addEventListener("ended", () => {
    if (repeatMode === "one") {
      audio.currentTime = 0;
      audio.play();
      return;
    }

    if (repeatMode === "off" &&
        currentIndex >= getFilteredSongs().length - 1) {
      updatePlayButton();
      return;
    }

    playNext();
  });

  audio.addEventListener("error", () => {
    console.warn("Audio error.");
  });

  document.addEventListener("keydown", event => {
    const tag = event.target?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea") return;

    if (event.code === "Space") {
      event.preventDefault();
      togglePlay();
    } else if (event.code === "ArrowRight") {
      audio.currentTime = Math.min(
        (audio.currentTime || 0) + 5,
        audio.duration || Infinity
      );
    } else if (event.code === "ArrowLeft") {
      audio.currentTime = Math.max((audio.currentTime || 0) - 5, 0);
    }
  });

  updateModeButtons();
  setView("local");

  if (window.DRIVE_CONFIG?.autoLoad) {
    loadPublicDriveMusic();
  }
});
