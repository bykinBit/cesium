import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import cesium from 'vite-plugin-cesium';

const createProxy = () => ({
  '/td': {
    target: 'https://t0.tianditu.gov.cn',
    changeOrigin: true,
    secure: true,
    rewrite: (path) => path.replace(/^\/td/, ''),
  },
  '/mapbox': {
    target: 'https://api.mapbox.com',
    changeOrigin: true,
    secure: true,
    rewrite: (path) => path.replace(/^\/mapbox/, ''),
  },
  '/gaode': {
    target: 'https://webrd02.is.autonavi.com',
    changeOrigin: true,
    secure: true,
    rewrite: (path) => path.replace(/^\/gaode/, ''),
  },
  '/tencent': {
    target: 'https://rt0.map.gtimg.com',
    changeOrigin: true,
    secure: true,
    rewrite: (path) => path.replace(/^\/tencent/, ''),
  },
  '/baidu': {
    target: 'https://api.map.baidu.com',
    changeOrigin: true,
    secure: true,
    rewrite: (path) => path.replace(/^\/baidu/, ''),
  },
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), cesium()],
  server: {
    proxy: createProxy(),
  },
})
