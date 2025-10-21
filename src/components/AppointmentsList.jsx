import React from 'react';
import { supabase } from '../lib/supabaseClient.js';

export default function AppointmentsList({ items, onAccept }){
  const accept = async (a)=>{
    onAccept(a);
    try {
      await supabase.from('appointments').update({ status: 'accepted' }).eq('id', a.id);
      await supabase.from('current_state').upsert({ id:1, customer_name: a.customer_name, seat_id: a.seat_id });
    } catch(_) {}
  };
  return (
    <div className="grid md:grid-cols-3 gap-6 mt-6">
      {items.map(a=>{
        const dt = new Date(a.date_time);
        return (
          <div key={a.id} className="bg-white rounded-lg shadow p-4 flex flex-col gap-2">
            <div className="text-gray-800 font-semibold">{dt.toLocaleDateString()} {dt.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
            <div className="text-sm text-gray-600">Seat: {a.seat_id}</div>
            <div className="text-sm text-gray-600">Services: {a.services.join(', ')}</div>
            <button onClick={()=>accept(a)} className="mt-2 bg-green-600 text-white px-3 py-2 rounded">Accept</button>
          </div>
        );
      })}
    </div>
  );
}


