import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const environmentDirectory = fileURLToPath(new URL('../../', import.meta.url));

export default defineConfig(({ mode }) => {
    const environment = loadEnv(mode, environmentDirectory, 'DEV_API_TARGET');
    const target =
        process.env.DEV_API_TARGET || environment.DEV_API_TARGET || 'http://127.0.0.1:3002';
    const proxy = {
        '/api': { target },
        '/dead-cells-roulette/api': { target },
    };

    return {
        plugins: [react(), tailwindcss()],
        server: { host: '127.0.0.1', port: 5174, strictPort: true, proxy },
        preview: { host: '127.0.0.1', port: 4174, strictPort: true, proxy },
    };
});
