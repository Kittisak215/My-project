import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Prevent mouse wheel from changing number input values globally
document.addEventListener('wheel', () => {
  if (document.activeElement.type === 'number') {
    document.activeElement.blur();
  }
}, { passive: false });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
