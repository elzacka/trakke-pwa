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
              'content': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://cache.kartverket.no https://opencache.statkart.no; font-src 'self'; connect-src 'self' https://cache.kartverket.no https://ws.geonorge.no https://opencache.statkart.no https://ogc.dsb.no https://overpass-api.de https://api.met.no https://api.ra.no https://*.supabase.co; worker-src 'self' blob:; manifest-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self';"
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
        id: '/trakke-pwa/',
        name: 'Tråkke',
        short_name: 'Tråkke',
        description: 'Norsk friluftsapp med offline kart og innebygd personvern',
        theme_color: '#3e4533',
        background_color: '#f1f5f9',
        display: 'standalone',
        orientation: 'any',
        start_url: '/trakke-pwa/',
        scope: '/trakke-pwa/',
        lang: 'no',
        categories: ['navigation', 'travel', 'utilities'],
        icons: [
          {
            src: '/trakke-pwa/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/trakke-pwa/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/trakke-pwa/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/trakke-pwa/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        // Screenshots commented out until files are created
        // Uncomment after creating screenshot files in public/screenshots/
        // screenshots: [
        //   {
        //     src: '/trakke-pwa/screenshots/mobile-map.webp',
        //     sizes: '1080x1920',
        //     type: 'image/webp',
        //     form_factor: 'narrow',
        //     label: 'Kartvisning'
        //   },
        //   {
        //     src: '/trakke-pwa/screenshots/mobile-search.webp',
        //     sizes: '1080x1920',
        //     type: 'image/webp',
        //     form_factor: 'narrow',
        //     label: 'Søk'
        //   },
        //   {
        //     src: '/trakke-pwa/screenshots/mobile-offline.webp',
        //     sizes: '1080x1920',
        //     type: 'image/webp',
        //     form_factor: 'narrow',
        //     label: 'Offline'
        //   },
        //   {
        //     src: '/trakke-pwa/screenshots/desktop-map.webp',
        //     sizes: '1920x1080',
        //     type: 'image/webp',
        //     form_factor: 'wide',
        //     label: 'Kart'
        //   }
        // ],
        shortcuts: [
          {
            name: 'Søk',
            url: '/trakke-pwa/?action=search',
            icons: [{ src: '/trakke-pwa/icon-192.png', sizes: '192x192' }]
          },
          {
            name: 'Last ned',
            url: '/trakke-pwa/?action=download',
            icons: [{ src: '/trakke-pwa/icon-192.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,ttf}'],
        // Exclude large font file from precache (use runtime caching instead)
        globIgnores: ['**/MaterialSymbolsOutlined.woff2'],
        runtimeCaching: [
          {
            // Kartverket WMTS tiles (topo & grayscale)
            urlPattern: /^https:\/\/cache\.kartverket\.no\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'kartverket-tiles',
              expiration: {
                maxEntries: 25000, // Increased to support large offline downloads (up to MAX_TILES limit)
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Norge i bilder WMTS tiles (satellite)
            urlPattern: /^https:\/\/opencache\.statkart\.no\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'norge-i-bilder-tiles',
              expiration: {
                maxEntries: 25000, // Same as kartverket-tiles for consistency
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
    strictPort: true,
    host: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
    host: true,
  },
})
