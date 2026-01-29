'use client';
import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { ShieldAlert, RefreshCw } from 'lucide-react';

export default function AuditPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadEvents(); }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/events?limit=50');
      setEvents(res.data);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleString('es-PY', { 
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' 
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="text-orange-500" /> Registro de Auditoría
          </h1>
          <p className="text-zinc-500 text-sm">Eventos de seguridad y operaciones en tiempo real.</p>
        </div>
        <button onClick={loadEvents} className="text-zinc-400 hover:text-white p-2 bg-zinc-900 rounded border border-zinc-700">
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="space-y-2 font-mono text-sm">
        {events.map((e) => (
          <div key={e.id} className="bg-zinc-900 border-l-2 border-zinc-700 p-3 hover:bg-zinc-800 transition-colors flex flex-col md:flex-row gap-4 items-start md:items-center">
            
            {/* HORA */}
            <div className="text-zinc-500 text-xs w-32 shrink-0">{formatTime(e.created_at)}</div>
            
            {/* ACTOR */}
            <div className="w-48 shrink-0">
              <span className="text-zinc-300 font-bold block">{e.actor_name || 'Sistema'}</span>
              <span className="text-zinc-600 text-xs">ID: {e.actor_user_id ? e.actor_user_id.slice(0,6) : 'SYS'}...</span>
            </div>

            {/* EVENTO */}
            <div className="flex-1">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider mr-2 
                ${e.event_type.includes('ERROR') || e.event_type.includes('DUPLICATE') ? 'bg-red-900 text-red-300' : 'bg-blue-900 text-blue-300'}`}>
                {e.event_type}
              </span>
              <span className="text-zinc-400">
                {e.payload ? JSON.stringify(e.payload).slice(0, 80) : ''}
                {e.payload && JSON.stringify(e.payload).length > 80 ? '...' : ''}
              </span>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}