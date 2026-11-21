/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/** @returns {import('vite').Plugin} */
function preloadPrimaryFontPlugin() {
    return {
        name: 'preload-primary-roboto-font',
        transformIndexHtml: {
            order: 'post',
            handler(html, ctx) {
                const bundle = ctx.bundle;
                if (!bundle) return html;
                const fontFile = Object.keys(bundle).find(file =>
                    /(?:^|\/)roboto-latin-[^/]+\.woff2$/i.test(file)
                );
                if (!fontFile) return html;
                return {
                    html,
                    tags: [
                        {
                            tag: 'link',
                            attrs: {
                                rel: 'preload',
                                as: 'font',
                                type: 'font/woff2',
                                href: `./${fontFile}`,
                                crossorigin: true,
                            },
                            injectTo: 'head',
                        },
                    ],
                };
            },
        },
    };
}

export default defineConfig({
    plugins: [
        react(),
        preloadPrimaryFontPlugin(),
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
        rolldownOptions: {
            output: {
                codeSplitting: {
                    groups: [
                        {
                            name: 'react-vendor',
                            test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
                        },
                    ],
                },
            },
        },
    },
    test: {
        environment: 'node',
        include: ['src/**/*.test.js', 'scripts/**/*.test.js'],
    },
});
