import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import type { Plugin } from 'vite'

// Plugin to inject CSP meta tag in production builds only
function injectCSP(): Plugin {
  return {
    name: 'inject-csp',
    transformIndexHtml(html, ctx) {
      // Only inject CSP in production builds
      if (ctx.bundle) {
        return [
          {
            tag: 'meta',
            attrs: {
              'http-equiv': 'Content-Security-Policy',
              'content': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://cache.kartverket.no; font-src 'self'; connect-src 'self' https://cache.kartverket.no https://ws.geonorge.no; worker-src 'self' blob:; manifest-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self';"
            },
            injectTo: 'head'
          }
        ]
      }
      return html
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  base: '/trakke-pwa/',
  plugins: [
    react(),
    injectCSP(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['**/*'],
      manifest: {
        name: 'Tråkke',
        short_name: 'Tråkke',
        description: 'Norsk friluftslivskart - Offline kartapplikasjon',
        theme_color: '#f1f5f9',
        background_color: '#f1f5f9',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        lang: 'no',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,ttf}'],
        // Exclude large font file from precache (use runtime caching instead)
        globIgnores: ['**/MaterialSymbolsOutlined.woff2'],
        runtimeCaching: [
          {
            // Kartverket WMTS tiles - Only external resource (GDPR compliant - Norwegian government)
            urlPattern: /^https:\/\/cache\.kartverket\.no\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'kartverket-tiles',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Local font files - Runtime cache for large Material Symbols font
            urlPattern: /\/fonts\/.*\.woff2$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'local-fonts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
          // Note: All fonts are now served locally for GDPR compliance
          // No external font requests to Google Fonts or other CDNs
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
})
