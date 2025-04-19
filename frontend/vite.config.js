import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'


// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA(
      {
        manifest: {
          name: 'Soma Shopping List',
          short_name: 'Shopping List',
          description: 'Personal Shopping List App',
          theme_color: '#605dff',
          background_color: '#1d232a',
          display_override: ["window-controls-overlay", "standalone"],
          icons: [
            {
              src: 'icons/icon_32x32.png',
              sizes: '32x32',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'icons/icon_64x64.png',
              sizes: '64x64',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'icons/icon_128x128.png',
              sizes: '128x128',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'icons/icon_256x256.png',
              sizes: '256x256',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'icons/icon_512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'icons/icon_1024x1024.png',
              sizes: '1024x1024',
              type: 'image/png',
              purpose: 'any'
            }
          ]
          ,
          screenshots: [
            {
              src: 'screenshots/desktop.png',
              sizes: '3831x1973',
              type: 'image/png',
              form_factor: 'wide'
            },
            {
              src: 'screenshots/mobile.png',
              sizes: '563x1010',
              type: 'image/png',
              form_factor: 'narrow'
            }
          ],
        },
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true,
        },
      }
    )
  ],
})
