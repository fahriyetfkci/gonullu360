import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { clearSession, getUser, login as loginRequest, logout as logoutRequest, refreshSession } from '../../services/api';

const AuthContext = createContext(null);
export const isManager = user => {
  const role = String(user?.role || '').trim().toUpperCase();
  return role === 'ADMIN' || role === 'YÖNETİCİ';
};

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);

  useEffect(() => {
    let active = true;
    refreshSession().then(() => getUser()).then(result => {
      if (!active) return;
      if (!isManager(result.user)) throw new Error('Yönetici yetkisi gerekli');
      localStorage.setItem('authUser', JSON.stringify(result.user));
      setUser(result.user); setStatus('authenticated');
    }).catch(() => {
      clearSession();
      if (active) { setUser(null); setStatus('anonymous'); }
    });
    const expired = () => { setUser(null); setStatus('anonymous'); };
    window.addEventListener('auth:logout', expired);
    return () => { active = false; window.removeEventListener('auth:logout', expired); };
  }, []);

  const login = useCallback(async (email, password, mfaCode = '', backupCode = '') => {
    const result = await loginRequest(email, password, mfaCode, backupCode);
    if (result.mfaRequired) return result;
    if (!isManager(result.user)) {
      await logoutRequest();
      throw new Error('Bu panele yalnızca yöneticiler giriş yapabilir.');
    }
    setUser(result.user); setStatus('authenticated');
    return result;
  }, []);

  const logout = useCallback(async () => {
    try { await logoutRequest(); }
    finally { setUser(null); setStatus('anonymous'); window.location.hash = ''; }
  }, []);

  const value = useMemo(() => ({ status, user, login, logout }), [status, user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth, AuthProvider içinde kullanılmalıdır');
  return value;
}
