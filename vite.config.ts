import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import webExtension from "vite-plugin-web-extension";


// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte(), webExtension()],
  build: {
    sourcemap: true,
  }
})
