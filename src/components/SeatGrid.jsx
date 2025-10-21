import React from 'react';
import Seat from './Seat.jsx';
import BookingModal from './modals/BookingModal.jsx';
import BarberInfoModal from './modals/BarberInfoModal.jsx';
import { useSeatTimers } from '../hooks/useSeatTimers.js';

const MOCK = {
  seats: [
    { id: 'S1', label: 'Seat 1', state: 'available', barberId: 'B1' },
    { id: 'S2', label: 'Seat 2', state: 'booked', expiresAt: new Date(Date.now()+2*60*1000).toISOString(), barberId: 'B2' },
    { id: 'S3', label: 'Seat 3', state: 'available', barberId: 'B3' },
    { id: 'S4', label: 'Seat 4', state: 'booked', expiresAt: new Date(Date.now()+5*60*1000).toISOString(), barberId: 'B1' },
    { id: 'S5', label: 'Seat 5', state: 'available', barberId: 'B2' },
    { id: 'S6', label: 'Seat 6', state: 'booked', expiresAt: new Date(Date.now()+40*1000).toISOString(), barberId: 'B3' },
  ],
  barbers: {
    B1: { id: 'B1', name: 'Marco Silva', rating: 4.8, photo: 'https://via.placeholder.com/100/4A5568/ffffff?text=MS', reviews: Array(6).fill(0).map((_,i)=>({user:`User ${i+1}`, text:'Great service and very professional.'})) },
    B2: { id: 'B2', name: 'Priya Kapoor', rating: 4.6, photo: 'https://via.placeholder.com/100/EC4899/ffffff?text=PK', reviews: Array(5).fill(0).map((_,i)=>({user:`Reviewer ${i+1}`, text:'Detailed and stylish cut.'})) },
    B3: { id: 'B3', name: 'James Chen', rating: 4.9, photo: 'https://via.placeholder.com/100/8B5CF6/ffffff?text=JC', reviews: Array(6).fill(0).map((_,i)=>({user:`Client ${i+1}`, text:'Amazing experience every time!'})) },
  },
  prices: { 'Haircut':25, 'Shaving':15, 'Grooming':40, 'Beard Trim':18, 'Kids Cut':20 },
  bookedSlots: [ { seatId: 'S2', date: '2025-10-20', time: '10:00' }, { seatId: 'S4', date: '2025-10-20', time: '14:30' } ],
};

export default function SeatGrid(){
  const [seats, setSeats] = React.useState(MOCK.seats);
  const [selectedSeat, setSelectedSeat] = React.useState(null);
  const [showA, setShowA] = React.useState(false);
  const [showB, setShowB] = React.useState(false);
  const [toast, setToast] = React.useState(false);

  useSeatTimers(seats, (expiredIds)=>{
    setSeats(prev=>prev.map(s=> expiredIds.includes(s.id)? { ...s, state:'available', expiresAt:null } : s));
  });

  const handleSeatClick = (seat)=>{
    setSelectedSeat(seat);
    setShowA(true);
  };

  const handleBook = ()=>{ setShowA(false); setShowB(true); };
  const handlePay = ()=>{
    setShowB(false); setToast(true); setTimeout(()=>setToast(false), 2500);
    setSeats(prev=>prev.map(s=> s.id===selectedSeat.id ? { ...s, state:'booked', expiresAt:new Date(Date.now()+15*60*1000).toISOString() } : s));
    setSelectedSeat(null);
  };

  const left = seats.slice(0,3); const right = seats.slice(3,6);
  const barber = selectedSeat ? MOCK.barbers[selectedSeat.barberId] : null;

  return (
    <main className="flex items-center justify-center min-h-[calc(100vh-80px)] p-8">
      <div className="w-full max-w-4xl">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Book Your Seat</h2>
          <p className="text-gray-600">Select any seat to view barber info or make a booking</p>
        </div>

        <div className="flex flex-wrap gap-4 justify-center mb-8 bg-white rounded-lg p-4 shadow">
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-500 rounded"></div><span className="text-sm text-gray-700">Available</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-500 rounded"></div><span className="text-sm text-gray-700">Booked</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-amber-500 rounded"></div><span className="text-sm text-gray-700">Reserved</span></div>
        </div>

        <div className="flex justify-center gap-12 items-start">
          <div className="flex flex-col gap-8">
            {left.map(seat => (
              <Seat key={seat.id} seat={seat} onClick={handleSeatClick} />
            ))}
          </div>

          <div className="w-1 h-96 bg-gradient-to-b from-gray-300 via-gray-400 to-gray-300 rounded-full shadow-lg" />

          <div className="flex flex-col gap-8">
            {right.map(seat => (
              <Seat key={seat.id} seat={seat} onClick={handleSeatClick} />
            ))}
          </div>
        </div>
      </div>

      {showA && barber && (
        <BarberInfoModal
          barber={barber}
          seat={selectedSeat}
          onClose={()=>{ setShowA(false); setSelectedSeat(null); }}
          onBook={handleBook}
        />
      )}

      {showB && barber && (
        <BookingModal
          barber={barber}
          seat={selectedSeat}
          prices={MOCK.prices}
          bookedSlots={MOCK.bookedSlots}
          onClose={()=>{ setShowB(false); setSelectedSeat(null); }}
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


