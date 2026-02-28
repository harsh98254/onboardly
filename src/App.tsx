import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { SubscriptionProvider } from '@/contexts/SubscriptionContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import DashboardLayout from '@/components/DashboardLayout'

// Auth pages
import Login from '@/pages/auth/Login'
import Signup from '@/pages/auth/Signup'
import ForgotPassword from '@/pages/auth/ForgotPassword'

// Dashboard pages
import Dashboard from '@/pages/dashboard/Dashboard'
import Settings from '@/pages/dashboard/Settings'

// Project pages
import ProjectList from '@/pages/projects/ProjectList'
import ProjectNew from '@/pages/projects/ProjectNew'
import ProjectDetail from '@/pages/projects/ProjectDetail'

// Client pages
import ClientPortal from '@/pages/client/ClientPortal'

// Scheduling pages
import EventTypes from '@/pages/scheduling/EventTypes'
import EventTypeNew from '@/pages/scheduling/EventTypeNew'
import EventTypeEdit from '@/pages/scheduling/EventTypeEdit'
import Bookings from '@/pages/scheduling/Bookings'
import Availability from '@/pages/scheduling/Availability'

// Public booking pages
import BookingPage from '@/pages/booking/BookingPage'
import BookingConfirmation from '@/pages/booking/BookingConfirmation'
import BookingCancel from '@/pages/booking/BookingCancel'

function ProtectedPage({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute><DashboardLayout>{children}</DashboardLayout></ProtectedRoute>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SubscriptionProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/client/:projectId" element={<ClientPortal />} />

            {/* Public booking routes */}
            <Route path="/book/:username/:slug" element={<BookingPage />} />
            <Route path="/booking/confirmation/:uid" element={<BookingConfirmation />} />
            <Route path="/booking/cancel/:uid" element={<BookingCancel />} />

            {/* Protected designer routes */}
            <Route path="/dashboard" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
            <Route path="/settings" element={<ProtectedPage><Settings /></ProtectedPage>} />
            <Route path="/projects" element={<ProtectedPage><ProjectList /></ProtectedPage>} />
            <Route path="/projects/new" element={<ProtectedPage><ProjectNew /></ProtectedPage>} />
            <Route path="/projects/:id" element={<ProtectedPage><ProjectDetail /></ProtectedPage>} />

            {/* Scheduling routes */}
            <Route path="/scheduling/event-types" element={<ProtectedPage><EventTypes /></ProtectedPage>} />
            <Route path="/scheduling/event-types/new" element={<ProtectedPage><EventTypeNew /></ProtectedPage>} />
            <Route path="/scheduling/event-types/:id" element={<ProtectedPage><EventTypeEdit /></ProtectedPage>} />
            <Route path="/scheduling/bookings" element={<ProtectedPage><Bookings /></ProtectedPage>} />
            <Route path="/scheduling/availability" element={<ProtectedPage><Availability /></ProtectedPage>} />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </SubscriptionProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
