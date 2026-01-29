'use client';
import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import api from '../../../lib/api';

const VOTE_INTENT_CONFIG: any = {
  SURE: { label: 'VOTO SEGURO', color: 'bg-emerald-600', text: 'text-white', icon: '✅' },
  PROBABLE: { label: 'PROBABLE', color: 'bg-yellow-600', text: 'text-black', icon: '🤔' },
  UNDECIDED: { label: 'INDECISO', color: 'bg-zinc-600', text: 'text-white', icon: '❔' },
  OPPOSITION: { label: 'OPOSICIÓN', color: 'bg-red-600', text: 'text-white', icon: '⛔' },
  ABSTAIN: { label: 'NO VOTA', color: 'bg-orange-800', text: 'text-white', icon: '💀' },
};

export default function CheckinPage() {
  // ESTADO DE SELECCIÓN DE PUESTO
  const [stationId, setStationId] = useState<string>('');
  const [stations, setStations] = useState<any[]>([]);
  const [stationName, setStationName] = useState('');

  // ESTADO DEL OPERATIVO
  const [ci, setCi] = useState('');
  const [debouncedCi] = useDebounce(ci, 500);
  const [person, setPerson] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{type: 'success'|'error', msg: string} | null>(null);

  // 1. AL CARGAR, BUSCAR PUESTOS DISPONIBLES
  useEffect(() => {
    const storedStation = localStorage.getItem('operator_station_id');
    const storedName = localStorage.getItem('operator_station_name');
    if (storedStation && storedName) {
      setStationId(storedStation);
      setStationName(storedName);
    } else {
      loadStations();
    }
  }, []);

  const loadStations = async () => {
    try {
      const res = await api.get('/stations');
      setStations(res.data);
    } catch (e) { console.error(e); }
  };

  const selectStation = (id: string, name: string) => {
    setStationId(id);
    setStationName(name);
    localStorage.setItem('operator_station_id', id);
    localStorage.setItem('operator_station_name', name);
  };

  const changeStation = () => {
    setStationId('');
    localStorage.removeItem('operator_station_id');
    loadStations();
  };

  // 2. LÓGICA DE BÚSQUEDA (Igual que antes)
  useEffect(() => {
    if (debouncedCi.length < 3) { setPerson(null); return; }
    searchPerson(debouncedCi);
  }, [debouncedCi]);

  const searchPerson = async (query: string) => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await api.get(`/persons?q=${query}&limit=1`);
      setPerson(res.data[0] || null);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleCheckin = async () => {
    if (!person || !stationId) return;
    setLoading(true);
    try {
      await api.post('/checkins', {
        stationId: stationId, 
        personId: person.id,
        voteIntentSnapshot: person.current_vote_intent
      });
      setStatusMsg({ type: 'success', msg: `VISITA REGISTRADA: ${person.first_name}` });
      setCi(''); setPerson(null);
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Error al registrar';
      setStatusMsg({ type: 'error', msg: msg });
    } finally {
      setLoading(false);
    }
  };

  const getCardStyle = () => {
    if (!person) return 'border-zinc-800 bg-zinc-900';
    if (person.current_vote_intent === 'SURE') return 'border-emerald-500 bg-zinc-900 ring-2 ring-emerald-500/20';
    if (person.current_vote_intent === 'OPPOSITION') return 'border-red-900 bg-red-950/30';
    return 'border-zinc-700 bg-zinc-900';
  };

  // --- VISTA 1: SELECCIÓN DE PUESTO (SI NO HAY PUESTO ELEGIDO) ---
  if (!stationId) {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex flex-col justify-center">
        <h1 className="text-2xl font-bold mb-2">Configuración Inicial</h1>
        <p className="text-zinc-500 mb-8">Seleccione su ubicación física hoy:</p>
        <div className="space-y-3">
          {stations.map(s => (
            <button key={s.id} onClick={() => selectStation(s.id, s.name)}
              className="w-full text-left p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-white transition-colors font-bold">
              {s.name}
            </button>
          ))}
          {stations.length === 0 && <p className="text-center animate-pulse">Cargando puestos...</p>}
        </div>
      </div>
    );
  }

  // --- VISTA 2: OPERATIVO (Igual que antes, con header mejorado) ---
  return (
    <div className="min-h-screen bg-black text-white p-4 flex flex-col">
      <div className="mb-6 flex justify-between items-center border-b border-zinc-800 pb-4">
        <div onClick={changeStation} className="cursor-pointer">
          <h2 className="text-zinc-500 text-[10px] font-bold tracking-widest uppercase">UBICACIÓN ACTUAL (CAMBIAR)</h2>
          <h1 className="text-lg font-bold truncate max-w-[200px] text-emerald-400">{stationName}</h1>
        </div>
        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
      </div>

      <div className="mb-8">
        <label className="text-zinc-400 text-sm font-bold mb-2 block">INGRESE CÉDULA (CI)</label>
        <input type="number" value={ci} onChange={(e) => setCi(e.target.value)} placeholder="Ej: 4500300"
          className="w-full bg-zinc-900 text-white text-4xl font-mono font-bold p-6 rounded-xl border-2 border-zinc-700 focus:border-white focus:outline-none placeholder-zinc-700 text-center"
          autoFocus />
      </div>

      {statusMsg && (
        <div className={`p-4 mb-6 rounded-lg font-bold text-center text-lg animate-bounce ${statusMsg.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          {statusMsg.msg}
        </div>
      )}

      {!loading && person && (
        <div className={`flex-1 flex flex-col justify-between rounded-2xl border-2 p-6 transition-all ${getCardStyle()}`}>
          <div>
            <div className={`inline-block px-3 py-1 rounded-full text-xs font-black tracking-widest mb-4 ${VOTE_INTENT_CONFIG[person.current_vote_intent]?.color || 'bg-gray-500'} ${VOTE_INTENT_CONFIG[person.current_vote_intent]?.text || 'text-white'}`}>
              {VOTE_INTENT_CONFIG[person.current_vote_intent]?.icon} {VOTE_INTENT_CONFIG[person.current_vote_intent]?.label}
            </div>
            <h3 className="text-3xl font-bold mb-1 leading-tight">{person.last_name}</h3>
            <p className="text-xl text-zinc-300 mb-4">{person.first_name}</p>
            {person.current_vote_intent === 'OPPOSITION' && (
              <div className="mt-4 p-3 bg-red-900/50 border border-red-500 text-red-200 text-sm font-bold rounded flex items-center gap-2">⚠️ CUIDADO: Oposición.</div>
            )}
          </div>
          <button onClick={handleCheckin} className="w-full mt-6 bg-white text-black text-xl font-black py-5 rounded-xl uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform shadow-xl shadow-zinc-900/50">
            REGISTRAR VISITA
          </button>
        </div>
      )}
      {!loading && !person && ci.length > 3 && (
        <div className="text-center p-8 bg-zinc-900 rounded-xl border border-zinc-800 border-dashed">
          <p className="text-zinc-500 text-lg mb-2">Persona no encontrada</p>
        </div>
      )}
    </div>
  );
}