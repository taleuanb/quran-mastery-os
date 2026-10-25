//La configuration du serveur de développement)
import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Chemins relatifs : l'app marche à la racine d'un domaine comme dans un sous-dossier (GitHub Pages).
  base: './',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.js'],
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
})
