import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'prompt',
            includeAssets: ['logo.png', 'sw-push.js'],
            // Inject our custom push handler into Workbox's generated SW
            injectManifest: undefined,
            strategies: 'generateSW',
            workbox: {
                // Import the push notification handler
                importScripts: ['/sw-push.js'],
                // Cache strategy for assets
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } }
                    }
                ]
            },
            manifest: {
                name: 'Smart Repair Staff Portal',
                short_name: 'Smart Royal Staff',
                description: 'Manage vehicle repairs and technician tasks.',
                theme_color: '#198754',
                background_color: '#f4f6f9',
                display: 'standalone',
                scope: '/',
                start_url: '/',
                icons: [
                    {
                        src: 'logo.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: 'logo.png',
                        sizes: '512x512',
                        type: 'image/png'
                    }
                ]
            }
        })
    ],
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'https://smartvehiclerepaircenter.onrender.com',
                changeOrigin: true
            }
        }
    }
})