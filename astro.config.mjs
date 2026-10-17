import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://henryreads.pages.dev',
  output: 'static',
  integrations: [sitemap({filter: (page) => !['/admin', '/admin-comments', '/dashboard'].includes(new URL(page).pathname.replace(/\/$/, ''))})],
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: true
    }
  }
});
