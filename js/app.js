// ============================================
// MY MUSIC PLAYER
// PUBLIC GOOGLE DRIVE AUTO LOAD VERSION
// ============================================

document.addEventListener("DOMContentLoaded", () => {

  // ==========================================
  // DOM
  // ==========================================

  const audio =
    document.getElementById("audioPlayer");

  const songTitle =
    document.getElementById("songTitle");

  const songArtist =
    document.getElementById("songArtist");

  const playBtn =
    document.getElementById("playBtn");

  const prevBtn =
    document.getElementById("prevBtn");

  const nextBtn =
    document.getElementById("nextBtn");

  const progressBar =
    document.getElementById("progressBar");

  const currentTimeEl =
    document.getElementById("currentTime");

  const durationEl =
    document.getElementById("duration");

  const volumeBar =
    document.getElementById("volumeBar");

  const shuffleBtn =
    document.getElementById("shuffleBtn");

  const repeatBtn =
    document.getElementById("repeatBtn");

  const searchInput =
    document.getElementById("searchInput");

  const localFilesInput =
    document.getElementById("localFiles");

  const localMusicList =
    document.getElementById("localMusicList");

  const driveMusicList =
    document.getElementById("driveMusicList");

  const driveConnectBtn =
    document.getElementById("driveConnectBtn");

  const driveRefreshBtn =
    document.getElementById("driveRefreshBtn");

  const driveStatus =
    document.getElementById("driveStatus");

  const emptyState =
    document.getElementById("emptyState");


  // ==========================================
  // STATE
  // ==========================================

  let localSongs = [];

  let driveSongs = [];

  let currentPlaylist = [];

  let currentIndex = -1;

  let currentView = "drive";

  let isPlaying = false;

  let isShuffle = false;

  let repeatMode = "off";

  let searchText = "";

  let localObjectUrl = null;


  // ==========================================
  // HELPER
  // ==========================================

  function escapeHtml(text) {

    const div =
      document.createElement("div");

    div.textContent = text || "";

    return div.innerHTML;
  }


  function formatTime(seconds) {

    if (
      !Number.isFinite(seconds) ||
      seconds < 0
    ) {
      return "0:00";
    }

    const minutes =
      Math.floor(seconds / 60);

    const secs =
      Math.floor(seconds % 60);

    return (
      minutes +
      ":" +
      String(secs).padStart(2, "0")
    );
  }


  // ==========================================
  // GOOGLE DRIVE DOWNLOAD / STREAM URL
  // ==========================================

  function getDriveUrl(fileId) {

    return (
      "https://drive.google.com/uc" +
      "?export=download&id=" +
      encodeURIComponent(fileId)
    );
  }


  // ==========================================
  // CHECK CONFIG
  // ==========================================

  function checkDriveConfig() {

    if (
      !window.DRIVE_CONFIG
    ) {

      showDriveStatus(
        "DRIVE_CONFIG not found."
      );

      return false;
    }


    if (
      !DRIVE_CONFIG.folderId
    ) {

      showDriveStatus(
        "Google Drive Folder ID is missing."
      );

      return false;
    }


    if (
      !DRIVE_CONFIG.apiKey ||
      DRIVE_CONFIG.apiKey ===
        "YOUR_GOOGLE_API_KEY"
    ) {

      showDriveStatus(
        "Google Drive API Key is missing."
      );

      return false;
    }


    return true;
  }


  // ==========================================
  // DRIVE API
  // ==========================================

  async function loadPublicDriveMusic() {

    if (!checkDriveConfig()) {
      return;
    }


    showDriveStatus(
      "Loading music from Google Drive..."
    );


    if (driveConnectBtn) {

      driveConnectBtn.disabled = true;

      driveConnectBtn.textContent =
        "Loading...";
    }


    try {

      const query =
        `'${DRIVE_CONFIG.folderId}' in parents` +
        ` and trashed = false`;


      const url =
        "https://www.googleapis.com/drive/v3/files" +
        "?q=" +
        encodeURIComponent(query) +
        "&key=" +
        encodeURIComponent(
          DRIVE_CONFIG.apiKey
        ) +
        "&pageSize=1000" +
        "&fields=" +
        encodeURIComponent(
          "files(id,name,mimeType,size,webContentLink)"
        );


      const response =
        await fetch(url);


      if (!response.ok) {

        throw new Error(
          `Google Drive API error: ${response.status}`
        );
      }


      const data =
        await response.json();


      const files =
        Array.isArray(data.files)
          ? data.files
          : [];


      // ========================================
      // ACCEPT MP3 / WMA
      // ========================================

      driveSongs =
        files

          .filter(file => {

            const name =
              String(
                file.name || ""
              ).toLowerCase();

            return (
              name.endsWith(".mp3") ||
              name.endsWith(".wma")
            );

          })

          .map((file, index) => {

            const cleanName =
              file.name
                .replace(
                  /\.(mp3|wma)$/i,
                  ""
                )
                .trim();


            return {

              id:
                `drive-${file.id}`,

              fileId:
                file.id,

              title:
                cleanName ||
                `Song ${index + 1}`,

              artist:
                "Google Drive",

              fileName:
                file.name,

              mimeType:
                file.mimeType,

              size:
                file.size || null,

              streamUrl:
                getDriveUrl(
                  file.id
                ),

              source:
                "drive",

              favorite:
                false

            };

          });


      // ========================================
      // SORT BY FILE NAME
      // ========================================

      driveSongs.sort(
        (a, b) =>
          a.fileName.localeCompare(
            b.fileName,
            undefined,
            {
              numeric: true,
              sensitivity: "base"
            }
          )
      );


      renderDriveSongs();


      showDriveStatus(
        `${driveSongs.length} songs loaded`
      );


      updateEmptyState();


    } catch (error) {

      console.error(
        "Google Drive error:",
        error
      );


      showDriveStatus(
        "Could not load Google Drive music."
      );

      console.error(error);

    } finally {

      if (driveConnectBtn) {

        driveConnectBtn.disabled = false;

        driveConnectBtn.textContent =
          "Load Drive Music";
      }

    }

  }


  // ==========================================
  // DRIVE STATUS
  // ==========================================

  function showDriveStatus(message) {

    if (driveStatus) {

      driveStatus.textContent =
        message;
    }

  }


  // ==========================================
  // GET CURRENT SONGS
  // ==========================================

  function getFilteredSongs(songs) {

    if (!searchText.trim()) {

      return [...songs];
    }


    const query =
      searchText
        .trim()
        .toLowerCase();


    return songs.filter(song => {

      const title =
        String(
          song.title || ""
        ).toLowerCase();


      const artist =
        String(
          song.artist || ""
        ).toLowerCase();


      const filename =
        String(
          song.fileName || ""
        ).toLowerCase();


      return (
        title.includes(query) ||
        artist.includes(query) ||
        filename.includes(query)
      );

    });

  }


  function getCurrentSongs() {

    if (
      currentView === "drive"
    ) {

      return getFilteredSongs(
        driveSongs
      );
    }


    return getFilteredSongs(
      localSongs
    );

  }


  // ==========================================
  // PLAY SONG
  // ==========================================

  function playSong(index) {

    const songs =
      getCurrentSongs();


    if (!songs.length) {
      return;
    }


    if (
      index < 0 ||
      index >= songs.length
    ) {
      return;
    }


    const song =
      songs[index];


    currentPlaylist =
      songs;


    currentIndex =
      index;


    // ========================================
    // LOCAL
    // ========================================

    if (
      song.source === "local"
    ) {

      if (localObjectUrl) {

        URL.revokeObjectURL(
          localObjectUrl
        );

        localObjectUrl =
          null;
      }


      localObjectUrl =
        URL.createObjectURL(
          song.file
        );


      audio.src =
        localObjectUrl;

    }


    // ========================================
    // GOOGLE DRIVE
    // ========================================

    else if (
      song.source === "drive"
    ) {

      audio.src =
        song.streamUrl;

    }


    // ========================================
    // UI
    // ========================================

    if (songTitle) {

      songTitle.textContent =
        song.title;
    }


    if (songArtist) {

      songArtist.textContent =
        song.artist;
    }


    updateActiveSong();


    audio.load();


    audio
      .play()
      .then(() => {

        isPlaying =
          true;

        updatePlayButton();

      })
      .catch(error => {

        console.error(
          "Playback error:",
          error
        );

        isPlaying =
          false;

        updatePlayButton();

      });

  }


  // ==========================================
  // PLAY / PAUSE
  // ==========================================

  function togglePlay() {

    if (!audio.src) {

      const songs =
        getCurrentSongs();


      if (songs.length) {

        playSong(0);
      }

      return;
    }


    if (audio.paused) {

      audio
        .play()
        .then(() => {

          isPlaying =
            true;

          updatePlayButton();

        });

    } else {

      audio.pause();

      isPlaying =
        false;

      updatePlayButton();

    }

  }


  // ==========================================
  // PLAY BUTTON
  // ==========================================

  function updatePlayButton() {

    if (!playBtn) {
      return;
    }


    if (isPlaying) {

      playBtn.innerHTML =
        "❚❚";

      playBtn.setAttribute(
        "aria-label",
        "Pause"
      );

    } else {

      playBtn.innerHTML =
        "▶";

      playBtn.setAttribute(
        "aria-label",
        "Play"
      );

    }

  }


  // ==========================================
  // PREVIOUS
  // ==========================================

  function playPrevious() {

    const songs =
      getCurrentSongs();


    if (!songs.length) {
      return;
    }


    if (
      audio.currentTime > 3
    ) {

      audio.currentTime =
        0;

      return;
    }


    let index =
      currentIndex - 1;


    if (index < 0) {

      index =
        songs.length - 1;
    }


    playSong(index);

  }


  // ==========================================
  // NEXT
  // ==========================================

  function playNext() {

    const songs =
      getCurrentSongs();


    if (!songs.length) {
      return;
    }


    let index;


    if (isShuffle) {

      if (songs.length === 1) {

        index = 0;

      } else {

        do {

          index =
            Math.floor(
              Math.random() *
              songs.length
            );

        } while (
          index === currentIndex
        );

      }

    } else {

      index =
        currentIndex + 1;


      if (
        index >= songs.length
      ) {

        index = 0;
      }

    }


    playSong(index);

  }


  // ==========================================
  // AUDIO END
  // ==========================================

  function handleEnded() {

    if (
      repeatMode === "one"
    ) {

      audio.currentTime =
        0;

      audio.play();

      return;
    }


    const songs =
      getCurrentSongs();


    if (!songs.length) {
      return;
    }


    if (
      currentIndex ===
        songs.length - 1 &&
      repeatMode === "off"
    ) {

      isPlaying =
        false;

      updatePlayButton();

      return;
    }


    playNext();

  }


  // ==========================================
  // SHUFFLE
  // ==========================================

  function toggleShuffle() {

    isShuffle =
      !isShuffle;


    if (shuffleBtn) {

      shuffleBtn.classList.toggle(
        "active",
        isShuffle
      );

    }

  }


  // ==========================================
  // REPEAT
  // ==========================================

  function toggleRepeat() {

    if (
      repeatMode === "off"
    ) {

      repeatMode =
        "all";

    } else if (
      repeatMode === "all"
    ) {

      repeatMode =
        "one";

    } else {

      repeatMode =
        "off";

    }


    updateRepeatButton();

  }


  function updateRepeatButton() {

    if (!repeatBtn) {
      return;
    }


    repeatBtn.classList.toggle(
      "active",
      repeatMode !== "off"
    );


    repeatBtn.textContent =
      repeatMode === "one"
        ? "🔂"
        : "🔁";

  }


  // ==========================================
  // PROGRESS
  // ==========================================

  function updateProgress() {

    if (!audio.duration) {
      return;
    }


    const percent =
      (
        audio.currentTime /
        audio.duration
      ) * 100;


    if (progressBar) {

      progressBar.value =
        percent || 0;
    }


    if (currentTimeEl) {

      currentTimeEl.textContent =
        formatTime(
          audio.currentTime
        );
    }


    if (durationEl) {

      durationEl.textContent =
        formatTime(
          audio.duration
        );
    }

  }


  function seekAudio() {

    if (!audio.duration) {
      return;
    }


    audio.currentTime =
      (
        Number(
          progressBar.value
        ) / 100
      ) *
      audio.duration;

  }


  // ==========================================
  // VOLUME
  // ==========================================

  function updateVolume() {

    if (!volumeBar) {
      return;
    }


    const volume =
      Number(
        volumeBar.value
      );


    audio.volume =
      volume;


    audio.muted =
      volume === 0;

  }


  // ==========================================
  // SEARCH
  // ==========================================

  function handleSearch() {

    searchText =
      searchInput?.value || "";


    if (
      currentView === "drive"
    ) {

      renderDriveSongs();

    } else {

      renderLocalSongs();

    }


    updateEmptyState();

  }


  // ==========================================
  // RENDER DRIVE
  // ==========================================

  function renderDriveSongs() {

    if (!driveMusicList) {
      return;
    }


    const songs =
      getFilteredSongs(
        driveSongs
      );


    driveMusicList.innerHTML =
      "";


    songs.forEach(
      (song, index) => {

        const item =
          document.createElement(
            "div"
          );


        item.className =
          "song-item";


        item.dataset.id =
          song.id;


        item.innerHTML = `

          <div class="song-info">

            <div class="song-title">
              ${escapeHtml(
                song.title
              )}
            </div>

            <div class="song-artist">
              ${escapeHtml(
                song.artist
              )}
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


            currentView =
              "drive";


            playSong(index);

          }
        );


        const button =
          item.querySelector(
            ".song-play-btn"
          );


        if (button) {

          button.addEventListener(
            "click",
            event => {

              event.stopPropagation();


              currentView =
                "drive";


              playSong(index);

            }
          );

        }


        driveMusicList.appendChild(
          item
        );

      }
    );


    updateActiveSong();

  }


  // ==========================================
  // LOCAL MUSIC
  // ==========================================

  function loadLocalMusic(files) {

    if (!files?.length) {
      return;
    }


    const selected =
      Array.from(files);


    const mp3Files =
      selected.filter(file => {

        return (
          file.type ===
            "audio/mpeg" ||
          file.name
            .toLowerCase()
            .endsWith(".mp3")
        );

      });


    localSongs =
      mp3Files.map(
        (file, index) => {

          return {

            id:
              `local-${index}-${file.name}`,

            title:
              file.name.replace(
                /\.mp3$/i,
                ""
              ),

            artist:
              "Local Music",

            file:
              file,

            source:
              "local",

            favorite:
              false

          };

        }
      );


    currentView =
      "local";


    renderLocalSongs();

    updateEmptyState();

  }


  function renderLocalSongs() {

    if (!localMusicList) {
      return;
    }


    const songs =
      getFilteredSongs(
        localSongs
      );


    localMusicList.innerHTML =
      "";


    songs.forEach(
      (song, index) => {

        const item =
          document.createElement(
            "div"
          );


        item.className =
          "song-item";


        item.dataset.id =
          song.id;


        item.innerHTML = `

          <div class="song-info">

            <div class="song-title">
              ${escapeHtml(
                song.title
              )}
            </div>

            <div class="song-artist">
              ${escapeHtml(
                song.artist
              )}
            </div>

          </div>

          <button
            class="song-play-btn"
            type="button"
          >
            ▶
          </button>

        `;


        item.addEventListener(
          "click",
          () => {

            currentView =
              "local";


            playSong(index);

          }
        );


        localMusicList.appendChild(
          item
        );

      }
    );


    updateActiveSong();

  }


  // ==========================================
  // ACTIVE SONG
  // ==========================================

  function updateActiveSong() {

    document
      .querySelectorAll(
        ".song-item"
      )
      .forEach(item => {

        item.classList.remove(
          "active"
        );

      });


    if (
      currentIndex < 0 ||
      !currentPlaylist[
        currentIndex
      ]
    ) {
      return;
    }


    const song =
      currentPlaylist[
        currentIndex
      ];


    const items =
      document.querySelectorAll(
        ".song-item"
      );


    items.forEach(item => {

      if (
        item.dataset.id ===
        song.id
      ) {

        item.classList.add(
          "active"
        );

      }

    });

  }


  // ==========================================
  // EMPTY STATE
  // ==========================================

  function updateEmptyState() {

    if (!emptyState) {
      return;
    }


    const songs =
      currentView === "drive"
        ? getFilteredSongs(
            driveSongs
          )
        : getFilteredSongs(
            localSongs
          );


    if (songs.length) {

      emptyState.style.display =
        "none";

    } else {

      emptyState.style.display =
        "";

      emptyState.textContent =
        currentView === "drive"
          ? "No music found in Google Drive."
          : "Choose MP3 files to start listening.";

    }

  }


  // ==========================================
  // VIEW
  // ==========================================

  function switchView(view) {

    currentView =
      view;


    if (
      view === "drive"
    ) {

      renderDriveSongs();

    } else {

      renderLocalSongs();

    }


    updateEmptyState();

  }


  // ==========================================
  // BUTTON EVENTS
  // ==========================================

  if (playBtn) {

    playBtn.addEventListener(
      "click",
      togglePlay
    );

  }


  if (prevBtn) {

    prevBtn.addEventListener(
      "click",
      playPrevious
    );

  }


  if (nextBtn) {

    nextBtn.addEventListener(
      "click",
      playNext
    );

  }


  if (shuffleBtn) {

    shuffleBtn.addEventListener(
      "click",
      toggleShuffle
    );

  }


  if (repeatBtn) {

    repeatBtn.addEventListener(
      "click",
      toggleRepeat
    );

  }


  if (progressBar) {

    progressBar.addEventListener(
      "input",
      seekAudio
    );

  }


  if (volumeBar) {

    volumeBar.addEventListener(
      "input",
      updateVolume
    );

  }


  if (searchInput) {

    searchInput.addEventListener(
      "input",
      handleSearch
    );

  }


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


  // ==========================================
  // DRIVE BUTTON
  // ==========================================

  if (driveConnectBtn) {

    driveConnectBtn.textContent =
      "Load Drive Music";


    driveConnectBtn.addEventListener(
      "click",
      loadPublicDriveMusic
    );

  }


  if (driveRefreshBtn) {

    driveRefreshBtn.addEventListener(
      "click",
      loadPublicDriveMusic
    );

  }


  // ==========================================
  // NAVIGATION
  // ==========================================

  document
    .querySelectorAll(
      "[data-view]"
    )
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


  // ==========================================
  // AUDIO EVENTS
  // ==========================================

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

      isPlaying =
        true;

      updatePlayButton();

    }
  );


  audio.addEventListener(
    "pause",
    () => {

      isPlaying =
        false;

      updatePlayButton();

    }
  );


  audio.addEventListener(
    "ended",
    handleEnded
  );


  audio.addEventListener(
    "error",
    () => {

      const song =
        currentPlaylist[
          currentIndex
        ];


      if (
        song?.source ===
        "drive"
      ) {

        showDriveStatus(
          "This file cannot be played. Check Google Drive sharing."
        );

        console.error(
          "Drive audio error:",
          song
        );

      }

    }
  );


  // ==========================================
  // KEYBOARD
  // ==========================================

  document.addEventListener(
    "keydown",
    event => {

      if (
        event.target.tagName ===
          "INPUT" ||
        event.target.tagName ===
          "TEXTAREA"
      ) {
        return;
      }


      if (
        event.code ===
        "Space"
      ) {

        event.preventDefault();

        togglePlay();

      }


      if (
        event.code ===
        "ArrowRight"
      ) {

        if (audio.duration) {

          audio.currentTime =
            Math.min(
              audio.duration,
              audio.currentTime + 5
            );

        }

      }


      if (
        event.code ===
        "ArrowLeft"
      ) {

        audio.currentTime =
          Math.max(
            0,
            audio.currentTime - 5
          );

      }

    }
  );


  // ==========================================
  // INITIALIZE
  // ==========================================

  audio.volume =
    volumeBar
      ? Number(
          volumeBar.value
        ) || 1
      : 1;


  updatePlayButton();

  updateRepeatButton();


  // ==========================================
  // AUTO LOAD GOOGLE DRIVE
  // ==========================================

  if (
    DRIVE_CONFIG?.autoLoad
  ) {

    loadPublicDriveMusic();

  }


  console.log(
    "My Music Player initialized."
  );

  console.log(
    "Drive Folder:",
    DRIVE_CONFIG?.folderId
  );

});
