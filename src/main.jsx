// le point de montage
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './ui/theme.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)


// Hors développement : service worker (ouverture sans réseau) et demande de stockage durable
// (limite le risque que iOS efface les données d'un site peu visité).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
navigator.storage?.persist?.().catch(() => {});
