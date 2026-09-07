import React, { useEffect, useState } from 'react';

import Dashboard from './pages/Dashboard';
import VolunteerListPage from './pages/VolunteerListPage';
import ProfilePage from './pages/ProfilePage';
import FormBuilderFeature from './features/form-builder/FormBuilderFeature';
import EventManagementFeature from './features/event-management/EventManagementFeature';
import LoginPage from './features/auth/LoginPage';
import { useAuth } from './features/auth/AuthProvider';

function App() {
  const { status } = useAuth();
  const getCurrentPage = () => {
    const hash = window.location.hash;

    if (hash === '#volunteers') {
      return 'volunteers';
    }

    if (hash === '#profile') {
      return 'profile';
    }

    if (hash === '#forms') {
      return 'forms';
    }

    if (hash === '#events') {
      return 'events';
    }

    return 'dashboard';
  };

  const [currentPage, setCurrentPage] = useState(getCurrentPage());

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPage(getCurrentPage());
    };

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  if (status === 'loading') {
    return <div className="auth-loading-screen">Oturum kontrol ediliyor...</div>;
  }

  if (status !== 'authenticated') {
    return <LoginPage />;
  }

  if (currentPage === 'volunteers') {
    return <VolunteerListPage />;
  }

  if (currentPage === 'profile') {
    return <ProfilePage />;
  }

  if (currentPage === 'forms') {
    return <FormBuilderFeature />;
  }

  if (currentPage === 'events') {
    return <EventManagementFeature />;
  }

  return <Dashboard />;
}

export default App;
