import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import CustomerMenu from './components/public/CustomerMenu.tsx'

/**
 * Router cấp cao nhất.
 *
 * - URL có ?qr=1  → render CustomerMenu (public, không cần auth)
 * - Còn lại       → render App bọc trong BrowserRouter
 */
const isQrView = new URLSearchParams(window.location.search).has('qr')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isQrView ? <CustomerMenu /> : (
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )}
  </StrictMode>,
)