import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.tsx'

const RecipePage = lazy(() => import('./pages/RecipePage.tsx'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/recipe/:slug" element={
          <Suspense fallback={
            <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-[#C49A5C] border-t-transparent rounded-full animate-spin" />
            </div>
          }>
            <RecipePage />
          </Suspense>
        } />
      </Routes>
    </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
)
