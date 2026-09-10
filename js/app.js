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

let driveAccessToken = "";
let driveTokenClient = null;
let driveFolderId = null;
let currentDriveBlobUrl = null;

const DRIVE_SCOPE =
  "https://www.googleapis.com/auth/drive.readonly";

const DRIVE_API =
  "https://www.googleapis.com/drive/v3";

const $ = id => document.getElementById(id);


/* =========================================================
   HELPERS
========================================================= */

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  const m = Math.floor(seconds / 60);

  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${m}:${s}`;
}


function makeId() {
  if (
    window.crypto &&
    typeof window.crypto.randomUUID === "function"
  ) {
    return window.crypto.randomUUID();
  }

  return Date.now() + "-" + Math.random();
}


function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[c])
  );
}


/* =========================================================
   LOCAL MUSIC
========================================================= */

function getLocalMeta(file) {
  return {
    id: makeId(),
    title: file.name.replace(/\.mp3$/i, ""),
    artist: "Local file",
    file: file,
    type: "local",
    duration: 0,
    favorite: false
  };
}


/* =========================================================
   DRIVE MUSIC
========================================================= */

function getDriveMeta(file) {
  return {
    id: "drive-" + file.id,
    driveId: file.id,
    title: file.name.replace(/\.mp3$/i, ""),
    artist: "Google Drive",
    type: "drive",
    duration: 0,
    favorite: false,
    mimeType: file.mimeType || "audio/mpeg"
  };
}


/* =========================================================
   VISIBLE SONGS
========================================================= */

function visibleSongs() {
  let source;

  if (currentView === "drive") {
    source = driveSongs;
  } else if (currentView === "favorites") {
    source = [...localSongs, ...driveSongs]
      .filter(song => song.favorite);
  } else {
    source = localSongs;
  }

  const q = searchInput.value
    .trim()
    .toLowerCase();

  if (!q) {
    return source;
  }

  return source.filter(song =>
    `${song.title} ${song.artist}`
      .toLowerCase()
      .includes(q)
  );
}


/* =========================================================
   RENDER
========================================================= */

function render() {
  currentSongs = visibleSongs();

  $("songCount").textContent =
    `${currentSongs.length} song${currentSongs.length === 1 ? "" : "s"}`;

  songList.innerHTML = "";

  emptyState.classList.toggle(
    "hidden",
    currentSongs.length > 0
  );

  if (!currentSongs.length) {
    return;
  }

  currentSongs.forEach((song, i) => {

    const row = document.createElement("div");

    row.className =
      "song" +
      (
        currentIndex >= 0 &&
        currentSongs[currentIndex]?.id === song.id
          ? " active"
          : ""
      );

    row.innerHTML = `
      <div class="song-cover">♪</div>

      <div class="song-meta">
        <strong class="song-title">
          ${escapeHtml(song.title)}
        </strong>

        <span class="song-artist">
          ${escapeHtml(song.artist || "Unknown")}
        </span>
      </div>

      <span class="song-duration">
        ${formatTime(song.duration)}
      </span>

      <button
        class="fav-row"
        title="Favorite"
      >
        ${song.favorite ? "♥" : "♡"}
      </button>
    `;

    row.addEventListener("click", event => {

      if (event.target.closest(".fav-row")) {

        song.favorite = !song.favorite;

        if (
          currentSongs[currentIndex] &&
          currentSongs[currentIndex].id === song.id
        ) {
          $("favoriteBtn").textContent =
            song.favorite ? "♥" : "♡";
        }

        render();
        return;
      }

      playIndex(i);
    });

    songList.appendChild(row);
  });
}


/* =========================================================
   PLAY SONG
========================================================= */

async function playIndex(index) {

  if (!currentSongs[index]) {
    return;
  }

  currentIndex = index;

  const song = currentSongs[index];

  $("nowTitle").textContent =
    song.title;

  $("nowArtist").textContent =
    song.artist || "Unknown";

  $("favoriteBtn").textContent =
    song.favorite ? "♥" : "♡";


  /* -----------------------------------------
     LOCAL FILE
  ----------------------------------------- */

  if (song.type === "local") {

    cleanupDriveBlob();

    audio.src =
      URL.createObjectURL(song.file);

    try {
      await audio.play();
    } catch (error) {
      console.warn("Playback:", error);
    }

    render();

    return;
  }


  /* -----------------------------------------
     GOOGLE DRIVE FILE
  ----------------------------------------- */

  if (song.type === "drive") {

    if (!driveAccessToken) {

      $("driveStatus").textContent =
        "Please connect Google Drive first.";

      return;
    }

    $("driveStatus").textContent =
      `Loading: ${song.title}`;

    try {

      await playDriveSong(song);

    } catch (error) {

      console.error(error);

      $("driveStatus").textContent =
        "Unable to play this Google Drive file.";

      alert(
        "Google Drive song ဖွင့်လို့မရပါ။ Google Drive ကို Refresh/Connect ပြန်လုပ်ကြည့်ပါ။"
      );
    }

    render();
  }
}


/* =========================================================
   PLAY GOOGLE DRIVE SONG
========================================================= */

async function playDriveSong(song) {

  cleanupDriveBlob();

  const response = await fetch(
    `${DRIVE_API}/files/${encodeURIComponent(song.driveId)}?alt=media`,
    {
      method: "GET",

      headers: {
        Authorization:
          `Bearer ${driveAccessToken}`
      }
    }
  );


  if (!response.ok) {

    const text =
      await response.text();

    console.error(
      "Drive download error:",
      response.status,
      text
    );

    throw new Error(
      `Drive download failed: ${response.status}`
    );
  }


  const blob =
    await response.blob();


  currentDriveBlobUrl =
    URL.createObjectURL(blob);


  audio.src =
    currentDriveBlobUrl;


  await audio.play();


  $("driveStatus").textContent =
    `${driveSongs.length} songs loaded from My Music`;
}


/* =========================================================
   CLEAN DRIVE BLOB
========================================================= */

function cleanupDriveBlob() {

  if (currentDriveBlobUrl) {

    URL.revokeObjectURL(
      currentDriveBlobUrl
    );

    currentDriveBlobUrl = null;
  }
}


/* =========================================================
   NEXT
========================================================= */

function next() {

  if (!currentSongs.length) {
    return;
  }

  let nextIndex;

  if (shuffle) {

    nextIndex =
      Math.floor(
        Math.random() *
        currentSongs.length
      );

  } else {

    nextIndex =
      (currentIndex + 1) %
      currentSongs.length;
  }

  playIndex(nextIndex);
}


/* =========================================================
   PREVIOUS
========================================================= */

function previous() {

  if (!currentSongs.length) {
    return;
  }

  if (audio.currentTime > 3) {

    audio.currentTime = 0;

    return;
  }

  const previousIndex =
    (
      currentIndex -
      1 +
      currentSongs.length
    ) %
    currentSongs.length;

  playIndex(previousIndex);
}


/* =========================================================
   LOCAL FILE BUTTONS
========================================================= */

$("chooseFilesBtn").onclick = () => {
  fileInput.click();
};


$("emptyChooseBtn").onclick = () => {
  fileInput.click();
};


fileInput.addEventListener(
  "change",
  event => {

    const files =
      [...event.target.files]
        .filter(file =>
          file.name
            .toLowerCase()
            .endsWith(".mp3")
        );


    localSongs.push(
      ...files.map(getLocalMeta)
    );


    currentView = "local";

    updateView();

    render();

    event.target.value = "";
  }
);


/* =========================================================
   CLEAR LOCAL
========================================================= */

$("clearLocalBtn").onclick = () => {

  localSongs = [];

  audio.pause();

  audio.removeAttribute("src");

  currentIndex = -1;

  cleanupDriveBlob();

  render();
};


/* =========================================================
   PLAY BUTTON
========================================================= */

$("playBtn").onclick = () => {

  if (!audio.src) {

    if (currentSongs.length) {
      playIndex(0);
    }

    return;
  }


  if (audio.paused) {

    audio.play();

  } else {

    audio.pause();
  }
};


/* =========================================================
   NEXT / PREVIOUS
========================================================= */

$("nextBtn").onclick = next;

$("prevBtn").onclick = previous;


/* =========================================================
   SHUFFLE
========================================================= */

$("shuffleBtn").onclick = () => {

  shuffle = !shuffle;

  $("shuffleBtn")
    .classList
    .toggle(
      "active",
      shuffle
    );
};


/* =========================================================
   REPEAT
========================================================= */

$("repeatBtn").onclick = () => {

  repeat = !repeat;

  $("repeatBtn")
    .classList
    .toggle(
      "active",
      repeat
    );
};


/* =========================================================
   FAVORITE
========================================================= */

$("favoriteBtn").onclick = () => {

  if (!currentSongs[currentIndex]) {
    return;
  }

  const song =
    currentSongs[currentIndex];

  song.favorite =
    !song.favorite;

  $("favoriteBtn").textContent =
    song.favorite ? "♥" : "♡";

  render();
};


/* =========================================================
   AUDIO EVENTS
========================================================= */

audio.addEventListener(
  "play",
  () => {
    $("playBtn").textContent = "⏸";
  }
);


audio.addEventListener(
  "pause",
  () => {
    $("playBtn").textContent = "▶";
  }
);


audio.addEventListener(
  "loadedmetadata",
  () => {

    $("duration").textContent =
      formatTime(audio.duration);

    if (currentSongs[currentIndex]) {

      currentSongs[currentIndex].duration =
        audio.duration;

      render();
    }
  }
);


audio.addEventListener(
  "timeupdate",
  () => {

    $("currentTime").textContent =
      formatTime(audio.currentTime);

    $("progress").value =
      audio.duration
        ? (
            audio.currentTime /
            audio.duration
          ) * 100
        : 0;
  }
);


audio.addEventListener(
  "ended",
  () => {

    if (repeat) {

      playIndex(currentIndex);

    } else {

      next();
    }
  }
);


/* =========================================================
   PROGRESS
========================================================= */

$("progress").addEventListener(
  "input",
  event => {

    if (audio.duration) {

      audio.currentTime =
        (
          Number(event.target.value) /
          100
        ) *
        audio.duration;
    }
  }
);


/* =========================================================
   VOLUME
========================================================= */

$("volume").addEventListener(
  "input",
  event => {

    audio.volume =
      Number(event.target.value);
  }
);


audio.volume = 0.8;


/* =========================================================
   SEARCH
========================================================= */

searchInput.addEventListener(
  "input",
  render
);


/* =========================================================
   NAVIGATION
========================================================= */

document
  .querySelectorAll(".nav-btn")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        currentView =
          button.dataset.view;

        updateView();

        render();
      }
    );
  });


/* =========================================================
   UPDATE VIEW
========================================================= */

function updateView() {

  document
    .querySelectorAll(".nav-btn")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.view === currentView
      );
    });


  const titles = {

    local: [
      "Local Music",
      "Play MP3 files directly from your browser."
    ],

    drive: [
      "Google Drive",
      "Play MP3 files from your Google Drive."
    ],

    favorites: [
      "Favorites",
      "Your favorite songs."
    ]
  };


  $("viewTitle").textContent =
    titles[currentView][0];

  $("viewSubtitle").textContent =
    titles[currentView][1];


  $("sectionTitle").textContent =
    currentView === "favorites"
      ? "Favorites"
      : "Songs";


  $("drivePanel")
    .classList
    .toggle(
      "hidden",
      currentView !== "drive"
    );
}


/* =========================================================
   WAIT FOR GOOGLE GIS
========================================================= */

function waitForGoogleGIS() {

  return new Promise(
    (resolve, reject) => {

      let attempts = 0;

      const timer =
        setInterval(() => {

          attempts++;

          if (
            window.google &&
            google.accounts &&
            google.accounts.oauth2
          ) {

            clearInterval(timer);

            resolve();

            return;
          }


          if (attempts >= 100) {

            clearInterval(timer);

            reject(
              new Error(
                "Google Identity Services did not load."
              )
            );
          }

        }, 100);
    }
  );
}


/* =========================================================
   INITIALIZE GOOGLE OAUTH
========================================================= */

async function initDriveOAuth() {

  try {

    await waitForGoogleGIS();


    if (
      typeof DRIVE_CONFIG === "undefined" ||
      !DRIVE_CONFIG.clientId
    ) {

      console.warn(
        "Google Drive Client ID is missing."
      );

      return;
    }


    driveTokenClient =
      google.accounts.oauth2.initTokenClient({

        client_id:
          DRIVE_CONFIG.clientId,

        scope:
          DRIVE_SCOPE,

        callback: response => {

          if (
            response &&
            response.access_token
          ) {

            driveAccessToken =
              response.access_token;

            onDriveConnected();
          }
        }

      });


  } catch (error) {

    console.error(
      "Google OAuth initialization failed:",
      error
    );
  }
}


/* =========================================================
   CONNECT DRIVE
========================================================= */

async function connectDrive() {

  if (
    typeof DRIVE_CONFIG === "undefined" ||
    !DRIVE_CONFIG.clientId
  ) {

    $("driveStatus").textContent =
      "Add your OAuth clientId in js/config.js first.";

    return;
  }


  try {

    await waitForGoogleGIS();


    if (!driveTokenClient) {

      driveTokenClient =
        google.accounts.oauth2.initTokenClient({

          client_id:
            DRIVE_CONFIG.clientId,

          scope:
            DRIVE_SCOPE,

          callback: response => {

            if (
              response &&
              response.access_token
            ) {

              driveAccessToken =
                response.access_token;

              onDriveConnected();
            }
          }

        });
    }


    $("driveStatus").textContent =
      "Connecting to Google Drive...";


    driveTokenClient.requestAccessToken({
      prompt: "consent"
    });


  } catch (error) {

    console.error(error);

    $("driveStatus").textContent =
      "Google login failed. Please try again.";
  }
}


/* =========================================================
   AFTER CONNECTED
========================================================= */

async function onDriveConnected() {

  $("driveStatus").textContent =
    "Connected. Loading My Music...";


  $("driveConnectBtn").textContent =
    "Connected ✓";


  $("driveRefreshBtn")
    .classList
    .remove("hidden");


  try {

    await loadDriveMusic();


  } catch (error) {

    console.error(
      "Drive loading error:",
      error
    );

    $("driveStatus").textContent =
      "Connected, but could not load My Music folder.";
  }
}


/* =========================================================
   DRIVE API REQUEST
========================================================= */

async function driveRequest(
  url
) {

  const response =
    await fetch(
      url,
      {
        headers: {
          Authorization:
            `Bearer ${driveAccessToken}`
        }
      }
    );


  if (!response.ok) {

    const text =
      await response.text();

    console.error(
      "Drive API error:",
      response.status,
      text
    );

    throw new Error(
      `Google Drive API error: ${response.status}`
    );
  }


  return response.json();
}


/* =========================================================
   FIND "MY MUSIC" FOLDER
========================================================= */

async function findMyMusicFolder() {

  const params =
    new URLSearchParams({

      q:
        "name = 'My Music' " +
        "and mimeType = 'application/vnd.google-apps.folder' " +
        "and trashed = false " +
        "and 'root' in parents",

      fields:
        "files(id,name,mimeType)",

      pageSize:
        "100"
    });


  const data =
    await driveRequest(
      `${DRIVE_API}/files?${params.toString()}`
    );


  if (
    !data.files ||
    data.files.length === 0
  ) {

    throw new Error(
      "My Music folder was not found."
    );
  }


  return data.files[0].id;
}


/* =========================================================
   LOAD SONGS FROM MY MUSIC
========================================================= */

async function loadDriveMusic() {

  if (!driveAccessToken) {

    throw new Error(
      "No Google Drive access token."
    );
  }


  $("driveStatus").textContent =
    "Finding My Music folder...";


  driveFolderId =
    await findMyMusicFolder();


  $("driveStatus").textContent =
    "Loading MP3 files...";


  let allFiles = [];

  let pageToken = null;


  do {

    const params =
      new URLSearchParams({

        q:
          `'${driveFolderId}' in parents ` +
          "and trashed = false",

        fields:
          "nextPageToken,files(id,name,mimeType,size)",

        pageSize:
          "1000"
      });


    if (pageToken) {

      params.set(
        "pageToken",
        pageToken
      );
    }


    const data =
      await driveRequest(
        `${DRIVE_API}/files?${params.toString()}`
      );


    if (data.files) {

      allFiles.push(
        ...data.files
      );
    }


    pageToken =
      data.nextPageToken || null;

  } while (pageToken);


  /* -----------------------------------------
     ONLY MP3 FILES
  ----------------------------------------- */

  const mp3Files =
    allFiles.filter(file => {

      const name =
        file.name.toLowerCase();

      return (
        name.endsWith(".mp3") ||
        file.mimeType === "audio/mpeg"
      );
    });


  /*
     Keep existing favorite status
  */

  const favoriteMap =
    new Map(
      driveSongs.map(song => [
        song.driveId,
        song.favorite
      ])
    );


  driveSongs =
    mp3Files.map(file => {

      const song =
        getDriveMeta(file);

      if (
        favoriteMap.has(file.id)
      ) {

        song.favorite =
          favoriteMap.get(file.id);
      }

      return song;
    });


  driveSongs.sort(
    (a, b) =>
      a.title.localeCompare(
        b.title,
        undefined,
        {
          numeric: true,
          sensitivity: "base"
        }
      )
  );


  $("driveStatus").textContent =
    `${driveSongs.length} songs loaded from My Music`;


  currentView = "drive";

  updateView();

  render();
}


/* =========================================================
   REFRESH DRIVE
========================================================= */

async function refreshDrive() {

  if (!driveAccessToken) {

    connectDrive();

    return;
  }


  try {

    $("driveStatus").textContent =
      "Refreshing Google Drive...";


    await loadDriveMusic();

  } catch (error) {

    console.error(error);

    $("driveStatus").textContent =
      "Refresh failed. Please reconnect Google Drive.";
  }
}


/* =========================================================
   DRIVE BUTTONS
========================================================= */

$("driveConnectBtn")
  .onclick = connectDrive;


$("driveRefreshBtn")
  .onclick = refreshDrive;


/* =========================================================
   CLEANUP WHEN PAGE CLOSES
========================================================= */

window.addEventListener(
  "beforeunload",
  () => {

    cleanupDriveBlob();
  }
);


/* =========================================================
   START APP
========================================================= */

updateView();

render();

initDriveOAuth();
