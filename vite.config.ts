/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages で配信する場合は BASE_PATH=/tt-tactics/ を付けてビルドする
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'tt-tactics',
        short_name: 'tt-tactics',
        description: '卓球の戦術を台の図と分岐図で整理する',
        lang: 'ja',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#1d5fa8',
        background_color: '#f4f6f9',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
  },
})
