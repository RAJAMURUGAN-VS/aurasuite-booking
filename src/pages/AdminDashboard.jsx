import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient.js';

export default function AdminDashboard() {
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBarber, setNewBarber] = useState({
    id: '',
    name: '',
    password: '',
    experience: '',
    email: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Remove MAX_BARBERS limit - allow unlimited barbers

  useEffect(() => {
    fetchBarbers();
  }, []);

  const fetchBarbers = async () => {
    try {
      const { data, error } = await supabase
        .from('barbers')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setBarbers(data || []);
    } catch (err) {
      setError('Failed to fetch barbers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBarber = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!newBarber.id || !newBarber.name || !newBarber.password || !newBarber.experience || !newBarber.email) {
      setError('All fields are required');
      return;
    }


    // Check if ID already exists
    if (barbers.some(b => b.id === newBarber.id)) {
      setError('Barber ID already exists');
      return;
    }

    // Check if email already exists
    if (barbers.some(b => b.email === newBarber.email)) {
      setError('Email already exists');
      return;
    }

    try {
      // Create the barber in the barbers table
      const { error: barberError } = await supabase
        .from('barbers')
        .insert({
          id: newBarber.id,
          name: newBarber.name,
          email: newBarber.email,
          password_hash: newBarber.password, // In production, hash this
          experience_years: parseInt(newBarber.experience),
          rating: 0,
          services: ['Haircut', 'Styling'], // Default services
          reviews: []
        });

      if (barberError) throw barberError;

      // Create a seat for this barber
      const seatId = `S${barbers.length + 1}`;
      const { error: seatError } = await supabase
        .from('seats')
        .insert({
          id: seatId,
          label: `Seat ${barbers.length + 1}`,
          barber_id: newBarber.id,
          state: 'available',
          expires_at: null
        });

      if (seatError) {
        console.warn('Failed to create seat for barber:', seatError);
        // Don't fail the entire operation if seat creation fails
      }

      setSuccess('Barber and seat added successfully! The barber can now login with their email and password.');
      setNewBarber({ id: '', name: '', password: '', experience: '', email: '' });
      setShowAddForm(false);
      fetchBarbers();
    } catch (err) {
      setError(err.message || 'Failed to add barber');
    }
  };

  const handleDeleteBarber = async (barberId) => {
    if (!confirm('Are you sure you want to delete this barber? This will also delete their seat.')) return;

    try {
      // First delete the seat associated with this barber
      const { error: seatError } = await supabase
        .from('seats')
        .delete()
        .eq('barber_id', barberId);

      if (seatError) {
        console.warn('Failed to delete seat:', seatError);
      }

      // Then delete the barber
      const { error } = await supabase
        .from('barbers')
        .delete()
        .eq('id', barberId);

      if (error) throw error;

      setSuccess('Barber and seat deleted successfully!');
      fetchBarbers();
    } catch (err) {
      setError('Failed to delete barber');
    }
  };

  const generateBarberId = () => {
    const existingIds = barbers.map(b => b.id);
    let newId = 'B1';
    let counter = 1;
    
    while (existingIds.includes(newId)) {
      counter++;
      newId = `B${counter}`;
    }
    
    setNewBarber(prev => ({ ...prev, id: newId }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
              <p className="text-gray-600 mt-2">Manage barbers and system settings</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Barbers Added</div>
              <div className="text-2xl font-bold text-blue-600">{barbers.length}</div>
            </div>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-800">{success}</p>
            </div>
          )}

          {/* Add Barber Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Barber Management</h2>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {showAddForm ? 'Cancel' : `Add Barber (${barbers.length})`}
              </button>
            </div>

            {/* Add Barber Form */}
            {showAddForm && (
              <form onSubmit={handleAddBarber} className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New Barber</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Barber ID</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="B1, B2, etc."
                        value={newBarber.id}
                        onChange={(e) => setNewBarber(prev => ({ ...prev, id: e.target.value }))}
                        required
                      />
                      <button
                        type="button"
                        onClick={generateBarberId}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg transition-colors"
                      >
                        Auto
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter barber's full name"
                      value={newBarber.name}
                      onChange={(e) => setNewBarber(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="barber@elitecuts.com"
                      value={newBarber.email}
                      onChange={(e) => setNewBarber(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <input
                      type="password"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Set barber password"
                      value={newBarber.password}
                      onChange={(e) => setNewBarber(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Experience (Years)</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Years of experience"
                      value={newBarber.experience}
                      onChange={(e) => setNewBarber(prev => ({ ...prev, experience: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Add Barber
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Barbers List */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Current Barbers</h3>
            {barbers.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl text-gray-400">✂</span>
                </div>
                <h4 className="text-lg font-semibold text-gray-800 mb-2">No barbers added yet</h4>
                <p className="text-gray-600">Add your first barber to get started</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {barbers.map((barber) => (
                  <div key={barber.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">{barber.id}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800">{barber.name}</h4>
                          <p className="text-sm text-gray-600">{barber.email}</p>
                          <p className="text-sm text-gray-500">{barber.experience_years} years experience</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Rating</div>
                          <div className="font-semibold text-gray-800">{barber.rating}/5</div>
                        </div>
                        <button
                          onClick={() => handleDeleteBarber(barber.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


