import React from 'react';
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import SeatGrid from './components/SeatGrid.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import UserPortal from './pages/UserPortal.jsx';
import { supabase } from './lib/supabaseClient.js';

function Navbar() {
  const [user, setUser] = React.useState(null);
  
  React.useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">✂</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Elite Cuts</h1>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            {user ? (
              <>
                <Link to="/portal" className="text-gray-700 hover:text-gray-900">My Bookings</Link>
                <span className="text-gray-600">Welcome, {user.user_metadata?.name || user.email}</span>
                <button onClick={handleSignOut} className="text-gray-700 hover:text-gray-900">Sign Out</button>
              </>
            ) : (
              <>
                <Link className="text-gray-700 hover:text-gray-900" to="/login">Sign In</Link>
                <Link className="text-gray-700 hover:text-gray-900" to="/signup">Sign Up</Link>
              </>
            )}
            <Link className="text-gray-700 hover:text-gray-900" to="/admin/login">Admin</Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

function RequireAuth({ children }) {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const location = useLocation();

  React.useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();
  }, [location.pathname]);

  if (loading) return <div className="p-8 text-center text-gray-600">Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function RequireAdmin({ children }) {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const location = useLocation();

  React.useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();
  }, [location.pathname]);

  if (loading) return <div className="p-8 text-center text-gray-600">Loading...</div>;
  const isAdmin = user?.user_metadata?.role === 'admin';
  return isAdmin ? children : <Navigate to="/admin/login" replace />;
}

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      <Navbar />
      <Routes>
        <Route path="/" element={<SeatGrid />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/portal" element={
          <RequireAuth>
            <UserPortal />
          </RequireAuth>
        } />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={
          <RequireAdmin>
            <AdminDashboard />
          </RequireAdmin>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}


