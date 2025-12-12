

import React, { useState, Suspense } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Loader2 } from 'lucide-react';

// Lazy Loading des pages pour optimiser la fluidité et le temps de chargement initial
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Infos = React.lazy(() => import('./pages/Infos').then(module => ({ default: module.Infos })));
const Meet = React.lazy(() => import('./pages/Meet').then(module => ({ default: module.Meet })));
const DS = React.lazy(() => import('./pages/DS').then(module => ({ default: module.DS })));
const Polls = React.lazy(() => import('./pages/Polls').then(module => ({ default: module.Polls })));
const AdminPanel = React.lazy(() => import('./pages/AdminPanel').then(module => ({ default: module.AdminPanel })));
const TimeTable = React.lazy(() => import('./pages/TimeTable').then(module => ({ default: module.TimeTable })));
const Assistant = React.lazy(() => import('./pages/Assistant').then(module => ({ default: module.Assistant })));

const LoadingScreen = () => (
  <div className="h-full w-full flex flex-col items-center justify-center min-h-[50vh] animate-in fade-in duration-300">
    <Loader2 className="w-10 h-10 text-[#87CEEB] animate-spin mb-4" />
    <p className="text-slate-400 font-medium text-sm animate-pulse">Chargement...</p>
  </div>
);

const Main: React.FC = () => {
  const { user } = useApp();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (!user) {
    return <Login />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard onNavigate={setCurrentPage} />;
      case 'infos': return <Infos />;
      case 'meet': return <Meet />;
      case 'ds': return <DS />;
      case 'polls': return <Polls />;
      case 'admin': return <AdminPanel />;
      case 'timetable': return <TimeTable />;
      case 'assistant': return <Assistant />;
      default: return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      <Suspense fallback={<LoadingScreen />}>
        {renderPage()}
      </Suspense>
    </Layout>
  );
};

export default function App() {
  return (
    <AppProvider>
      <Main />
    </AppProvider>
  );
}