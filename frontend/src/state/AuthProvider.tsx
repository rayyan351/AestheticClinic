import { useEffect, useState } from 'react';
import { AuthContext, type User } from './AuthContext';
import { api } from '../lib/api';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/auth/me');
        if (res.data?.user) {
          const u = res.data.user;
          setUser({ id: u._id ?? u.id, name: u.name, email: u.email, role: u.role });
        }
      } catch { /* not logged in */ }
      setLoading(false);
    })();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, setLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
