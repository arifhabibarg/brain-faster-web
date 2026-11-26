import { generateSW } from 'workbox-build';

const result = await generateSW({
  mode: 'development',
  globDirectory: 'dist',
  globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,json,webp,jpg,jpeg,mp3,ogg}'],
  swDest: 'dist/sw.js',
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
  navigateFallback: '/index.html',
  navigateFallbackDenylist: [/^\/__\/auth\//, /^\/api\//],
});

console.log('Service Worker created:', result.count, 'files,', result.size, 'bytes');
