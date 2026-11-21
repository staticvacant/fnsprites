/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            workbox: {
                // Precache completo (App Shell, fontes Roboto locais, sprites .webp + ícones do manifesto)
                globPatterns: ['**/*.{js,css,html,svg,webp,woff2}'],
                cleanupOutdatedCaches: true,
                maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
            },
            manifest: {
                name: 'Pituchinhu',
                short_name: 'Pituchinhu',
                description:
                    'Rastreie, gerencie e compartilhe sua coleção de pituchinhus do Fortnite e seu progresso de dominação.',
                lang: 'pt-BR',
                theme_color: '#141218',
                background_color: '#141218',
                display: 'standalone',
                scope: './',
                start_url: './',
                icons: [
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
            },
        }),
    ],
    base: './',
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
    },
    test: {
        environment: 'node',
        include: ['src/**/*.test.js', 'scripts/**/*.test.js'],
    },
});
