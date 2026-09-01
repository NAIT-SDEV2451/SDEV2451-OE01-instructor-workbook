import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import VehiclesAndDriversPage from './pages/VehiclesAndDriversPage'
import TripsPage from './pages/TripsPage'
import CreateTripPage from './pages/CreateTripPage'
import TripDetailPage from './pages/TripDetailPage'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-base-200">
          <nav className="navbar bg-base-100 shadow px-6">
            <div className="navbar-start">
              <span className="text-lg font-bold">Fleet Manager</span>
            </div>
            <div className="navbar-end gap-2">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `btn btn-sm ${isActive ? 'btn-primary' : 'btn-ghost'}`
                }
              >
                Vehicles &amp; Drivers
              </NavLink>
              <NavLink
                to="/trips"
                end
                className={({ isActive }) =>
                  `btn btn-sm ${isActive ? 'btn-primary' : 'btn-ghost'}`
                }
              >
                Trips
              </NavLink>
              <NavLink
                to="/trips/new"
                className={({ isActive }) =>
                  `btn btn-sm ${isActive ? 'btn-primary' : 'btn-ghost'}`
                }
              >
                Create Trip
              </NavLink>
            </div>
          </nav>

          <main className="p-6 max-w-6xl mx-auto">
            <Routes>
              <Route path="/" element={<VehiclesAndDriversPage />} />
              <Route path="/trips" element={<TripsPage />} />
              <Route path="/trips/new" element={<CreateTripPage />} />
              <Route path="/trips/:id" element={<TripDetailPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
