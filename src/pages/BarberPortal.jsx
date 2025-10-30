import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { useCurrentStateTimer } from '../hooks/useCurrentStateTimer.js';

export default function BarberPortal() {
  const [barber, setBarber] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  
  const {
    currentState,
    timeRemaining,
    isRunning,
    isPaused,
    startTimer,
    togglePause,
    stopTimer,
    updateTimeRemaining,
    formatTime,
    fetchCurrentState
  } = useCurrentStateTimer();

  useEffect(() => {
    fetchUser();
    fetchBarberData();
    fetchAppointments();
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
        // Fetch both pending and accepted appointments
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('barber_id', user.user_metadata.barber_id)
          .in('status', ['pending', 'accepted'])
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


  const handleAcceptAppointment = async (appointmentId) => {
    console.log('Accepting appointment:', appointmentId);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.user_metadata?.barber_id) return;

      // Update appointment status to accepted
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({ status: 'accepted' })
        .eq('id', appointmentId);

      if (appointmentError) throw appointmentError;

      // Move to current serving status (but don't start timer yet)
      const appointment = appointments.find(apt => apt.id === appointmentId);
      if (appointment) {
        console.log('Moving appointment to current serving:', appointment);
        
        const { error: stateError } = await supabase
          .from('current_state')
          .update({
            customer_name: appointment.customer_name,
            approx_time_minutes: 30, // Default 30 minutes
            seat_id: appointment.seat_id,
            barber_id: user?.user_metadata?.barber_id,
            paused: false,
            appointment_id: appointmentId
          })
          .eq('id', 1);

        if (stateError) throw stateError;
        
        console.log('Appointment moved to current serving successfully');
      }

      // Refresh appointments
      fetchAppointments();
    } catch (err) {
      console.error('Failed to accept appointment:', err);
      setError('Failed to accept appointment: ' + err.message);
    }
  };

  const handleStartService = async () => {
    console.log('Start Service clicked');
    console.log('Current state:', currentState);
    
    if (currentState?.customer_name && currentState?.approx_time_minutes && currentState?.appointment_id) {
      console.log('Starting timer with:', {
        customer_name: currentState.customer_name,
        approx_time_minutes: currentState.approx_time_minutes,
        seat_id: currentState.seat_id,
        barber_id: currentState.barber_id,
        appointment_id: currentState.appointment_id
      });
      
      try {
        await startTimer(
          currentState.customer_name,
          currentState.approx_time_minutes,
          currentState.seat_id,
          currentState.barber_id,
          currentState.appointment_id
        );
        console.log('Timer started successfully');
      } catch (error) {
        console.error('Error starting timer:', error);
        setError('Failed to start timer: ' + error.message);
      }
    } else {
      console.log('Missing required fields:', {
        customer_name: currentState?.customer_name,
        approx_time_minutes: currentState?.approx_time_minutes,
        appointment_id: currentState?.appointment_id
      });
      setError('Missing required information to start service');
    }
  };

  const handleUpdateTime = async (newTime) => {
    console.log('Updating time to:', newTime);
    
    try {
      const { error } = await supabase
        .from('current_state')
        .update({ approx_time_minutes: newTime })
        .eq('id', 1);

      if (error) {
        console.error('Error updating time:', error);
        throw error;
      }
      
      console.log('Time updated successfully to:', newTime);
      
      // Refresh current state to get updated data
      await fetchCurrentState();
    } catch (err) {
      console.error('Failed to update time:', err);
      setError('Failed to update time: ' + err.message);
    }
  };

  const handleTogglePause = async () => {
    await togglePause();
  };

  const handleNext = async () => {
    try {
      // Mark current appointment as completed
      if (currentState?.appointment_id) {
        const { error: appointmentError } = await supabase
          .from('appointments')
          .update({ status: 'completed' })
          .eq('id', currentState.appointment_id);

        if (appointmentError) console.warn('Failed to mark appointment as completed:', appointmentError);
      }

      // Stop current timer
      await stopTimer();

      // Get the first accepted appointment in queue (FIFO - First In, First Out)
      const acceptedAppointments = appointments.filter(apt => apt.status === 'accepted');
      const nextAppointment = acceptedAppointments.sort((a, b) => new Date(a.date_time) - new Date(b.date_time))[0];

      if (nextAppointment) {
        // Move next appointment to current serving
        const { error: stateError } = await supabase
          .from('current_state')
          .update({
            customer_name: nextAppointment.customer_name,
            approx_time_minutes: 30, // Default 30 minutes
            seat_id: nextAppointment.seat_id,
            barber_id: nextAppointment.barber_id,
            paused: false,
            appointment_id: nextAppointment.id
          })
          .eq('id', 1);

        if (stateError) throw stateError;
        
        console.log('Moved next appointment to current serving:', nextAppointment.customer_name);
      } else {
        // No more appointments in queue, clear current state
        const { error: stateError } = await supabase
          .from('current_state')
          .update({
            customer_name: null,
            approx_time_minutes: null,
            seat_id: null,
            barber_id: null,
            paused: false,
            appointment_id: null
          })
          .eq('id', 1);

        if (stateError) throw stateError;
        
        console.log('No more appointments in queue, cleared current state');
      }

      // Refresh appointments
      fetchAppointments();
    } catch (err) {
      setError('Failed to move to next appointment');
      console.error('Error in handleNext:', err);
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
            
            {/* Timer Display */}
            {isRunning && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-800">Service in Progress</h3>
                    <p className="text-blue-600">Customer: {currentState?.customer_name}</p>
                    <p className="text-blue-600">Seat: {currentState?.seat_id}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-blue-800">
                      {formatTime(timeRemaining)}
                    </div>
                    <div className="text-sm text-blue-600">
                      {isPaused ? 'Paused' : 'Running'}
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                  <button
                    onClick={() => handleUpdateTime(Math.max(0, (currentState?.approx_time_minutes || 0) - 5))}
                    className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white px-3 py-2 rounded text-sm"
                    disabled={isRunning}
                  >
                    -5
                  </button>
                  <input
                    type="number"
                    value={currentState?.approx_time_minutes || ''}
                    onChange={(e) => handleUpdateTime(parseInt(e.target.value) || 0)}
                    className="w-20 border border-gray-300 rounded px-3 py-2 text-center"
                    min="0"
                    max="120"
                    disabled={isRunning}
                    placeholder="30"
                  />
                  <button
                    onClick={() => handleUpdateTime((currentState?.approx_time_minutes || 0) + 5)}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-2 rounded text-sm"
                    disabled={isRunning}
                  >
                    +5
                  </button>
                </div>
              </div>
              <div className="flex items-end">
                {isRunning ? (
                  <button
                    onClick={handleTogglePause}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                      isPaused
                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                        : 'bg-gray-600 hover:bg-gray-700 text-white'
                    }`}
                  >
                    {isPaused ? 'Resume' : 'Pause'}
                  </button>
                ) : (
                  <button
                    onClick={handleStartService}
                    disabled={!currentState?.customer_name}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                  >
                    Start Service
                  </button>
                )}
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleNext}
                  disabled={!isRunning}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Appointments List */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Appointments Queue</h3>
            
            {/* Pending Appointments */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-700 mb-3">Pending Approval</h4>
              {appointments.filter(apt => apt.status === 'pending').length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl text-gray-400">📅</span>
                  </div>
                  <p className="text-gray-600">No pending appointments</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {appointments.filter(apt => apt.status === 'pending').map((appointment) => (
                    <div key={appointment.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                            <span className="text-yellow-600 font-bold text-sm">#{appointment.id.slice(-4)}</span>
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

            {/* Accepted Appointments Queue */}
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-3">Accepted Queue</h4>
              {appointments.filter(apt => apt.status === 'accepted').length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl text-gray-400">⏳</span>
                  </div>
                  <p className="text-gray-600">No appointments in queue</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {appointments.filter(apt => apt.status === 'accepted').map((appointment, index) => (
                    <div key={appointment.id} className={`border rounded-lg p-4 transition-shadow ${
                      appointment.customer_name === currentState?.customer_name 
                        ? 'border-blue-300 bg-blue-50' 
                        : 'border-gray-200 hover:shadow-md'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            appointment.customer_name === currentState?.customer_name 
                              ? 'bg-blue-100' 
                              : 'bg-green-100'
                          }`}>
                            <span className={`font-bold text-sm ${
                              appointment.customer_name === currentState?.customer_name 
                                ? 'text-blue-600' 
                                : 'text-green-600'
                            }`}>
                              #{appointment.id.slice(-4)}
                            </span>
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
                            <div className="text-sm text-gray-500">Position</div>
                            <div className={`font-semibold ${
                              appointment.customer_name === currentState?.customer_name 
                                ? 'text-blue-600' 
                                : 'text-green-600'
                            }`}>
                              {appointment.customer_name === currentState?.customer_name ? 'Now Serving' : `#${index + 1}`}
                            </div>
                          </div>
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
    </div>
  );
}
