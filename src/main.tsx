import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import './styles/index.css'

/**
 * React application entry point.
 *
 * Wraps the application in:
 *   - React.StrictMode — surfaces potential issues in development
 *   - BrowserRouter    — provides React Router context (library mode)
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
