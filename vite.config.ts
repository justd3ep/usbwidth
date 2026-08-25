import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        // Shortcut of `build.lib.entry`.
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              // 'usb' is a native .node addon — must NOT be bundled.
              // The electron/*.js modules use import.meta.url for createRequire —
              // bundling them into main.js breaks that. Keep them as separate files.
              external: [
                'usb',
              ],
              // Hardware detector is dynamically imported from main.ts but also
              // exports a function (registerHotplug) that is only referenced via
              // destructure inside that dynamic import. Without listing it here,
              // Rollup tree-shakes it out. Declaring it as an additional input
              // makes Rollup keep all its exports.
              input: {
                main: 'electron/main.ts',
                hardwareDetector: 'electron/hardwareDetector.js',
                topologyBuilder: 'electron/topologyBuilder.js',
                classifier: 'electron/classifier.js',
                ruleEngine: 'electron/ruleEngine.js',
                recommendationEngine: 'electron/recommendationEngine.js',
                linuxDetector: 'electron/linuxDetector.js',
                windowsDetector: 'electron/windowsDetector.js',
              },
            },
          },
        },
      },
      preload: {
        // Shortcut of `build.rollupOptions.input`.
        // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
        input: path.join(__dirname, 'electron/preload.ts'),
      },
      // Ployfill the Electron and Node.js API for Renderer process.
      // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
      // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
      renderer: process.env.NODE_ENV === 'test'
        // https://github.com/electron-vite/vite-plugin-electron-renderer/issues/78#issuecomment-2053600808
        ? undefined
        : {},
    }),
  ],
})
