import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    // Required for WebXR (AR) testing over a network on real devices,
    // since browsers only allow WebXR on secure (https) or localhost origins.
    // Use `npm run dev -- --host` and a tool like mkcert/ngrok if you need
    // HTTPS on your LAN for testing AR on a phone.
  },
  build: {
    outDir: 'dist',
  },
});
