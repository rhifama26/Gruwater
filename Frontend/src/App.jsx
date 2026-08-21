import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import AdminLayout from './components/Layout/AdminLayout';
import UserLayout from './components/Layout/UserLayout';
import AdminDashboard from './components/Dashboard/AdminDashboard';
import UserDashboard from './components/Dashboard/UserDashboard';
import Lokasi from './components/Lokasi/Lokasi';
import Perbandingan from './components/Perbandingan/Perbandingan';
import Prediction from './components/Prediction/Prediction';
import History from './components/History/History';
import Report from './components/Report/Report';
import Users from './components/Users/Users';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-primary">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="lokasi" element={<Lokasi />} />
            <Route path="perbandingan" element={<Perbandingan />} />
            <Route path="prediction" element={<Prediction />} />
            <Route path="history" element={<History />} />
            <Route path="report" element={<Report />} />
            <Route path="users" element={<Users />} />
          </Route>
          <Route path="/user" element={<ProtectedRoute requiredRole="user"><UserLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/user/dashboard" replace />} />
            <Route path="dashboard" element={<UserDashboard />} />
            <Route path="prediction" element={<Prediction />} />
            <Route path="history" element={<History />} />
            <Route path="report" element={<Report />} />
          </Route>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;