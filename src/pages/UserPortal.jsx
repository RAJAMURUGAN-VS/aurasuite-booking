import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { useCurrentStateTimer } from '../hooks/useCurrentStateTimer.js';

export default function UserPortal() {
  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Use the timer hook to get current state
  const { currentState, timeRemaining, isRunning, isPaused, formatTime } = useCurrentStateTimer();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Fetch user's appointments
        const { data: apps, error } = await supabase
          .from('appointments')
          .select(`
            *,
            barbers(name, photo),
            seats(label)
          `)
          .eq('customer_id', user.id)
          .order('date_time', { ascending: false });
          
        if (!error && apps) {
          setAppointments(apps);
        }
      }
      setLoading(false);
    };
    
    getUser();
    
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('appointments-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'appointments' },
        (payload) => {
          if (payload.new?.customer_id === user?.id) {
            setAppointments(prev => {
              const filtered = prev.filter(app => app.id !== payload.old?.id);
              return [payload.new, ...filtered];
            });
          }
        }
      )
      .subscribe();
      
    return () => subscription.unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">My Bookings</h1>
              <p className="text-gray-600 mt-2">Track your appointments and their status</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Welcome back,</p>
              <p className="font-semibold text-gray-800">{user?.user_metadata?.name || user?.email}</p>
            </div>
          </div>

          {appointments.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl text-gray-400">📅</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No bookings yet</h3>
              <p className="text-gray-600 mb-6">Book your first appointment to see it here</p>
              <a 
                href="/" 
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                Book Now
              </a>
            </div>
          ) : (
            <div className="grid gap-6">
              {appointments.map((appointment) => {
                const dateTime = new Date(appointment.date_time);
                const barber = appointment.barbers;
                const seat = appointment.seats;
                
                return (
                  <div key={appointment.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        {barber?.photo && (
                          <img 
                            src={barber.photo} 
                            alt={barber.name}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        )}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800">{barber?.name || 'Unknown Barber'}</h3>
                          <p className="text-gray-600">Seat: {seat?.label || appointment.seat_id}</p>
                          <p className="text-gray-600">
                            {dateTime.toLocaleDateString()} at {dateTime.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {appointment.services.map((service, idx) => (
                              <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                                {service}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.status)}`}>
                          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                        </span>
                        {appointment.status === 'accepted' && (
                          <p className="text-sm text-green-600 mt-2">✓ Confirmed</p>
                        )}
                        {appointment.status === 'pending' && (
                          <p className="text-sm text-yellow-600 mt-2">⏳ Waiting for confirmation</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
