import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e-cloud',
  use: {
    baseURL: 'http://127.0.0.1:4301',
    browserName: 'chromium',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },
  webServer: {
    command: 'npx ng serve --configuration development --host 127.0.0.1 --port 4301',
    url: 'http://127.0.0.1:4301',
    reuseExistingServer: false,
  },
});
