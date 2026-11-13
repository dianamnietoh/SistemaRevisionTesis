import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  envDir: '../..', // leer .env del root del monorepo
  server: { port: 5173 }
});
