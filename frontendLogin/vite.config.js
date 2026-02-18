import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['pwa-icon.svg'],
            manifest: {
                name: 'Smart Repair Staff Portal',
                short_name: 'SmartStaff',
                description: 'Manage vehicle repairs and technician tasks.',
                theme_color: '#198754',
                background_color: '#f4f6f9',
                display: 'standalone',
                scope: '/',
                start_url: '/',
                icons: [
                    {
                        src: 'pwa-icon.svg',
                        sizes: '192x192',
                        type: 'image/svg+xml'
                    },
                    {
                        src: 'pwa-icon.svg',
                        sizes: '512x512',
                        type: 'image/svg+xml'
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