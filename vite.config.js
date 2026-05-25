import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0',
        port: 5173,
        allowedHosts: [
            'gigaide-ef4f4f1a-da08-4157-b71f-6aad1a9e598b-5174.internal.containers.cloud.ru',
            'gigaide-ef4f4f1a-da08-4157-b71f-6aad1a9e598b-5176.internal.containers.cloud.ru',
            'gigaide-ef4f4f1a-da08-4157-b71f-6aad1a9e598b-5175.internal.containers.cloud.ru'
        ]
    }
});
