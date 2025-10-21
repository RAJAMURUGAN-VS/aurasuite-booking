import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient.js';

export default function BarberPortal() {
  const [barber, setBarber] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [currentState, setCurrentState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser();
    fetchBarberData();
    fetchAppointments();
    fetchCurrentState();
  }, []);

  const fetchUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (err) {
      console.error('Error fetching user:', err);
    }
  };

  const fetchBarberData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.barber_id) {
        const { data, error } = await supabase
          .from('barbers')
          .select('*')
          .eq('id', user.user_metadata.barber_id)
          .single();

        if (error) throw error;
        setBarber(data);
      }
    } catch (err) {
      setError('Failed to fetch barber data');
    }
  };

  const fetchAppointments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.barber_id) {
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('barber_id', user.user_metadata.barber_id)
          .eq('status', 'pending')
          .order('date_time', { ascending: true });

        if (error) throw error;
        setAppointments(data || []);
      }
    } catch (err) {
      setError('Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentState = async () => {
    try {
      const { data, error } = await supabase
        .from('current_state')
        .select('*')
        .eq('id', 1)
        .single();

      if (error) throw error;
      setCurrentState(data);
    } catch (err) {
      console.error('Error fetching current state:', err);
    }
  };

  const handleAcceptAppointment = async (appointmentId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.user_metadata?.barber_id) return;

      // Update appointment status
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({ status: 'accepted' })
        .eq('id', appointmentId);

      if (appointmentError) throw appointmentError;

      // Update current state
      const appointment = appointments.find(apt => apt.id === appointmentId);
      if (appointment) {
        const { error: stateError } = await supabase
          .from('current_state')
          .update({
            customer_name: appointment.customer_name,
            approx_time_minutes: 30, // Default 30 minutes
            seat_id: appointment.seat_id,
            barber_id: user?.user_metadata?.barber_id,
            paused: false
          })
          .eq('id', 1);

        if (stateError) throw stateError;
      }

      // Refresh data
      fetchAppointments();
      fetchCurrentState();
    } catch (err) {
      setError('Failed to accept appointment');
    }
  };

  const handleUpdateTime = async (newTime) => {
    try {
      const { error } = await supabase
        .from('current_state')
        .update({ approx_time_minutes: newTime })
        .eq('id', 1);

      if (error) throw error;
      fetchCurrentState();
    } catch (err) {
      setError('Failed to update time');
    }
  };

  const handleTogglePause = async () => {
    try {
      const { error } = await supabase
        .from('current_state')
        .update({ paused: !currentState?.paused })
        .eq('id', 1);

      if (error) throw error;
      fetchCurrentState();
    } catch (err) {
      setError('Failed to toggle pause');
    }
  };

  const handleNext = async () => {
    try {
      const { error } = await supabase
        .from('current_state')
        .update({
          customer_name: null,
          approx_time_minutes: null,
          seat_id: null,
          barber_id: null,
          paused: false
        })
        .eq('id', 1);

      if (error) throw error;
      fetchCurrentState();
    } catch (err) {
      setError('Failed to clear current state');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading barber portal...</p>
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
              <h1 className="text-3xl font-bold text-gray-800">Barber Portal</h1>
              <p className="text-gray-600 mt-2">Welcome, {barber?.name || 'Barber'}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Barber ID</div>
              <div className="text-2xl font-bold text-green-600">{barber?.id || 'N/A'}</div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Current State Control Box */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Current Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Now Serving</label>
                <div className="text-lg font-semibold text-gray-800">
                  {currentState?.customer_name || 'No one'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Approx Time (min)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={currentState?.approx_time_minutes || ''}
                    onChange={(e) => handleUpdateTime(parseInt(e.target.value) || 0)}
                    className="w-20 border border-gray-300 rounded px-3 py-2 text-center"
                    min="0"
                    max="120"
                  />
                  <button
                    onClick={() => handleUpdateTime((currentState?.approx_time_minutes || 0) + 5)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm"
                  >
                    +5
                  </button>
                </div>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleTogglePause}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                    currentState?.paused
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      : 'bg-gray-600 hover:bg-gray-700 text-white'
                  }`}
                >
                  {currentState?.paused ? 'Resume' : 'Pause'}
                </button>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleNext}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Appointments List */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Pending Appointments</h3>
            {appointments.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl text-gray-400">📅</span>
                </div>
                <h4 className="text-lg font-semibold text-gray-800 mb-2">No pending appointments</h4>
                <p className="text-gray-600">New appointments will appear here</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {appointments.map((appointment) => (
                  <div key={appointment.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">📅</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800">{appointment.customer_name}</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(appointment.date_time).toLocaleDateString()} at {new Date(appointment.date_time).toLocaleTimeString()}
                          </p>
                          <p className="text-sm text-gray-500">Seat: {appointment.seat_id}</p>
                          <p className="text-sm text-gray-500">Services: {appointment.services?.join(', ') || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Status</div>
                          <div className="font-semibold text-yellow-600 capitalize">{appointment.status}</div>
                        </div>
                        <button
                          onClick={() => handleAcceptAppointment(appointment.id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                        >
                          Accept
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
