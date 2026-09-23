import React, { useEffect, useState } from 'react';

import ApplicationDetailPage from './pages/ApplicationDetailPage';
import PublicFormPage from './features/form-builder/PublicFormPage';
import AccountActionPage from './features/auth/AccountActionPage';
import DataEntryPage from './pages/DataEntryPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './features/settings/SettingsPage';
import ProfileEditPage from './features/settings/ProfileEditPage';
import NotificationSettingsPage from './features/settings/NotificationSettingsPage';
import Dashboard from './pages/Dashboard';
import VolunteerListPage from './pages/VolunteerListPage';
import ProfilePage from './pages/ProfilePage';
import FormBuilderFeature from './features/form-builder/FormBuilderFeature';
import EventManagementFeature from './features/event-management/EventManagementFeature';
import LoginPage from './features/auth/LoginPage';
import { useAuth } from './features/auth/AuthProvider';

function App() {
  const { status, user } = useAuth();
  const getCurrentPage = () => {
    const hash = window.location.hash;
    if (hash === '#settings/profile-edit') return 'profile-edit';
    if (hash === '#settings/notifications') return 'notification-settings';
    if (hash === '#settings') return 'settings';
    if (hash.startsWith('#form/')) return 'public-form';

    if (hash === '#volunteers') {
      return 'volunteers';
    }

    if (hash === '#profile' || hash.startsWith('#profile/')) {
      return 'profile';
    }

    if (hash === '#forms') {
      return 'forms';
    }

    if (hash === '#events') {
      return 'events';
    }

    if (hash.startsWith('#application/')) return 'application';
    if (hash === '#data-entry') return 'data-entry';
    if (hash === '#notifications') return 'notifications';
    return 'dashboard';
  };

  const [currentPage, setCurrentPage] = useState(getCurrentPage());
  const settingsPages = ['settings', 'profile-edit', 'notification-settings'];
  const needsSettingsRedirect = status === 'authenticated' && user?.role !== 'ADMIN'
    && currentPage !== 'public-form' && !settingsPages.includes(currentPage);

  useEffect(() => {
    if (needsSettingsRedirect) window.location.hash = 'settings';
  }, [needsSettingsRedirect, currentPage]);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPage(getCurrentPage());
    };

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  if (['/reset-password', '/verify-email'].includes(window.location.pathname)) return <AccountActionPage />;
  if (currentPage === 'public-form') return <PublicFormPage key={window.location.hash} />;

  if (status === 'loading') {
    return <div className="auth-loading-screen">Oturum kontrol ediliyor...</div>;
  }

  if (status !== 'authenticated') {
    return <LoginPage />;
  }

  // Other roles currently have access to account settings only.
  if (needsSettingsRedirect) return <SettingsPage />;

  if (currentPage === 'application') return <ApplicationDetailPage key={window.location.hash} />;
  if (currentPage === 'data-entry') return <DataEntryPage />;
  if (currentPage === 'notifications') return <NotificationsPage />;
  if (currentPage === 'settings') return <SettingsPage />;
  if (currentPage === 'notification-settings') return <NotificationSettingsPage />;
  if (currentPage === 'profile-edit') return <ProfileEditPage />;

  if (currentPage === 'volunteers') {
    return <VolunteerListPage />;
  }

  if (currentPage === 'profile') {
    return <ProfilePage key={window.location.hash} />;
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
