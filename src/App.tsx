import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/client/:projectId" element={<ClientPortal />} />

          {/* Protected designer routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute><DashboardLayout><Settings /></DashboardLayout></ProtectedRoute>
          } />
          <Route path="/projects" element={
            <ProtectedRoute><DashboardLayout><ProjectList /></DashboardLayout></ProtectedRoute>
          } />
          <Route path="/projects/new" element={
            <ProtectedRoute><DashboardLayout><ProjectNew /></DashboardLayout></ProtectedRoute>
          } />
          <Route path="/projects/:id" element={
            <ProtectedRoute><DashboardLayout><ProjectDetail /></DashboardLayout></ProtectedRoute>
          } />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
