'use client';
import { useState, useEffect, useRef } from 'react';
import api from '../../../lib/api';
import { Bell, AlertTriangle, AlertOctagon, Info, CheckCircle, Car } from 'lucide-react';

export default function LiveFeed() {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchEvents = async () => {
        // Skip if tab is hidden (Smart Polling)
        if (document.hidden) return;

        try {
            const res = await api.get('/events?limit=25');
            setEvents(res.data);
            setLoading(false);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchEvents(); // Initial
        
        // Polling every 15s
        intervalRef.current = setInterval(fetchEvents, 15000);

        // Smart Resume
        const onVisibilityChange = () => {
             if (!document.hidden) {
                 fetchEvents();
                 if (!intervalRef.current) intervalRef.current = setInterval(fetchEvents, 15000);
             } else {
                 if (intervalRef.current) {
                     clearInterval(intervalRef.current);
                     intervalRef.current = null;
                 }
             }
        }

        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, []);

    const getIcon = (type: string) => {
        if (type === 'INCIDENT_REPORT') return <AlertOctagon size={16} />;
        if (type === 'PERSON_MARKED_VOTED') return <CheckCircle size={16} />;
        if (type.includes('TRANSPORT')) return <Car size={16} />;
        return <Info size={16} />;
    };

    const formatTime = (iso: string) => {
        return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col h-full max-h-[500px]">
            <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50 rounded-t-xl">
                <h3 className="font-bold text-zinc-400 text-xs uppercase flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> Live Feed
                </h3>
                <button onClick={fetchEvents} className="text-xs text-zinc-600 hover:text-white">Refresh</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-zinc-800">
                {events.map(e => {
                    const isIncident = e.event_type === 'INCIDENT_REPORT';
                    const severity = e.payload?.severity || 'MEDIUM';
                    const isCritical = isIncident && (severity === 'HIGH' || severity === 'CRITICAL');

                    return (
                        <div 
                            key={e.id} 
                            className={`p-3 rounded-lg border flex gap-3 text-sm
                                ${isCritical 
                                    ? 'bg-red-950/50 border-red-500 text-red-200 animate-pulse-slow' 
                                    : isIncident
                                        ? 'bg-yellow-950/30 border-yellow-700/50 text-yellow-200'
                                        : 'bg-zinc-950 border-white/5 text-zinc-400'
                                }
                            `}
                        >
                            <div className={`mt-0.5 shrink-0 ${isCritical ? 'text-red-500' : isIncident ? 'text-yellow-500' : 'text-zinc-600'}`}>
                                {getIcon(e.event_type)}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <span className={`font-bold ${isCritical ? 'text-white' : 'text-zinc-300'}`}>
                                        {e.actor_name || 'Sistema'}
                                    </span>
                                    <span className="text-[10px] opacity-60 font-mono">{formatTime(e.created_at)}</span>
                                </div>
                                <p className="leading-snug mt-1">
                                    {isIncident 
                                        ? <span className="uppercase font-bold">{e.payload?.subType}: {e.payload?.description}</span>
                                        : (
                                            <>
                                                {e.event_type === 'PERSON_MARKED_VOTED' && `Marcó voto confirmado`}
                                                {e.event_type === 'STATION_CHECKIN_CREATED' && `Registró llegada al PC`}
                                                {e.event_type === 'PERSON_UPDATED' && `Actualizó datos: ${e.payload?.details || ''}`}
                                                {/* Fallback */}
                                                {!['PERSON_MARKED_VOTED','STATION_CHECKIN_CREATED','PERSON_UPDATED'].includes(e.event_type) && e.event_type}
                                            </>
                                        )
                                    }
                                </p>
                                {e.station_name && (
                                    <p className="text-[10px] mt-1 opacity-50 flex items-center gap-1">
                                        <div className="w-1 h-1 rounded-full bg-current"></div> {e.station_name}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
                {events.length === 0 && !loading && (
                    <div className="text-center py-10 text-zinc-600 italic text-xs">Sin actividad reciente</div>
                )}
            </div>
        </div>
    );
}
