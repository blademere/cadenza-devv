import { defineConfig } from 'vite'
import reactNativeWeb from 'vite-plugin-react-native-web'

export default defineConfig({
  plugins: [
    reactNativeWeb({
      jsxImportSource: 'nativewind',
    }),
  ],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
})
