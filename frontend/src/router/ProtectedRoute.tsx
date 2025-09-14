import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react'; 
import { useAuth } from '../state/AuthContext';

export default function ProtectedRoute({
  children,
  roles
}: {
  children: ReactNode;
  roles?: ('patient' | 'doctor' | 'admin')[];
}) {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!user) return <Navigate to="/patient/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
