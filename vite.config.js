import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0',
        port: 5173,
        allowedHosts: ['gigaide-3362c4ca-9df2-49f1-b920-1da0b526ff05-5173.internal.containers.cloud.ru']
    }
});
