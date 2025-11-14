import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

// Pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

// Client
import ClientDashboard from './pages/client/ClientDashboard'
import SalonsPage from './pages/client/SalonsPage'
import SalonDetailPage from './pages/client/SalonDetailPage'
import BookingsPage from './pages/client/BookingsPage'

// Salon Owner
import SalonDashboard from './pages/salon/SalonDashboard'
import ManageServicesPage from './pages/salon/ManageServicesPage'
import ManageBookingsPage from './pages/salon/ManageBookingsPage'

// Admin
import AdminDashboard from './pages/admin/AdminDashboard'

function App() {
  const { user } = useAuthStore()

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Client routes */}
        <Route
          path="/client/*"
          element={
            user?.role === 'client' ? (
              <Routes>
                <Route path="dashboard" element={<ClientDashboard />} />
                <Route path="salons" element={<SalonsPage />} />
                <Route path="salons/:id" element={<SalonDetailPage />} />
                <Route path="bookings" element={<BookingsPage />} />
              </Routes>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Salon owner routes */}
        <Route
          path="/salon/*"
          element={
            user?.role === 'salon_owner' ? (
              <Routes>
                <Route path="dashboard" element={<SalonDashboard />} />
                <Route path="services" element={<ManageServicesPage />} />
                <Route path="bookings" element={<ManageBookingsPage />} />
              </Routes>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin/*"
          element={
            user?.role === 'admin' ? (
              <Routes>
                <Route path="dashboard" element={<AdminDashboard />} />
              </Routes>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  )
}

export default App
