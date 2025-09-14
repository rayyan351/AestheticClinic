import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Navbar from './components/Navbar';
import PatientLogin from './pages/auth/PatientLogin';
import PatientSignup from './pages/auth/PatientSignup';
import AdminLogin from './pages/auth/AdminLogin';
import DoctorLogin from './pages/auth/DoctorLogin';
import PatientDashboard from './pages/dashboards/PatientDashboard';
import DoctorDashboard from './pages/dashboards/DoctorDashboard';
import AdminDashboard from './pages/dashboards/AdminDashboard';
import Doctors from './pages/Doctors';
import ProtectedRoute from './router/ProtectedRoute';

export default function App() {
  return (
    <>
      <Navbar/>
      <Routes>
        <Route path="/" element={<Landing/>} />
        <Route path="/doctors" element={<Doctors/>} />
        {/* Auth */}
        <Route path="/patient/login" element={<PatientLogin/>} />
        <Route path="/patient/signup" element={<PatientSignup/>} />
        <Route path="/admin/login" element={<AdminLogin/>} />
        <Route path="/doctor/login" element={<DoctorLogin/>} />

        {/* Dashboards */}
        <Route
          path="/patient"
          element={
            <ProtectedRoute roles={['patient']}>
              <PatientDashboard/>
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor"
          element={
            <ProtectedRoute roles={['doctor']}>
              <DoctorDashboard/>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminDashboard/>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
