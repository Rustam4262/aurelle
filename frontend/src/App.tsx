import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout'
import './i18n/config'

// Pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

// Client
import ClientDashboard from './pages/client/ClientDashboard'
import SalonsPage from './pages/client/SalonsPage'
import SalonDetailPage from './pages/client/SalonDetailPage'
import MyBookingsPage from './pages/client/MyBookingsPage'
import ProfilePage from './pages/client/ProfilePage'
import FavoritesPage from './pages/client/FavoritesPage'
import ChangePasswordPage from './pages/client/ChangePasswordPage'

// Salon Owner
import SalonDashboard from './pages/salon/SalonDashboard'
import CreateSalonPage from './pages/salon/CreateSalonPage'
import EditSalonPage from './pages/salon/EditSalonPage'
import ManageServicesPage from './pages/salon/ManageServicesPage'
import ManageMastersPage from './pages/salon/ManageMastersPage'
import SalonManageBookingsPage from './pages/salon/ManageBookingsPage'
import ManageSchedulePage from './pages/salon/ManageSchedulePage'
import ManageSalonPhotosPage from './pages/salon/ManageSalonPhotosPage'
import SalonReviewsPage from './pages/salon/SalonReviewsPage'

// Admin
import AdminLayout from './components/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import ManageUsersPage from './pages/admin/ManageUsersPage'
import ManageSalonsPage from './pages/admin/ManageSalonsPage'
import AdminManageBookingsPage from './pages/admin/ManageBookingsPage'

// Master
import MasterDashboard from './pages/master/MasterDashboard'
import MasterCalendar from './pages/master/MasterCalendar'
import MasterBookingsPage from './pages/master/MasterBookingsPage'
import MasterScheduleSettings from './pages/master/MasterScheduleSettings'

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
              <Layout>
                <Routes>
                  <Route path="dashboard" element={<ClientDashboard />} />
                  <Route path="salons" element={<SalonsPage />} />
                  <Route path="salons/:id" element={<SalonDetailPage />} />
                  <Route path="bookings" element={<MyBookingsPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="change-password" element={<ChangePasswordPage />} />
                  <Route path="favorites" element={<FavoritesPage />} />
                </Routes>
              </Layout>
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
              <Layout>
                <Routes>
                  <Route path="dashboard" element={<SalonDashboard />} />
                  <Route path="create" element={<CreateSalonPage />} />
                  <Route path="edit" element={<EditSalonPage />} />
                  <Route path="services" element={<ManageServicesPage />} />
                  <Route path="masters" element={<ManageMastersPage />} />
                  <Route path="bookings" element={<SalonManageBookingsPage />} />
                  <Route path="schedule" element={<ManageSchedulePage />} />
                  <Route path="photos" element={<ManageSalonPhotosPage />} />
                  <Route path="reviews" element={<SalonReviewsPage />} />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Master routes */}
        <Route
          path="/master/*"
          element={
            user?.role === 'master' ? (
              <Layout>
                <Routes>
                  <Route path="dashboard" element={<MasterDashboard />} />
                  <Route path="calendar" element={<MasterCalendar />} />
                  <Route path="bookings" element={<MasterBookingsPage />} />
                  <Route path="schedule" element={<MasterScheduleSettings />} />
                </Routes>
              </Layout>
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
              <AdminLayout>
                <Routes>
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="users" element={<ManageUsersPage />} />
                  <Route path="salons" element={<ManageSalonsPage />} />
                  <Route path="bookings" element={<AdminManageBookingsPage />} />
                  <Route path="masters" element={<div>Управление мастерами</div>} />
                  <Route path="services" element={<div>Управление услугами</div>} />
                  <Route path="support" element={<div>Жалобы и поддержка</div>} />
                  <Route path="finance" element={<div>Финансы</div>} />
                  <Route path="settings" element={<div>Настройки</div>} />
                </Routes>
              </AdminLayout>
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
