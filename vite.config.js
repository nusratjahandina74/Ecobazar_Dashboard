import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const chunk = (id) => {
  if (!id.includes('node_modules')) return undefined
  if (/recharts|d3-|victory-vendor/.test(id)) return 'charts'
  if (/@tiptap|prosemirror|orderedmap|rope-sequence/.test(id)) return 'editor'
  if (/react|scheduler|react-router/.test(id)) return 'react'
  return undefined
}

export default defineConfig({
  plugins: [tailwindcss(), react()],
  build: { rollupOptions: { output: { manualChunks: chunk } } },
})
