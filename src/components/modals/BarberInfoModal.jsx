import React, { useEffect, useRef } from 'react';

export default function BarberInfoModal({ barber, seat, onClose, onBook }){
  const dialogRef = useRef(null);
  useEffect(()=>{
    const onKey=(e)=>{ if (e.key==='Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const first = dialogRef.current?.querySelector('button');
    first && first.focus();
    return ()=>document.removeEventListener('keydown', onKey);
  },[onClose]);
  const isBooked = seat.state==='booked';
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div ref={dialogRef} className="bg-white rounded-xl shadow-2xl max-w-xl w-full p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" aria-label="Close">✕</button>
        <div className="flex items-start gap-4 mb-6">
          <img src={barber.photo} alt={barber.name} className="w-20 h-20 rounded-full object-cover" />
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-800 mb-1">{barber.name}</h2>
            <div className="flex items-center gap-2 text-yellow-500">{'★★★★★'.slice(0, Math.round(barber.rating))}<span className="text-gray-700 text-sm">{barber.rating}</span></div>
          </div>
        </div>
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">User Feedback</h3>
          <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
            {barber.reviews.map((r,idx)=>(
              <div key={idx} className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-semibold text-gray-700 mb-1">{r.user}</p>
                <p className="text-sm text-gray-600">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
        {isBooked ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
            <p className="text-yellow-800 font-medium">This seat is currently booked</p>
            <p className="text-sm text-yellow-600 mt-1">You can still choose services and schedule.</p>
            <button onClick={onBook} className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg">Book Seat</button>
          </div>
        ):(
          <button onClick={onBook} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg">Book Seat</button>
        )}
      </div>
    </div>
  );
}


