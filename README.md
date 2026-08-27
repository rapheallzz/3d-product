# Atlas — 3D Product Configurator

An interactive 3D product configurator built with **React** and raw **Three.js / WebGL**. Features real-time material swapping (wood, metal, fabric, leather finishes) on a procedurally built lounge chair, custom drag-to-orbit / scroll-to-zoom camera controls, a PNG snapshot export, and real (feature-detected) **WebXR AR** support for compatible mobile devices.

## Requirements

- [Node.js](https://nodejs.org/) 18+ and npm

## Setup

```bash
npm install
npm run dev
```

Then open the URL Vite prints (default `http://localhost:3000`).

## Scripts

| Command           | Description                              |
|--------------------|-------------------------------------------|
| `npm run dev`      | Start the local dev server with hot reload |
| `npm run build`     | Build a production bundle into `dist/`     |
| `npm run preview`   | Preview the production build locally       |

## Project structure

```
├── index.html            # HTML entry point
├── vite.config.js         # Vite + React plugin config
├── package.json           # Dependencies & scripts
└── src/
    ├── main.jsx            # React root mount
    ├── App.jsx             # The configurator (scene, controls, UI)
    └── index.css           # Global reset / base styles
```

## How it works

- **Rendering**: a single `THREE.WebGLRenderer` is created against a `<canvas>` ref inside a `useEffect`. The chair (frame + cushions) is built from primitive geometry (`BoxGeometry`, `CylinderGeometry`) rather than a loaded model, so there are no binary asset dependencies.
- **Material swapping**: each swatch selection updates a "target" color/roughness/metalness object; every animation frame, the actual material properties lerp toward that target, giving a smooth real-time transition instead of a hard snap.
- **Camera controls**: orbit/zoom are hand-rolled with pointer + wheel events driving spherical coordinates — no `OrbitControls` dependency required, though you're free to swap in `three/examples/jsm/controls/OrbitControls.js` since it's available in a normal npm install.
- **AR**: on click, the app checks `navigator.xr` and, if `immersive-ar` is supported, requests a real WebXR session and hands it to `renderer.xr`. Browsers only allow WebXR on **secure contexts** — `localhost` is fine for local dev, but testing on a phone over your LAN requires HTTPS (e.g. via `mkcert` or a tunneling tool like `ngrok`).

## Deploying

`npm run build` outputs a static `dist/` folder that can be hosted anywhere that serves static files (Vercel, Netlify, GitHub Pages, S3, etc.). For AR testing on a real device, make sure the deployed URL is served over HTTPS.

## Customizing

- Swap in your own product geometry inside the `useEffect` in `src/App.jsx` (the `addFrameMesh` / `addCushionMesh` helpers).
- Add more configurable parts by creating additional `MeshStandardMaterial` instances, target objects, and swatch preset arrays following the existing `FRAME_PRESETS` / `UPHOLSTERY_PRESETS` pattern.
- Colors, type, and layout tokens live in the `<style>` block at the top of `App.jsx` under CSS custom properties (`--bg`, `--panel`, `--accent`, etc.).
