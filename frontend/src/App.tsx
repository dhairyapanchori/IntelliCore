import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import React, { useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from './store/authStore';
import { ProtectedRoute } from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import { Toaster } from 'react-hot-toast';

// Lazy loaded components for better performance
const Login = React.lazy(() => import('./pages/Login'));
const Signup = React.lazy(() => import('./pages/Signup'));
const Dashboard = React.lazy(() => import('./pages/Dashboard')); // We will turn this into DashboardV2 later
const CollectionDetail = React.lazy(() => import('./pages/CollectionDetail'));
const DocumentDetail = React.lazy(() => import('./pages/DocumentDetail'));
const Documents = React.lazy(() => import('./pages/Documents'));
const Workspaces = React.lazy(() => import('./pages/Workspaces'));
const Chat = React.lazy(() => import('./pages/Chat'));
const Search = React.lazy(() => import('./pages/Search'));
const Collections = React.lazy(() => import('./pages/Collections'));
const Departments = React.lazy(() => import('./pages/Departments'));
const Users = React.lazy(() => import('./pages/Users'));
const Analytics = React.lazy(() => import('./pages/Analytics'));
const KnowledgeGraph = React.lazy(() => import('./pages/KnowledgeGraph'));
const DataSources = React.lazy(() => import('./pages/DataSources'));
const ComingSoon = React.lazy(() => import('./pages/ComingSoon'));

// Global Loading Skeleton
const PageLoader = () => (
  <div className="flex h-full w-full items-center justify-center p-8">
    <div className="flex flex-col items-center space-y-4">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      <p className="text-sm text-muted-foreground animate-pulse">Loading module...</p>
    </div>
  </div>
);

function Landing() {
  const { isAuthenticated } = useAuthStore();
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground selection:bg-accent/30 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-3xl text-center space-y-6"
      >
        <div className="inline-block rounded-full border border-border px-3 py-1 text-sm text-muted-foreground mb-4">
          IntelliCore v1.1
        </div>
        <h1 className="text-4xl md:text-7xl font-bold tracking-tight text-primary">
          Enterprise Knowledge <br className="hidden md:block"/> 
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-600">
            Operating System
          </span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          The AI brain for your company. Transform scattered documents into an interactive knowledge graph with enterprise-grade security.
        </p>
        
        <div className="pt-8 flex gap-4 justify-center">
          <Link to="/signup" className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center h-11 px-8 rounded-md font-medium transition-colors">
            Get Started
          </Link>
          <Link to="/login" className="border border-input bg-background hover:bg-accent hover:text-accent-foreground flex items-center justify-center h-11 px-8 rounded-md font-medium transition-colors">
            Sign in
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

function App() {
  const fetchUser = useAuthStore((state) => state.fetchUser);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" index element={<Dashboard />} />
              <Route path="/dashboard/chat" element={<Chat />} />
              <Route path="/dashboard/collections/:id" element={<CollectionDetail />} />
              <Route path="/dashboard/documents/:id" element={<DocumentDetail />} />
              <Route path="/dashboard/search" element={<Search />} />
              <Route path="/dashboard/collections" element={<Collections />} />
              <Route path="/dashboard/documents" element={<Documents />} />
              <Route path="/dashboard/sources" element={<DataSources />} />
              <Route path="/dashboard/graph" element={<KnowledgeGraph />} />
              <Route path="/dashboard/workspaces" element={<Workspaces />} />
              <Route path="/dashboard/departments" element={<Departments />} />
              <Route path="/dashboard/users" element={<Users />} />
              <Route path="/dashboard/analytics" element={<Analytics />} />
              <Route path="/dashboard/reports" element={<ComingSoon />} />
              <Route path="/dashboard/settings" element={<ComingSoon />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#1E2333', color: '#fff', border: '1px solid #334155' } }} />
    </BrowserRouter>
  );
}

export default App;
