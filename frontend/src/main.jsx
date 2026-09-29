import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import './seungwoo.css'
import './lime-theme.css'
import './moa-brand.css'
import './moa-unified.css'
import App from './App.jsx'
import AppBoundary from './components/AppBoundary.jsx'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', {updateViaCache:'none'}).catch(() => {
      // Online learning remains available when offline storage is not supported.
    });
  }, {once:true});
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppBoundary><App /></AppBoundary>
  </StrictMode>,
)
