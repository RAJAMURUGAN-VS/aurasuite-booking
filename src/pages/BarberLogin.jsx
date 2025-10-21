import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { useNavigate } from 'react-router-dom';

export default function BarberLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleBarberLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // First check if this email exists in barbers table
    const { data: barberData, error: barberError } = await supabase
      .from('barbers')
      .select('*')
      .eq('email', email)
      .single();

    if (barberError || !barberData) {
      setError('Barber not found. Please contact admin.');
      setLoading(false);
      return;
    }

    // Check password (in production, use proper hashing)
    if (barberData.password_hash !== password) {
      setError('Invalid password.');
      setLoading(false);
      return;
    }

    // Create or sign in with Supabase auth
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password: password // Use the barber's password
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
        setLoading(false);
        return;
      }

      if (signUpData.user) {
        setError('Account created. Please check your email for verification.');
        setLoading(false);
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
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">✂</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-800">Barber Portal</h2>
          <p className="text-gray-600 mt-2">Elite Cuts Barber Login</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Barber Login Form */}
        <form onSubmit={handleBarberLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Barber Email</label>
            <input 
              type="email"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent" 
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
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent" 
              placeholder="Enter your password" 
              value={password} 
              onChange={(e)=>setPassword(e.target.value)}
              required
            />
          </div>
          
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {loading ? 'Signing in...' : 'Barber Sign In'}
          </button>
        </form>

        {/* Back to main login */}
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            <a href="/login" className="text-green-600 hover:text-green-700 font-medium">
              ← Back to Main Login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
