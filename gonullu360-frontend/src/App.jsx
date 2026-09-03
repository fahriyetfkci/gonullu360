import React, { lazy, Suspense, useEffect, useState } from "react";
import { useAuth } from './features/auth/AuthProvider';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const VolunteerListPage = lazy(() => import('./pages/VolunteerListPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ApplicationDetailPage = lazy(() => import('./pages/ApplicationDetailPage'));
const FormBuilderFeature = lazy(() => import('./features/form-builder/FormBuilderFeature'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SecurityPage = lazy(() => import('./pages/SecurityPage'));

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

  page ??= <Dashboard />;
  return <Suspense fallback={<PageLoading />}>{page}</Suspense>;
}

export default App;
