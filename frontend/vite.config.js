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
          icons: [
            
          ]
        },
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true,
        },
      }
    )
  ],
})
