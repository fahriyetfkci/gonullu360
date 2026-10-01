import React, { lazy, Suspense, useEffect, useState } from "react";
import { useAuth } from './features/auth/AuthProvider';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const VolunteerListPage = lazy(() => import('./pages/VolunteerListPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ApplicationDetailPage = lazy(() => import('./pages/ApplicationDetailPage'));
const FormBuilderFeature = lazy(() => import('./features/form-builder/FormBuilderFeature'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SecurityPage = lazy(() => import('./pages/SecurityPage'));
const EventDetailPage = lazy(() => import('./pages/EventDetailPage'));
const EventManagementPage = lazy(() => import('./features/event-management/EventManagementFeature'));
const DataEntryPage = lazy(() => import('./pages/DataEntryPage'));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'));
const ProfileEditPage = lazy(() => import('./features/settings/ProfileEditPage'));
const NotificationSettingsPage = lazy(() => import('./features/settings/NotificationSettingsPage'));

const PageLoading = () => <div style={{minHeight:'100vh',display:'grid',placeItems:'center',color:'#7f8b92'}}>Yükleniyor…</div>;

function App() {
  const getCurrentPage = () => {
    const pageFromHash = window.location.hash.replace("#", "");

    if (pageFromHash === "volunteers") {
      return "volunteers";
    }

    if (pageFromHash.startsWith("profile")) {
      return "profile";
    }

    if (pageFromHash.startsWith("application")) {
      return "application";
    }

    if (pageFromHash === "forms") {
      return "forms";
    }

    if (pageFromHash === "security") {
      return "security";
    }

    if (pageFromHash === "events" || pageFromHash.startsWith("events/")) {
      return pageFromHash === "events" ? "event-management" : "event-detail";
    }

    if (pageFromHash === "data-entry") {
      return "data-entry";
    }

    if (pageFromHash === "settings/profile-edit") return "settings-profile-edit";
    if (pageFromHash === "settings/notifications") return "settings-notifications";
    if (pageFromHash === "settings") return "settings";

    return "dashboard";
  };

  const [currentPage, setCurrentPage] = useState(getCurrentPage());
  const { status } = useAuth();

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPage(getCurrentPage());
    };

    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  if (status === 'loading') return <PageLoading />;
  if (status !== 'authenticated') return <Suspense fallback={<PageLoading />}><LoginPage /></Suspense>;

  let page;

  if (currentPage === "volunteers") {
    page = <VolunteerListPage />;
  }

  if (currentPage === "profile") {
    page = <ProfilePage />;
  }

  if (currentPage === "application") {
    page = <ApplicationDetailPage />;
  }

  if (currentPage === "forms") {
    page = <FormBuilderFeature />;
  }

  if (currentPage === "security") {
    page = <SecurityPage />;
  }

  if (currentPage === "event-management") {
    page = <EventManagementPage />;
  }

  if (currentPage === "event-detail") {
    page = <EventDetailPage />;
  }

  if (currentPage === "data-entry") page = <DataEntryPage />;
  if (currentPage === "settings") page = <SettingsPage />;
  if (currentPage === "settings-profile-edit") page = <ProfileEditPage />;
  if (currentPage === "settings-notifications") page = <NotificationSettingsPage />;

  page ??= <Dashboard />;
  return <Suspense fallback={<PageLoading />}>{page}</Suspense>;
}

export default App;
