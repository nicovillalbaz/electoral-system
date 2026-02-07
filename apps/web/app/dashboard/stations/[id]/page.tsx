'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '../../../../lib/api';
import { ArrowRight, CheckCircle, Clock, MapPin, Search, UserCheck, AlertTriangle } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useDebounce } from 'use-debounce';

export default function StationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const stationId = params.id as string;
    
    // Data states
    const [station, setStation] = useState<any>(null);
    const [stats, setStats] = useState({ total_checkins: 0, voted_checkins: 0 });
    const [checkins, setCheckins] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal / Check-in states
    const [showCheckinModal, setShowCheckinModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch] = useDebounce(searchQuery, 400);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Parallel fetch
            const [listRes, statsRes, checkinsRes] = await Promise.all([
                api.get('/stations'), // Inefficient but simple for now to get Name
                api.get(`/stations/${stationId}/stats`),
                api.get(`/stations/${stationId}/checkins`)
            ]);

            const currentStation = listRes.data.find((s: any) => s.id === stationId);
            setStation(currentStation);
            setStats(statsRes.data);
            setCheckins(checkinsRes.data);
        } catch (e) {
            console.error("Failed to load station data", e);
        } finally {
            setLoading(false);
        }
    }, [stationId]);

    useEffect(() => {
        if (stationId) loadData();
    }, [stationId, loadData]);

    // Search Logic
    useEffect(() => {
        if (!debouncedSearch) {
            setSearchResults([]);
            return;
        }
        setSearching(true);
        api.get(`/persons?q=${debouncedSearch}`)
            .then(res => setSearchResults(res.data.data))
            .catch(e => console.error(e))
            .finally(() => setSearching(false));
    }, [debouncedSearch]);

    const handleCheckin = async (personId: string) => {
        try {
            const res = await api.post('/checkins', {
                stationId: stationId,
                personId: personId,
                voteIntentSnapshot: 'UNDECIDED' // Default, maybe ask? 
            });

            if (res.data.warning) {
                alert(`⚠️ ${res.data.warning}`);
            }

            setShowCheckinModal(false);
            setSearchQuery('');
            loadData(); // Refresh list
        } catch (e: any) {
            alert(e.response?.data?.message || "Error al registrar check-in");
        }
    }

    if (loading && !stats) return <div className="p-10 text-white">Cargando...</div>;

    const waitingList = checkins.filter(c => !c.has_voted);
    const votedList = checkins.filter(c => c.has_voted);

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4 shrink-0">
                <div>
                     <button onClick={() => router.back()} className="text-zinc-500 text-sm hover:text-white mb-1">← Volver</button>
                     <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <MapPin className="text-emerald-500" /> {station?.name || 'Cargando...'}
                    </h1>
                </div>
                <button 
                    onClick={() => setShowCheckinModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-emerald-900/20 transition-all"
                >
                    REGISTRAR LLEGADA
                </button>
            </div>

            {/* Funnel / KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                 {/* Step 1: Check-ins (Llegada) */}
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl relative overflow-hidden">
                     <div className="flex justify-between items-start z-10 relative">
                        <div>
                            <p className="text-zinc-500 text-xs font-bold uppercase">Llegaron al PC</p>
                            <p className="text-3xl font-black text-white mt-1">{stats.total_checkins}</p>
                        </div>
                        <div className="bg-blue-900/30 text-blue-400 p-2 rounded-lg"><UserCheck size={20}/></div>
                     </div>
                     <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500/50"></div>
                </div>

                {/* Arrow */}
                <div className="hidden md:flex items-center justify-center text-zinc-700">
                    <ArrowRight size={32} />
                </div>

                {/* Step 2: Voted (Confirmado) */}
                 <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl relative overflow-hidden">
                     <div className="flex justify-between items-start z-10 relative">
                        <div>
                            <p className="text-zinc-500 text-xs font-bold uppercase">Confirmado Voto</p>
                            <p className="text-3xl font-black text-emerald-400 mt-1">{stats.voted_checkins}</p>
                        </div>
                        <div className="bg-emerald-900/30 text-emerald-400 p-2 rounded-lg"><CheckCircle size={20}/></div>
                     </div>
                     {/* Retention Rate */}
                     <p className="text-xs text-zinc-500 mt-2">
                        Retención: {stats.total_checkins > 0 ? Math.round((stats.voted_checkins / stats.total_checkins) * 100) : 0}%
                     </p>
                     <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500/50"></div>
                </div>
            </div>

             {/* Lists Split View */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
                {/* Left: En Espera */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl flex flex-col min-h-0">
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/80 sticky top-0 rounded-t-xl">
                        <h3 className="font-bold text-orange-400 flex items-center gap-2">
                            <Clock size={18}/> En Espera (Aquí)
                        </h3>
                        <span className="bg-orange-950 text-orange-400 px-2 py-0.5 rounded text-xs font-bold">{waitingList.length}</span>
                    </div>
                    <div className="overflow-y-auto p-2 space-y-2 flex-1 scrollbar-thin scrollbar-thumb-zinc-700">
                        {waitingList.length === 0 && <p className="text-zinc-600 text-center py-10 italic">Nadie en espera.</p>}
                        {waitingList.map(item => (
                            <div key={item.checkin_id} className="bg-zinc-950 p-3 rounded border border-white/5 flex justify-between items-center group hover:border-orange-500/30 transition-all">
                                <div>
                                    <p className="font-bold text-zinc-200">{item.first_name} {item.last_name}</p>
                                    <p className="text-xs text-zinc-500 font-mono">{item.document_id}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-orange-500 font-bold mb-0.5">{new Date(item.checkin_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                    <p className="text-[10px] text-zinc-600">Llegada</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Ya Votaron */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl flex flex-col min-h-0">
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/80 sticky top-0 rounded-t-xl">
                        <h3 className="font-bold text-emerald-500 flex items-center gap-2">
                            <CheckCircle size={18}/> Ya Votaron
                        </h3>
                        <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded text-xs font-bold">{votedList.length}</span>
                    </div>
                     <div className="overflow-y-auto p-2 space-y-2 flex-1 scrollbar-thin scrollbar-thumb-zinc-700">
                        {votedList.length === 0 && <p className="text-zinc-600 text-center py-10 italic">Aún nadie ha votado.</p>}
                        {votedList.map(item => (
                            <div key={item.checkin_id} className="bg-zinc-950 p-3 rounded border border-white/5 border-l-2 border-l-emerald-500 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-zinc-400 line-through decoration-zinc-600">{item.first_name} {item.last_name}</p>
                                    <p className="text-xs text-zinc-600 font-mono">{item.document_id}</p>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                                        <CheckCircle size={12}/> Confirmado
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
             </div>

             {/* Modal Check-in */}
             {showCheckinModal && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-zinc-900 border border-zinc-700 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                             <h2 className="text-lg font-bold text-white">Registrar Llegada al PC</h2>
                             <button onClick={() => setShowCheckinModal(false)} className="text-zinc-500 hover:text-white">✕</button>
                        </div>
                        <div className="p-4 sticky top-0 bg-zinc-900 z-10">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 text-zinc-500" size={18} />
                                <input 
                                    autoFocus
                                    className="w-full bg-black border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-white focus:border-emerald-500 outline-none transition-colors"
                                    placeholder="Buscar por Nombre o Cédula..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                                {searching && <div className="absolute right-3 top-3 animate-spin rounded-full h-4 w-4 border-2 border-zinc-500 border-t-transparent"></div>}
                            </div>
                        </div>

                        <div className="overflow-y-auto p-2 flex-1 space-y-1">
                            {searchResults.map(p => (
                                <button 
                                    key={p.id}
                                    onClick={() => handleCheckin(p.id)}
                                    className="w-full text-left p-3 hover:bg-zinc-800 rounded-lg flex justify-between items-center group transition-colors"
                                >
                                    <div>
                                        <p className="font-bold text-white group-hover:text-emerald-400">{p.first_name} {p.last_name}</p>
                                        <p className="text-xs text-zinc-500 font-mono">{p.document_id}</p>
                                    </div>
                                    {p.has_voted ? (
                                        <span className="text-xs bg-red-900/50 text-red-500 px-2 py-1 rounded border border-red-900">Ya Votó</span>
                                    ) : (
                                        <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded group-hover:bg-emerald-900 group-hover:text-emerald-400">Seleccionar</span>
                                    )}
                                </button>
                            ))}
                            {debouncedSearch && searchResults.length === 0 && !searching && (
                                <div className="text-center py-8 text-zinc-500">
                                    <p>No se encontraron resultados</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
             )}
        </div>
    );
}
