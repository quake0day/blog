import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://quake0day.com',
  compressHTML: true,
  build: { inlineStylesheets: 'auto' },
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
});
