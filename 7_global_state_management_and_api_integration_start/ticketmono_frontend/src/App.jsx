import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'

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
    <BrowserRouter>
      <div className="min-h-screen bg-base-200">
        <nav className="navbar bg-base-100 shadow px-6">
          <div className="flex-1">
            <span className="text-xl font-bold">Ticketmono</span>
          </div>
          <div className="flex gap-4">
            <NavLink to="/" className="btn btn-ghost btn-sm">Events</NavLink>
            <NavLink to="/login" className="btn btn-ghost btn-sm">Login</NavLink>
            <NavLink to="/register" className="btn btn-primary btn-sm">Register</NavLink>
          </div>
        </nav>
        <main className="p-6 max-w-5xl mx-auto">
          <Routes>
            <Route path="/" element={<EventsListPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/events/:id" element={<EventDetailPage />} />
            <Route path="/events/:id/tickets" element={<SelectTicketsPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
