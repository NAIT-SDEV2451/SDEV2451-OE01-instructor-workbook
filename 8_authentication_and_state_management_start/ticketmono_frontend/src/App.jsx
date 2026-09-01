import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Navbar from './components/Navbar'

import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import EventsListPage from './pages/attendee/EventsListPage'
import EventDetailPage from './pages/attendee/EventDetailPage'
import SelectTicketsPage from './pages/attendee/SelectTicketsPage'
import CheckoutPage from './pages/attendee/CheckoutPage'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <AuthProvider>
    <BrowserRouter>
      <div className="min-h-screen bg-base-200">
        <Navbar />
        <main className="p-6 max-w-5xl mx-auto">
          <Routes>
            <Route path="/" element={<EventsListPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/events/:id" element={<EventDetailPage />} />
            <Route path="/events/:id/tickets" element={<ProtectedRoute><SelectTicketsPage /></ProtectedRoute>} />
            <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
    </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
