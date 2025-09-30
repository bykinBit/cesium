import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import cesium from 'vite-plugin-cesium';

export default defineConfig({
  plugins: [vue(), cesium()],
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
    },
  },
});

