import React from 'react';
import AdminControlBox from '../components/AdminControlBox.jsx';
import AppointmentsList from '../components/AppointmentsList.jsx';
import { supabase } from '../lib/supabaseClient.js';

export default function AdminDashboard(){
  const [current, setCurrent] = React.useState({ approx_time_minutes: 15, paused:false });
  const [appointments, setAppointments] = React.useState([]);

  React.useEffect(()=>{
    (async ()=>{
      try {
        const { data: cur } = await supabase.from('current_state').select('*').eq('id',1).maybeSingle();
        if (cur) setCurrent(cur);
      } catch(_){}
      try {
        const { data: apps } = await supabase.from('appointments').select('*').eq('status','pending').order('date_time');
        if (apps) setAppointments(apps);
      } catch(_){}
    })();
  }, []);

  const onChangeApprox = (min)=> setCurrent((c)=>({ ...c, approx_time_minutes: min }));
  const onTogglePause = ()=> setCurrent((c)=>({ ...c, paused: !c.paused }));
  const onNext = async ()=>{
    setCurrent({ approx_time_minutes: current.approx_time_minutes, paused:false, customer_name: null, seat_id: null });
    try { await supabase.from('current_state').upsert({ id:1, customer_name:null, seat_id:null, paused:false }); } catch(_){ }
  };
  const onAccept = (a)=>{
    setAppointments(prev=>prev.filter(x=>x.id!==a.id));
    setCurrent(c=>({ ...c, customer_name: a.customer_name || 'Walk-in', seat_id: a.seat_id }));
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <AdminControlBox current={current} onChangeApprox={onChangeApprox} onTogglePause={onTogglePause} onNext={onNext} />
      <h3 className="mt-8 text-2xl font-bold text-gray-800">Appointments</h3>
      <AppointmentsList items={appointments} onAccept={onAccept} />
    </div>
  );
}


