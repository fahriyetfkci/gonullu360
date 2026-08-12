import React, { useEffect, useState } from 'react';

import Dashboard from './pages/Dashboard';
import VolunteerListPage from './pages/VolunteerListPage';
import ProfilePage from './pages/ProfilePage';

function App() {
  const getCurrentPage = () => {
    const hash = window.location.hash;

    if (hash === '#volunteers') {
      return 'volunteers';
    }

    if (hash === '#profile') {
      return 'profile';
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

  if (currentPage === 'volunteers') {
    return <VolunteerListPage />;
  }

  if (currentPage === 'profile') {
    return <ProfilePage />;
  }

  return <Dashboard />;
}

export default App;