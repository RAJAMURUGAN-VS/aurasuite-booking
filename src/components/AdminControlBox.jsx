import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';

export default function AdminControlBox({ current, onChangeApprox, onTogglePause, onNext }){
  const [editing, setEditing] = useState(false);
  const [minutes, setMinutes] = useState(current?.approx_time_minutes || 0);

  const save = async ()=>{
    setEditing(false);
    onChangeApprox(minutes);
    try { await supabase.from('current_state').upsert({ id:1, approx_time_minutes: minutes }); } catch(_){ }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="text-lg"><span className="font-semibold">Now Serving:</span> {current?.customer_name || '—'}</div>
      <div className="flex items-center gap-3">
        {!editing ? (
          <div className="text-gray-700"><span className="font-semibold">Approx:</span> {minutes} min</div>
        ):(
          <input type="number" className="border rounded px-2 py-1 w-24" value={minutes} onChange={(e)=>setMinutes(Number(e.target.value))} />
        )}
        {!editing ? (
          <button onClick={()=>setEditing(true)} className="bg-blue-600 text-white px-3 py-2 rounded">Change</button>
        ):(
          <button onClick={save} className="bg-blue-600 text-white px-3 py-2 rounded">Save</button>
        )}
        <button onClick={onTogglePause} className="bg-amber-600 text-white px-3 py-2 rounded">{current?.paused ? 'Resume' : 'Pause'}</button>
        <button onClick={onNext} className="bg-green-600 text-white px-3 py-2 rounded">Next</button>
      </div>
    </div>
  );
}


