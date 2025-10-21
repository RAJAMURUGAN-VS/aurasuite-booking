import React from 'react';

function Timer({ expiresAt }) {
  const [left, setLeft] = React.useState(0);
  React.useEffect(() => {
    const calc = () => Math.max(0, Math.floor((new Date(expiresAt) - new Date()) / 1000));
    setLeft(calc());
    const id = setInterval(() => setLeft(calc()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  const m = String(Math.floor(left / 60)).padStart(2, '0');
  const s = String(left % 60).padStart(2, '0');
  const low = left < 60;
  return (
    <div className={`flex items-center gap-1 text-xs font-medium ${low ? 'text-red-600 animate-pulse' : 'text-gray-700'}`}>
      <span>⏱</span>
      <span>{m}:{s}</span>
    </div>
  );
}

export default function Seat({ seat, onClick }) {
  const isBooked = seat.state === 'booked';
  const isAvailable = seat.state === 'available';
  const isReserved = seat.state === 'reserved';
  const color = isAvailable ? 'bg-green-500 hover:bg-green-600 focus:ring-green-300' : isBooked ? 'bg-red-500 hover:bg-red-600 focus:ring-red-300' : 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-300';

  return (
    <div className="flex items-center gap-2">
      {isBooked && seat.expiresAt && (
        <div className="flex-shrink-0">
          <Timer expiresAt={seat.expiresAt} />
        </div>
      )}
      <button
        onClick={() => onClick(seat)}
        className={`w-24 h-24 rounded-lg font-semibold text-white transition-all cursor-pointer ${color} hover:scale-105 focus:ring-4`}
        aria-label={`${seat.label} - ${isAvailable ? 'Available' : isBooked ? 'Booked' : 'Reserved'}`}
      >
        {seat.label}
      </button>
    </div>
  );
}


