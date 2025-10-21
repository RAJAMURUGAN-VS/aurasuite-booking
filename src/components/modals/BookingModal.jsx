import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient.js';

export default function BookingModal({ barber, seat, prices, bookedSlots = [], onClose, onPay }){
  const [selectedServices, setSelectedServices] = useState([]);
  const [showServiceMenu, setShowServiceMenu] = useState(false);
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [errors, setErrors] = useState({});
  const dialogRef = useRef(null);

  const services = Object.keys(prices);
  const availableTimes = Array.from({length: 17}, (_,i)=>{
    const h = 9 + Math.floor(i/2); const m = i%2 ? '30' : '00';
    return `${String(h).padStart(2,'0')}:${m}`;
  });

  useEffect(()=>{
    const onKey=(e)=>{ if (e.key==='Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const first = dialogRef.current?.querySelector('button,select,input');
    first && first.focus();
    return ()=>document.removeEventListener('keydown', onKey);
  },[onClose]);

  const addService = (s)=>{ if(!selectedServices.includes(s)){ setSelectedServices([...selectedServices, s]); setErrors(e=>({ ...e, services:null })); } setShowServiceMenu(false); };
  const removeService = (s)=> setSelectedServices(selectedServices.filter(x=>x!==s));

  const subtotal = selectedServices.reduce((sum, s)=> sum + prices[s], 0);
  const tax = subtotal * 0.085;
  const total = subtotal + tax;

  async function checkConflict() {
    // Supabase: check any appointment with same seat + date_time
    try {
      if (!selectedDate || !selectedTime) return false;
      const dateTime = new Date(`${selectedDate}T${selectedTime}:00`);
      if (supabase) {
        const { data, error } = await supabase
          .from('appointments')
          .select('id')
          .eq('seat_id', seat.id)
          .eq('date_time', dateTime.toISOString())
          .limit(1);
        if (error) throw error;
        if (data && data.length) return true;
      }
    } catch(e) {
      // Fall through to client mock
    }
    // Client fallback: consult provided bookedSlots
    return bookedSlots.some(slot => slot.seatId===seat.id && slot.date===selectedDate && slot.time===selectedTime);
  }

  const handlePay = async ()=>{
    const newErrors = {};
    if (!selectedServices.length) newErrors.services = 'Please select at least one service';
    if (!selectedDate) newErrors.date = 'Please select a date';
    if (!selectedTime) newErrors.time = 'Please select a time';
    const conflict = await checkConflict();
    if (conflict) newErrors.conflict = 'This seat is already booked for the selected date and time. Please choose another time.';
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }

    // Create appointment in Supabase (best-effort)
    try {
      const dateTime = new Date(`${selectedDate}T${selectedTime}:00`);
      
      // Get current user for customer_id
      const { data: { user } } = await supabase.auth.getUser();
      const customerId = user?.id || null;
      const customerName = user?.user_metadata?.name || 'Guest';
      
      await supabase.from('appointments').insert({ 
        customer_name: customerName, 
        customer_id: customerId,
        date_time: dateTime.toISOString(), 
        services: selectedServices, 
        seat_id: seat.id, 
        barber_id: barber.id,
        status: 'pending' 
      });
    } catch(_) { /* offline/mock */ }
    onPay();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div ref={dialogRef} className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold text-gray-800">Complete Your Booking</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">✕</button>
        </div>
        {errors.conflict && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4"><p className="text-red-800 font-medium">⚠️ {errors.conflict}</p></div>
        )}
        <div className="grid md:grid-cols-2 gap-8 p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Services</label>
              <div className="relative">
                <button onClick={()=>setShowServiceMenu(!showServiceMenu)} className="w-full flex items-center justify-between bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-left hover:bg-gray-100">
                  <span className="text-gray-700">Choose a service</span><span>▾</span>
                </button>
                {showServiceMenu && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {services.map(s=> (
                      <button key={s} onClick={()=>addService(s)} disabled={selectedServices.includes(s)} className="w-full text-left px-4 py-2 hover:bg-gray-50 disabled:opacity-50">
                        {s} - ${prices[s]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {errors.services && <p className="text-red-500 text-sm mt-1">{errors.services}</p>}
            </div>
            {selectedServices.length>0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Selected Services</label>
                <div className="flex flex-wrap gap-2">
                  {selectedServices.map(s=> (
                    <div key={s} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center gap-2">
                      <span className="text-sm font-medium">{s}</span>
                      <button onClick={()=>removeService(s)} className="hover:bg-blue-200 rounded-full p-0.5" aria-label={`Remove ${s}`}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Time</label>
              <select value={selectedTime} onChange={(e)=>{ setSelectedTime(e.target.value); setErrors(e0=>({ ...e0, time:null, conflict:null })); }} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3">
                <option value="">Choose time</option>
                {availableTimes.map(t=> <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.time && <p className="text-red-500 text-sm mt-1">{errors.time}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Date</label>
              <input type="date" value={selectedDate} min={new Date().toISOString().split('T')[0]} onChange={(e)=>{ setSelectedDate(e.target.value); setErrors(e0=>({ ...e0, date:null, conflict:null })); }} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3" />
              {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
            </div>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 h-fit sticky top-24">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Booking Summary</h3>
            <div className="mb-4 pb-4 border-b border-gray-300">
              <div className="flex items-center gap-3 mb-2">
                <img src={barber.photo} alt={barber.name} className="w-12 h-12 rounded-full" />
                <div>
                  <p className="font-semibold text-gray-800">{barber.name}</p>
                  <div className="flex items-center gap-1 text-yellow-500">{'★★★★★'.slice(0, Math.round(barber.rating))}<span className="text-sm text-gray-600">{barber.rating}</span></div>
                </div>
              </div>
              <p className="text-sm text-gray-600">Seat: <span className="font-semibold">{seat.label}</span></p>
              {selectedDate && <p className="text-sm text-gray-600">Date: <span className="font-semibold">{selectedDate}</span></p>}
              {selectedTime && <p className="text-sm text-gray-600">Time: <span className="font-semibold">{selectedTime}</span></p>}
            </div>
            <div className="space-y-2 mb-4">
              {selectedServices.length ? selectedServices.map(s=> (
                <div key={s} className="flex justify-between text-sm"><span className="text-gray-700">{s}</span><span className="font-semibold text-gray-800">${prices[s]}</span></div>
              )) : <p className="text-sm text-gray-500 italic">No services selected</p>}
            </div>
            {selectedServices.length>0 && (
              <>
                <div className="border-t border-gray-300 pt-4 space-y-2 mb-4">
                  <div className="flex justify-between text-sm"><span className="text-gray-700">Subtotal</span><span className="font-semibold text-gray-800">${subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-700">Tax (8.5%)</span><span className="font-semibold text-gray-800">${tax.toFixed(2)}</span></div>
                </div>
                <div className="border-t-2 border-gray-400 pt-4 mb-6">
                  <div className="flex justify-between"><span className="text-lg font-bold text-gray-800">Total</span><span className="text-lg font-bold text-gray-800">${total.toFixed(2)}</span></div>
                </div>
              </>
            )}
            <button onClick={handlePay} disabled={!selectedServices.length || !selectedDate || !selectedTime} className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg">Pay Now</button>
          </div>
        </div>
      </div>
    </div>
  );
}


