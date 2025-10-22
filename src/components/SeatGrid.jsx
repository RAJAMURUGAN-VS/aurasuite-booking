import React, { useState, useEffect } from 'react';
import Seat from './Seat.jsx';
import BookingModal from './modals/BookingModal.jsx';
import BarberInfoModal from './modals/BarberInfoModal.jsx';
import { useSeatTimers } from '../hooks/useSeatTimers.js';
import { useCurrentStateTimer } from '../hooks/useCurrentStateTimer.js';
import { supabase } from '../lib/supabaseClient.js';

export default function SeatGrid() {
  const [seats, setSeats] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [showA, setShowA] = useState(false);
  const [showB, setShowB] = useState(false);
  const [toast, setToast] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Use the timer hook to get current state
  const { currentState, timeRemaining, isRunning, isPaused, formatTime } = useCurrentStateTimer();

  // Fetch data from Supabase
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch barbers
      const { data: barbersData, error: barbersError } = await supabase
        .from('barbers')
        .select('*');

      if (barbersError) throw barbersError;

      // Fetch seats
      const { data: seatsData, error: seatsError } = await supabase
        .from('seats')
        .select('*')
        .order('id');

      if (seatsError) throw seatsError;

      setBarbers(barbersData || []);
      setSeats(seatsData || []);
    } catch (err) {
      setError('Failed to load data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useSeatTimers(seats, (expiredIds) => {
    setSeats(prev => prev.map(s => 
      expiredIds.includes(s.id) 
        ? { ...s, state: 'available', expires_at: null } 
        : s
    ));
    
    // Update in Supabase
    expiredIds.forEach(seatId => {
      supabase
        .from('seats')
        .update({ state: 'available', expires_at: null })
        .eq('id', seatId);
    });
  });

  const handleSeatClick = (seat) => {
    setSelectedSeat(seat);
    setShowA(true);
  };

  const handleBook = () => { 
    setShowA(false); 
    setShowB(true); 
  };

  const handlePay = async () => {
    setShowB(false); 
    setToast(true); 
    setTimeout(() => setToast(false), 2500);
    
    // Update seat state in Supabase
    try {
      await supabase
        .from('seats')
        .update({ 
          state: 'booked', 
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() 
        })
        .eq('id', selectedSeat.id);
      
      // Update local state
      setSeats(prev => prev.map(s => 
        s.id === selectedSeat.id 
          ? { ...s, state: 'booked', expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() } 
          : s
      ));
    } catch (err) {
      console.error('Error updating seat:', err);
    }
    
    setSelectedSeat(null);
  };

  // Split seats into left and right columns dynamically
  const midPoint = Math.ceil(seats.length / 2);
  const left = seats.slice(0, midPoint); 
  const right = seats.slice(midPoint);
  const barber = selectedSeat ? barbers.find(b => b.id === selectedSeat.barber_id) : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading seats...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Data</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (seats.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-gray-400 text-2xl">✂</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Seats Available</h3>
          <p className="text-gray-600">Please contact admin to set up seats</p>
          <button 
            onClick={fetchData}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="flex items-center justify-center min-h-[calc(100vh-80px)] p-8">
      <div className="w-full max-w-4xl">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Book Your Seat</h2>
          <p className="text-gray-600">Select any seat to view barber info or make a booking</p>
        </div>

        {/* Current Service Status */}
        {isRunning && currentState && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-800">Service in Progress</h3>
                <p className="text-blue-600">Seat: {currentState.seat_id}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-800">
                  {formatTime(timeRemaining)}
                </div>
                <div className="text-sm text-blue-600">
                  {isPaused ? 'Paused' : 'Time Remaining'}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-4 justify-center mb-8 bg-white rounded-lg p-4 shadow">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-700">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm text-gray-700">Currently Served</span>
          </div>
        </div>

        <div className="flex justify-center gap-12 items-start">
          <div className="flex flex-col gap-8">
            {left.map(seat => (
              <div key={seat.id} className="flex items-center gap-4">
                {/* Timer for left side seats */}
                {isRunning && currentState?.seat_id === seat.id && (
                  <div className="bg-blue-100 border border-blue-300 rounded-lg p-2 min-w-[80px] text-center">
                    <div className="text-lg font-bold text-blue-800">
                      {formatTime(timeRemaining)}
                    </div>
                    <div className="text-xs text-blue-600">
                      {isPaused ? 'Paused' : 'Running'}
                    </div>
                  </div>
                )}
                <Seat seat={seat} onClick={handleSeatClick} currentState={currentState} isRunning={isRunning} />
              </div>
            ))}
          </div>

          {right.length > 0 && (
            <>
              <div className="w-1 h-96 bg-gradient-to-b from-gray-300 via-gray-400 to-gray-300 rounded-full shadow-lg" />

              <div className="flex flex-col gap-8">
                {right.map(seat => (
                  <div key={seat.id} className="flex items-center gap-4">
                    <Seat seat={seat} onClick={handleSeatClick} currentState={currentState} isRunning={isRunning} />
                    {/* Timer for right side seats */}
                    {isRunning && currentState?.seat_id === seat.id && (
                      <div className="bg-blue-100 border border-blue-300 rounded-lg p-2 min-w-[80px] text-center">
                        <div className="text-lg font-bold text-blue-800">
                          {formatTime(timeRemaining)}
                        </div>
                        <div className="text-xs text-blue-600">
                          {isPaused ? 'Paused' : 'Running'}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {showA && barber && (
        <BarberInfoModal
          barber={barber}
          seat={selectedSeat}
          onClose={() => { setShowA(false); setSelectedSeat(null); }}
          onBook={handleBook}
        />
      )}

      {showB && barber && (
        <BookingModal
          barber={barber}
          seat={selectedSeat}
          prices={barber.services ? barber.services.reduce((acc, service) => {
            acc[service] = 25; // Default price, can be customized per barber
            return acc;
          }, {}) : {}}
          onClose={() => { setShowB(false); setSelectedSeat(null); }}
          onPay={handlePay}
        />
      )}

      {toast && (
        <div className="fixed bottom-8 right-8 bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg">
          <p className="font-semibold">✓ Booking Successful!</p>
          <p className="text-sm">Your seat has been reserved.</p>
        </div>
      )}
    </main>
  );
}


