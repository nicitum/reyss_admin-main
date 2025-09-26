import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/reyss_test/', // Add this line to set the base URL
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});