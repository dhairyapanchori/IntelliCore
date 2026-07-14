import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from './store/authStore';
import { ProtectedRoute } from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import CollectionDetail from './pages/CollectionDetail';
import Chat from './pages/Chat';

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
          IntelliCore v1.0
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
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" index element={<Dashboard />} />
            <Route path="/dashboard/chat" element={<Chat />} />
            <Route path="/dashboard/collections/:id" element={<CollectionDetail />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
