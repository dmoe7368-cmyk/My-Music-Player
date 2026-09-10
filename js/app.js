// ============================================
// MY MUSIC PLAYER
// PUBLIC GOOGLE DRIVE VERSION
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  // ------------------------------------------
  // DOM ELEMENTS
  // ------------------------------------------

  const audio = document.getElementById("audioPlayer");

  const songTitle = document.getElementById("songTitle");
  const songArtist = document.getElementById("songArtist");

  const playBtn = document.getElementById("playBtn");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  const progressBar = document.getElementById("progressBar");
  const currentTimeEl = document.getElementById("currentTime");
  const durationEl = document.getElementById("duration");

  const volumeBar = document.getElementById("volumeBar");

  const shuffleBtn = document.getElementById("shuffleBtn");
  const repeatBtn = document.getElementById("repeatBtn");

  const searchInput = document.getElementById("searchInput");

  const localFilesInput = document.getElementById("localFiles");

  const localMusicList = document.getElementById("localMusicList");
  const driveMusicList = document.getElementById("driveMusicList");

  const driveConnectBtn = document.getElementById("driveConnectBtn");
  const driveRefreshBtn = document.getElementById("driveRefreshBtn");

  const driveStatus = document.getElementById("driveStatus");

  const emptyState = document.getElementById("emptyState");

  // ------------------------------------------
  // STATE
  // ------------------------------------------

  let localSongs = [];
  let driveSongs = [];

  let currentPlaylist = [];
  let currentIndex = -1;

  let currentView = "local";

  let isPlaying = false;
  let isShuffle = false;
  let repeatMode = "off";

  let searchText = "";

  let localObjectUrl = null;

  // ------------------------------------------
  // HELPERS
  // ------------------------------------------

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return "0:00";
    }

    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text ?? "";
    return div.innerHTML;
  }

  function getDriveStreamUrl(fileId) {
    return (
      "https://drive.google.com/uc?export=download&id=" +
      encodeURIComponent(fileId)
    );
  }

  function getDrivePreviewUrl(fileId) {
    return (
      "https://drive.google.com/file/d/" +
      encodeURIComponent(fileId) +
      "/view"
    );
  }

  // ------------------------------------------
  // PUBLIC DRIVE SONGS
  // ------------------------------------------

  function loadPublicDriveMusic() {
    if (
      !window.DRIVE_CONFIG ||
      !Array.isArray(DRIVE_CONFIG.songs)
    ) {
      console.error("DRIVE_CONFIG.songs is missing.");

      driveSongs = [];

      updateDriveStatus(
        "No public Drive songs configured."
      );

      renderDriveSongs();

      return;
    }

    driveSongs = DRIVE_CONFIG.songs
      .filter(song => {
        return (
          song &&
          song.fileId &&
          song.fileId !== "YOUR_FILE_ID_HERE"
        );
      })
      .map((song, index) => {
        return {
          id: `drive-${song.fileId}`,

          title:
            song.title ||
            `Drive Song ${index + 1}`,

          artist:
            song.artist ||
            "Unknown Artist",

          fileId: song.fileId,

          streamUrl: getDriveStreamUrl(song.fileId),

          previewUrl: getDrivePreviewUrl(song.fileId),

          source: "drive",

          favorite: false
        };
      });

    updateDriveStatus(
      `${driveSongs.length} public song${
        driveSongs.length === 1 ? "" : "s"
      } loaded`
    );

    renderDriveSongs();
  }

  function updateDriveStatus(message) {
    if (!driveStatus) return;

    driveStatus.textContent = message;
  }

  // ------------------------------------------
  // LOCAL MUSIC
  // ------------------------------------------

  function loadLocalMusic(files) {
    if (!files || !files.length) {
      return;
    }

    const selectedFiles = Array.from(files);

    const mp3Files = selectedFiles.filter(file => {
      return (
        file.type === "audio/mpeg" ||
        file.type === "audio/mp3" ||
        file.name.toLowerCase().endsWith(".mp3")
      );
    });

    localSongs = mp3Files.map((file, index) => {
      return {
        id: `local-${index}-${file.name}`,

        title: file.name.replace(/\.mp3$/i, ""),

        artist: "Local Music",

        file,

        source: "local",

        favorite: false
      };
    });

    currentView = "local";

    renderLocalSongs();

    if (localSongs.length > 0) {
      setPlaylist(localSongs);

      playSong(0);
    }

    updateEmptyState();
  }

  // ------------------------------------------
  // PLAYLIST
  // ------------------------------------------

  function setPlaylist(songs) {
    currentPlaylist = Array.isArray(songs)
      ? [...songs]
      : [];

    currentIndex = -1;
  }

  function getCurrentSongs() {
    if (currentView === "drive") {
      return getFilteredSongs(driveSongs);
    }

    return getFilteredSongs(localSongs);
  }

  function getFilteredSongs(songs) {
    if (!searchText.trim()) {
      return [...songs];
    }

    const query = searchText.toLowerCase().trim();

    return songs.filter(song => {
      const title = String(song.title || "").toLowerCase();
      const artist = String(song.artist || "").toLowerCase();

      return (
        title.includes(query) ||
        artist.includes(query)
      );
    });
  }

  // ------------------------------------------
  // PLAY SONG
  // ------------------------------------------

  function playSong(index) {
    const songs = getCurrentSongs();

    if (!songs.length) {
      return;
    }

    if (index < 0 || index >= songs.length) {
      return;
    }

    const song = songs[index];

    currentPlaylist = songs;
    currentIndex = index;

    // ----------------------------------------
    // LOCAL FILE
    // ----------------------------------------

    if (song.source === "local") {
      if (localObjectUrl) {
        URL.revokeObjectURL(localObjectUrl);
        localObjectUrl = null;
      }

      localObjectUrl = URL.createObjectURL(song.file);

      audio.src = localObjectUrl;
    }

    // ----------------------------------------
    // PUBLIC GOOGLE DRIVE
    // ----------------------------------------

    else if (song.source === "drive") {
      audio.src = song.streamUrl;
    }

    // ----------------------------------------
    // UPDATE UI
    // ----------------------------------------

    if (songTitle) {
      songTitle.textContent = song.title;
    }

    if (songArtist) {
      songArtist.textContent = song.artist;
    }

    updateActiveSong();

    audio.load();

    const playPromise = audio.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          isPlaying = true;
          updatePlayButton();
        })
        .catch(error => {
          console.warn(
            "Audio playback was blocked or failed:",
            error
          );

          isPlaying = false;
          updatePlayButton();
        });
    }
  }

  // ------------------------------------------
  // PLAY / PAUSE
  // ------------------------------------------

  function togglePlay() {
    if (!audio.src) {
      const songs = getCurrentSongs();

      if (songs.length > 0) {
        playSong(0);
      }

      return;
    }

    if (audio.paused) {
      audio
        .play()
        .then(() => {
          isPlaying = true;
          updatePlayButton();
        })
        .catch(error => {
          console.warn(error);
        });
    } else {
      audio.pause();

      isPlaying = false;

      updatePlayButton();
    }
  }

  function updatePlayButton() {
    if (!playBtn) return;

    if (isPlaying) {
      playBtn.innerHTML = "❚❚";
      playBtn.setAttribute("aria-label", "Pause");
    } else {
      playBtn.innerHTML = "▶";
      playBtn.setAttribute("aria-label", "Play");
    }
  }

  // ------------------------------------------
  // PREVIOUS
  // ------------------------------------------

  function playPrevious() {
    const songs = getCurrentSongs();

    if (!songs.length) {
      return;
    }

    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    let newIndex = currentIndex - 1;

    if (newIndex < 0) {
      newIndex = songs.length - 1;
    }

    playSong(newIndex);
  }

  // ------------------------------------------
  // NEXT
  // ------------------------------------------

  function playNext() {
    const songs = getCurrentSongs();

    if (!songs.length) {
      return;
    }

    let newIndex;

    if (isShuffle) {
      if (songs.length <= 1) {
        newIndex = 0;
      } else {
        do {
          newIndex = Math.floor(
            Math.random() * songs.length
          );
        } while (
          newIndex === currentIndex
        );
      }
    } else {
      newIndex = currentIndex + 1;

      if (newIndex >= songs.length) {
        newIndex = 0;
      }
    }

    playSong(newIndex);
  }

  // ------------------------------------------
  // AUDIO ENDED
  // ------------------------------------------

  function handleSongEnded() {
    if (repeatMode === "one") {
      audio.currentTime = 0;

      audio.play();

      return;
    }

    const songs = getCurrentSongs();

    if (!songs.length) {
      return;
    }

    if (
      currentIndex >= songs.length - 1 &&
      repeatMode === "off"
    ) {
      isPlaying = false;

      updatePlayButton();

      return;
    }

    playNext();
  }

  // ------------------------------------------
  // SHUFFLE
  // ------------------------------------------

  function toggleShuffle() {
    isShuffle = !isShuffle;

    if (shuffleBtn) {
      shuffleBtn.classList.toggle(
        "active",
        isShuffle
      );
    }
  }

  // ------------------------------------------
  // REPEAT
  // ------------------------------------------

  function toggleRepeat() {
    if (repeatMode === "off") {
      repeatMode = "all";
    } else if (repeatMode === "all") {
      repeatMode = "one";
    } else {
      repeatMode = "off";
    }

    updateRepeatButton();
  }

  function updateRepeatButton() {
    if (!repeatBtn) return;

    repeatBtn.classList.toggle(
      "active",
      repeatMode !== "off"
    );

    if (repeatMode === "one") {
      repeatBtn.textContent = "🔂";
    } else {
      repeatBtn.textContent = "🔁";
    }
  }

  // ------------------------------------------
  // PROGRESS
  // ------------------------------------------

  function updateProgress() {
    if (!audio.duration) {
      return;
    }

    const percentage =
      (audio.currentTime / audio.duration) * 100;

    if (progressBar) {
      progressBar.value = percentage || 0;
    }

    if (currentTimeEl) {
      currentTimeEl.textContent =
        formatTime(audio.currentTime);
    }

    if (durationEl) {
      durationEl.textContent =
        formatTime(audio.duration);
    }
  }

  function seekAudio() {
    if (!audio.duration) {
      return;
    }

    const value = Number(progressBar.value);

    audio.currentTime =
      (value / 100) * audio.duration;
  }

  // ------------------------------------------
  // VOLUME
  // ------------------------------------------

  function updateVolume() {
    if (!volumeBar) return;

    const volume = Number(volumeBar.value);

    audio.volume = volume;

    audio.muted = volume === 0;
  }

  // ------------------------------------------
  // SEARCH
  // ------------------------------------------

  function handleSearch() {
    searchText =
      searchInput?.value?.toLowerCase() || "";

    if (currentView === "drive") {
      renderDriveSongs();
    } else {
      renderLocalSongs();
    }

    updateEmptyState();
  }

  // ------------------------------------------
  // RENDER LOCAL SONGS
  // ------------------------------------------

  function renderLocalSongs() {
    if (!localMusicList) return;

    const songs = getFilteredSongs(localSongs);

    localMusicList.innerHTML = "";

    if (!songs.length) {
      return;
    }

    songs.forEach((song, index) => {
      const item =
        document.createElement("div");

      item.className = "song-item";

      item.dataset.id = song.id;

      item.innerHTML = `
        <div class="song-info">
          <div class="song-title">
            ${escapeHtml(song.title)}
          </div>

          <div class="song-artist">
            ${escapeHtml(song.artist)}
          </div>
        </div>

        <button
          class="song-play-btn"
          type="button"
          aria-label="Play"
        >
          ▶
        </button>
      `;

      item.addEventListener(
        "click",
        event => {
          if (
            event.target.closest(
              ".song-play-btn"
            )
          ) {
            return;
          }

          currentView = "local";

          playSong(index);
        }
      );

      const button =
        item.querySelector(".song-play-btn");

      if (button) {
        button.addEventListener(
          "click",
          event => {
            event.stopPropagation();

            currentView = "local";

            playSong(index);
          }
        );
      }

      localMusicList.appendChild(item);
    });

    updateActiveSong();
  }

  // ------------------------------------------
  // RENDER DRIVE SONGS
  // ------------------------------------------

  function renderDriveSongs() {
    if (!driveMusicList) return;

    const songs =
      getFilteredSongs(driveSongs);

    driveMusicList.innerHTML = "";

    if (!songs.length) {
      return;
    }

    songs.forEach((song, index) => {
      const item =
        document.createElement("div");

      item.className = "song-item";

      item.dataset.id = song.id;

      item.innerHTML = `
        <div class="song-info">
          <div class="song-title">
            ${escapeHtml(song.title)}
          </div>

          <div class="song-artist">
            ${escapeHtml(song.artist)}
          </div>
        </div>

        <button
          class="song-play-btn"
          type="button"
          aria-label="Play"
        >
          ▶
        </button>
      `;

      item.addEventListener(
        "click",
        event => {
          if (
            event.target.closest(
              ".song-play-btn"
            )
          ) {
            return;
          }

          currentView = "drive";

          playSong(index);
        }
      );

      const button =
        item.querySelector(".song-play-btn");

      if (button) {
        button.addEventListener(
          "click",
          event => {
            event.stopPropagation();

            currentView = "drive";

            playSong(index);
          }
        );
      }

      driveMusicList.appendChild(item);
    });

    updateActiveSong();
  }

  // ------------------------------------------
  // ACTIVE SONG
  // ------------------------------------------

  function updateActiveSong() {
    document
      .querySelectorAll(".song-item")
      .forEach(item => {
        item.classList.remove("active");
      });

    if (
      currentIndex < 0 ||
      !currentPlaylist[currentIndex]
    ) {
      return;
    }

    const song =
      currentPlaylist[currentIndex];

    const activeItem =
      document.querySelector(
        `.song-item[data-id="${CSS.escape(song.id)}"]`
      );

    if (activeItem) {
      activeItem.classList.add("active");
    }
  }

  // ------------------------------------------
  // EMPTY STATE
  // ------------------------------------------

  function updateEmptyState() {
    if (!emptyState) return;

    const songs =
      currentView === "drive"
        ? getFilteredSongs(driveSongs)
        : getFilteredSongs(localSongs);

    if (songs.length > 0) {
      emptyState.style.display = "none";
      return;
    }

    emptyState.style.display = "";

    if (currentView === "drive") {
      emptyState.textContent =
        "No public Google Drive songs found.";
    } else {
      emptyState.textContent =
        "Choose MP3 files to start listening.";
    }
  }

  // ------------------------------------------
  // VIEW SWITCH
  // ------------------------------------------

  function switchView(view) {
    currentView = view;

    if (view === "drive") {
      renderDriveSongs();

      if (driveStatus) {
        updateDriveStatus(
          `${driveSongs.length} public song${
            driveSongs.length === 1
              ? ""
              : "s"
          } loaded`
        );
      }
    } else {
      renderLocalSongs();
    }

    updateEmptyState();
  }

  // ------------------------------------------
  // LOCAL FILE INPUT
  // ------------------------------------------

  if (localFilesInput) {
    localFilesInput.addEventListener(
      "change",
      event => {
        loadLocalMusic(
          event.target.files
        );
      }
    );
  }

  // ------------------------------------------
  // PLAY BUTTON
  // ------------------------------------------

  if (playBtn) {
    playBtn.addEventListener(
      "click",
      togglePlay
    );
  }

  // ------------------------------------------
  // PREVIOUS
  // ------------------------------------------

  if (prevBtn) {
    prevBtn.addEventListener(
      "click",
      playPrevious
    );
  }

  // ------------------------------------------
  // NEXT
  // ------------------------------------------

  if (nextBtn) {
    nextBtn.addEventListener(
      "click",
      playNext
    );
  }

  // ------------------------------------------
  // SHUFFLE
  // ------------------------------------------

  if (shuffleBtn) {
    shuffleBtn.addEventListener(
      "click",
      toggleShuffle
    );
  }

  // ------------------------------------------
  // REPEAT
  // ------------------------------------------

  if (repeatBtn) {
    repeatBtn.addEventListener(
      "click",
      toggleRepeat
    );
  }

  // ------------------------------------------
  // PROGRESS BAR
  // ------------------------------------------

  if (progressBar) {
    progressBar.addEventListener(
      "input",
      seekAudio
    );
  }

  // ------------------------------------------
  // VOLUME
  // ------------------------------------------

  if (volumeBar) {
    volumeBar.addEventListener(
      "input",
      updateVolume
    );
  }

  // ------------------------------------------
  // SEARCH
  // ------------------------------------------

  if (searchInput) {
    searchInput.addEventListener(
      "input",
      handleSearch
    );
  }

  // ------------------------------------------
  // AUDIO EVENTS
  // ------------------------------------------

  audio.addEventListener(
    "timeupdate",
    updateProgress
  );

  audio.addEventListener(
    "loadedmetadata",
    updateProgress
  );

  audio.addEventListener(
    "durationchange",
    updateProgress
  );

  audio.addEventListener(
    "play",
    () => {
      isPlaying = true;
      updatePlayButton();
    }
  );

  audio.addEventListener(
    "pause",
    () => {
      isPlaying = false;
      updatePlayButton();
    }
  );

  audio.addEventListener(
    "ended",
    handleSongEnded
  );

  // ------------------------------------------
  // AUDIO ERROR
  // ------------------------------------------

  audio.addEventListener(
    "error",
    () => {
      const currentSong =
        currentPlaylist[currentIndex];

      if (
        currentSong &&
        currentSong.source === "drive"
      ) {
        console.error(
          "Google Drive audio could not be played.",
          currentSong
        );

        if (driveStatus) {
          driveStatus.textContent =
            "Unable to play this Drive file. Check that the file is public.";
        }
      }
    }
  );

  // ------------------------------------------
  // DRIVE LOAD BUTTON
  // ------------------------------------------

  if (driveConnectBtn) {
    driveConnectBtn.textContent =
      "Load Drive Music";

    driveConnectBtn.addEventListener(
      "click",
      () => {
        currentView = "drive";

        loadPublicDriveMusic();

        switchView("drive");
      }
    );
  }

  // ------------------------------------------
  // DRIVE REFRESH BUTTON
  // ------------------------------------------

  if (driveRefreshBtn) {
    driveRefreshBtn.addEventListener(
      "click",
      () => {
        currentView = "drive";

        loadPublicDriveMusic();

        switchView("drive");
      }
    );
  }

  // ------------------------------------------
  // NAVIGATION BUTTONS
  // ------------------------------------------

  document
    .querySelectorAll("[data-view]")
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          const view =
            button.dataset.view;

          if (
            view === "drive" ||
            view === "local"
          ) {
            switchView(view);
          }
        }
      );
    });

  // ------------------------------------------
  // KEYBOARD SHORTCUTS
  // ------------------------------------------

  document.addEventListener(
    "keydown",
    event => {
      // Don't trigger shortcuts while typing
      if (
        event.target.tagName === "INPUT" ||
        event.target.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();

        togglePlay();
      }

      if (event.code === "ArrowRight") {
        if (audio.duration) {
          audio.currentTime = Math.min(
            audio.duration,
            audio.currentTime + 5
          );
        }
      }

      if (event.code === "ArrowLeft") {
        audio.currentTime = Math.max(
          0,
          audio.currentTime - 5
        );
      }
    }
  );

  // ------------------------------------------
  // INITIALIZE
  // ------------------------------------------

  if (volumeBar) {
    audio.volume =
      Number(volumeBar.value) || 1;
  } else {
    audio.volume = 1;
  }

  updatePlayButton();
  updateRepeatButton();

  // Load public Drive music automatically
  loadPublicDriveMusic();

  updateEmptyState();

  console.log(
    "My Music Player initialized."
  );

  console.log(
    `Public Drive Folder ID: ${
      DRIVE_CONFIG?.folderId || "Not set"
    }`
  );

  console.log(
    `Public Drive Songs: ${driveSongs.length}`
  );
});
