import React, { useEffect, useState } from 'react';

import Dashboard from './pages/Dashboard';
import VolunteerListPage from './pages/VolunteerListPage';
import ProfilePage from './pages/ProfilePage';
import FormBuilderFeature from './features/form-builder/FormBuilderFeature';

function App() {
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

  if (currentPage === 'forms') {
    return <FormBuilderFeature />;
  }

  return <Dashboard />;
}

export default App;
