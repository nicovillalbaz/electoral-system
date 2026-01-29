'use client';
import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { MapPin, Plus, Activity } from 'lucide-react';

export default function StationsPage() {
  const [stations, setStations] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newStation, setNewStation] = useState({ name: '' });

  useEffect(() => { loadStations(); }, []);

  const loadStations = async () => {
    const res = await api.get('/stations');
    setStations(res.data);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/stations', newStation);
    setShowModal(false);
    setNewStation({ name: '' });
    loadStations();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <MapPin className="text-zinc-500" /> Puestos de Control
        </h1>
        <button onClick={() => setShowModal(true)} className="bg-white text-black px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-zinc-200">
          <Plus size={16} /> Agregar Puesto
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm text-zinc-400">
          <thead className="bg-black text-zinc-500 uppercase text-xs font-bold tracking-wider">
            <tr>
              <th className="p-4">Nombre del Puesto</th>
              <th className="p-4">Estado</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {stations.map((s) => (
              <tr key={s.id} className="hover:bg-zinc-800/50">
                <td className="p-4 font-bold text-white">{s.name}</td>
                <td className="p-4"><span className="text-emerald-500 text-xs font-bold px-2 py-1 bg-emerald-950 rounded border border-emerald-900">ACTIVO</span></td>
                <td className="p-4 text-right text-xs font-mono text-zinc-600">{s.id.slice(0,8)}...</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-700 w-full max-w-sm rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Nuevo Puesto</h2>
            <form onSubmit={handleCreate}>
              <label className="block text-xs font-bold text-zinc-400 mb-1">NOMBRE DEL LUGAR</label>
              <input 
                className="w-full bg-black border border-zinc-700 rounded p-3 text-white mb-4 focus:border-white outline-none"
                placeholder="Ej: Colegio Nacional..."
                value={newStation.name} onChange={e => setNewStation({name: e.target.value})} required 
              />
              <button type="submit" className="w-full bg-white text-black py-3 rounded font-black hover:bg-zinc-200">GUARDAR</button>
              <button type="button" onClick={() => setShowModal(false)} className="w-full mt-2 py-2 text-zinc-500 font-bold text-sm">CANCELAR</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}