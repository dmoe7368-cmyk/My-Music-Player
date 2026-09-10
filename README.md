# My Music Player

A GitHub Pages-friendly music player built with plain HTML, CSS and JavaScript.

## Features

- Local `.mp3` file picker
- Playlist UI
- Play / pause / previous / next
- Shuffle and repeat
- Seek/progress bar
- Volume control
- Favorites
- Search
- Responsive desktop/mobile UI
- Google Drive integration scaffold

## Run locally

Because the local file picker works in a browser, you can test the UI by serving this folder with any static server.

Example with Python:

```bash
python -m http.server 8000
```

Then open:

`http://localhost:8000`

## Deploy to GitHub Pages

1. Create a GitHub repository.
2. Upload `index.html`, `css/`, and `js/`.
3. Open repository **Settings → Pages**.
4. Select **Deploy from a branch**.
5. Select your main branch and `/ (root)`.
6. Save and open the generated GitHub Pages URL.

## Google Drive setup

The Drive portion needs OAuth because a browser app cannot safely use a private Drive account with a secret credential.

High-level setup:

1. Open Google Cloud Console.
2. Create/select a project.
3. Enable **Google Drive API**.
4. Configure the OAuth consent screen.
5. Create an **OAuth 2.0 Client ID** for a Web application.
6. Add your GitHub Pages origin to Authorized JavaScript origins.
7. Put the client ID in `js/config.js`.

```js
const DRIVE_CONFIG = {
  clientId: "YOUR_CLIENT_ID.apps.googleusercontent.com",
  apiKey: "YOUR_API_KEY"
};
```

### Important

Do not put a Google service-account private key or other private secret in this GitHub repository.

For a production Drive player, use Google Identity Services to obtain a short-lived access token with the minimum required scope (`drive.readonly`) and call the Drive API from the browser.

## Suggested next upgrades

- Album art from ID3 tags
- Artist/album parsing
- Persistent playlists with IndexedDB
- Google Drive folder selection
- Drive search
- PWA/offline shell
- Lyrics
- Keyboard media controls
- Mini player
