# Montfort Scroll Video Demo

A static single-page scroll-scrubbed video demo. The MP4 is fixed in the
background and page scroll controls `video.currentTime`.

## Run Locally

Use any static file server from this directory:

```bash
npx serve .
```

Or with Python:

```bash
python3 -m http.server 5173
```

Then open the local URL printed by the server.

## Debug Mode

Append `?debugVideo=1` to show video diagnostics:

```text
http://localhost:5173/?debugVideo=1
```

The page also exposes:

```js
window.__montfortVideoDebug
```

## Files

- `index.html`: Page structure and video source.
- `styles.css`: Full-screen video, dark overlay, cards, responsive layout.
- `script.js`: Scroll progress to video timeline logic and diagnostics.
- `montfort-scroll-demo.mp4`: Cinematic background video.
