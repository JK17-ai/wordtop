import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import {offlinePlugin} from './offlinePlugin.mjs'

export default defineConfig({
  cacheDir: './.vite-cache',
  plugins: [react(),offlinePlugin()],
})
