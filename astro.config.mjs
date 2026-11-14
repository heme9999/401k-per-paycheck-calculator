import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://401k-per-paycheck-calculator.pages.dev',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
});
