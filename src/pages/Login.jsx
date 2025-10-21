import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [activeTab, setActiveTab] = useState('user'); // 'user', 'admin', or 'barber'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [barberCount, setBarberCount] = useState(0);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const navigate = useNavigate();

  // Separate loading states for each tab
  const [userLoading, setUserLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [barberLoading, setBarberLoading] = useState(false);

  // Check barber count and maintenance mode
  useEffect(() => {
    const checkBarberCount = async () => {
      try {
        const { data, error } = await supabase
          .from('barbers')
          .select('id', { count: 'exact', head: true });
        
        if (!error) {
          const count = data || 0;
          setBarberCount(count);
          setIsMaintenanceMode(count < 6);
        }
      } catch (err) {
        console.error('Error checking barber count:', err);
      }
    };
    
    checkBarberCount();
  }, []);

  const handleUserLogin = async (e) => {
    e.preventDefault();
    setError('');
    setUserLoading(true);
    
    if (isMaintenanceMode) {
      setError('The site is currently under maintenance. Please try again later.');
      setUserLoading(false);
      return;
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setUserLoading(false);
      return;
    }
    
    navigate('/');
    setUserLoading(false);
  };

  const handleUserSignup = async (e) => {
    e.preventDefault();
    setError('');
    
    if (isMaintenanceMode) {
      setError('The site is currently under maintenance. Please try again later.');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setUserLoading(true);
    
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          name: name,
          role: 'customer'
        }
      }
    });
    
    if (error) {
      setError(error.message);
      setUserLoading(false);
      return;
    }
    
    if (data.user) {
      setError('Check your email for verification link. Please verify your account before signing in.');
      setIsSignup(false);
    }
    setUserLoading(false);
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError('');
    setAdminLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setAdminLoading(false);
        return;
      }

      // Check if user has admin role
      const role = data?.user?.user_metadata?.role;
      if (role !== 'admin') {
        setError('You are not authorized as an admin.');
        setAdminLoading(false);
        return;
      }

      navigate('/admin');
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleBarberLogin = async (e) => {
    e.preventDefault();
    setError('');
    setBarberLoading(true);

    try {
      // First check if this email exists in barbers table
      const { data: barberData, error: barberError } = await supabase
        .from('barbers')
        .select('*')
        .eq('email', email)
        .single();

      if (barberError || !barberData) {
        setError('Barber not found. Please contact admin.');
        setBarberLoading(false);
        return;
      }

      // Check password (in production, use proper hashing)
      if (barberData.password_hash !== password) {
        setError('Invalid password.');
        setBarberLoading(false);
        return;
      }

      // Try to sign in first
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password: password
      });

      if (error) {
        // If user doesn't exist in auth, create them
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: barberData.name,
              role: 'barber',
              barber_id: barberData.id
            }
          }
        });

        if (signUpError) {
          setError(signUpError.message);
          setBarberLoading(false);
          return;
        }

        if (signUpData.user) {
          setError('Account created. Please check your email for verification.');
          setBarberLoading(false);
          return;
        }
      } else {
        // Sign in successful, update metadata if needed
        await supabase.auth.updateUser({
          data: { 
            role: 'barber', 
            name: barberData.name,
            barber_id: barberData.id
          }
        });
      }

      navigate('/barber');
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setBarberLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setConfirmPassword('');
    setError('');
    setUserLoading(false);
    setAdminLoading(false);
    setBarberLoading(false);
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setIsSignup(false);
    resetForm();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">✂</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-800">AuraSuite</h2>
          <p className="text-gray-600 mt-2">Elite Cuts Booking System</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => switchTab('user')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'user'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            User Access
          </button>
          <button
            onClick={() => switchTab('admin')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'admin'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Admin Access
          </button>
          <button
            onClick={() => switchTab('barber')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'barber'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Barber Access
          </button>
        </div>

        {/* Maintenance Mode Warning */}
        {activeTab === 'user' && isMaintenanceMode && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-yellow-400 text-xl">⚠️</span>
              </div>
              <div className="ml-3">
                <p className="text-yellow-800 font-medium">Site Under Maintenance</p>
                <p className="text-yellow-700 text-sm mt-1">
                  Barbers are being set up ({barberCount}/6). User access will be available soon.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* User Login/Signup Form */}
        {activeTab === 'user' && (
          <form onSubmit={isSignup ? handleUserSignup : handleUserLogin} className="space-y-4">
            {isSignup && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input 
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  placeholder="Enter your full name" 
                  value={name} 
                  onChange={(e)=>setName(e.target.value)}
                  required
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input 
                type="email"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                placeholder="Enter your email" 
                value={email} 
                onChange={(e)=>setEmail(e.target.value)}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input 
                type="password" 
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                placeholder={isSignup ? "Create a password" : "Enter your password"} 
                value={password} 
                onChange={(e)=>setPassword(e.target.value)}
                required
              />
            </div>
            
            {isSignup && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                <input 
                  type="password" 
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  placeholder="Confirm your password" 
                  value={confirmPassword} 
                  onChange={(e)=>setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            )}
            
            <button 
              type="submit"
              disabled={userLoading || (isMaintenanceMode && !isSignup)}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {userLoading ? (isSignup ? 'Creating account...' : 'Signing in...') : (isSignup ? 'Create Account' : 'Sign In')}
            </button>
          </form>
        )}

        {/* Admin Login Form */}
        {activeTab === 'admin' && (
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Admin Email</label>
              <input 
                type="email"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                placeholder="admin@elitecuts.com" 
                value={email} 
                onChange={(e)=>setEmail(e.target.value)}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Admin Password</label>
              <input 
                type="password" 
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                placeholder="AdminPass123" 
                value={password} 
                onChange={(e)=>setPassword(e.target.value)}
                required
              />
            </div>
            
            <button 
              type="submit"
              disabled={adminLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {adminLoading ? 'Signing in...' : 'Admin Sign In'}
            </button>
          </form>
        )}

        {/* Barber Login Form */}
        {activeTab === 'barber' && (
          <form onSubmit={handleBarberLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Barber Email</label>
              <input 
                type="email"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                placeholder="barber@elitecuts.com" 
                value={email} 
                onChange={(e)=>setEmail(e.target.value)}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Barber Password</label>
              <input 
                type="password" 
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                placeholder="Enter your password" 
                value={password} 
                onChange={(e)=>setPassword(e.target.value)}
                required
              />
            </div>
            
            <button 
              type="submit"
              disabled={barberLoading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {barberLoading ? 'Signing in...' : 'Barber Sign In'}
            </button>
          </form>
        )}

        {/* Switch between Login/Signup for Users */}
        {activeTab === 'user' && (
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {isSignup ? 'Already have an account? ' : "Don't have an account? "}
              <button 
                onClick={() => {
                  setIsSignup(!isSignup);
                  resetForm();
                }}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                {isSignup ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


