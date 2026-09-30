import { networkInterfaces } from 'node:os';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const PORT = 5173;

/** LAN URLs of this machine (IPv4, non-internal), so phones on the same network can open the dev server. */
function lanUrls(): string[] {
  const urls: string[] = [];
  for (const nets of Object.values(networkInterfaces())) {
    for (const net of nets ?? []) {
      if (net.family === 'IPv4' && !net.internal) urls.push(`http://${net.address}:${PORT}/`);
    }
  }
  // Private home/office ranges first (192.168.x.x, 10.x, 172.16–31.x); virtual adapters tend to sort last.
  const rank = (url: string) => (url.includes('//192.168.') ? 0 : url.includes('//10.') ? 1 : url.match(/\/\/172\.(1[6-9]|2\d|3[01])\./) ? 2 : 3);
  return urls.sort((a, b) => rank(a) - rank(b));
}

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Relative asset paths so the build works under any sub-path (GitHub Pages serves it at /label-drop/app/).
  base: './',
  // host: true listens on all interfaces (0.0.0.0), not just localhost, for same-LAN device testing.
  server: { host: true, port: PORT, strictPort: true },
  preview: { host: true, port: 4173 },
  // LAN URLs only for the dev server: a production build must not embed this machine's local IPs.
  define: { __LAN_URLS__: JSON.stringify(command === 'serve' ? lanUrls() : []) },
}));
