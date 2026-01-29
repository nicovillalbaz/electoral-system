"use client";
import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import api from "../../../lib/api";
import { Search, Edit, Plus } from "lucide-react";
import { X } from "lucide-react";
export default function PersonsPage() {
  const [search, setSearch] = useState("");
  const [query] = useDebounce(search, 500);
  const [persons, setPersons] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    documentId: "",
    firstName: "",
    lastName: "",
    currentVoteIntent: "UNDECIDED",
  });
  const handleCreate = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    await api.post('/persons', formData);
    setShowModal(false);
    setFormData({ documentId: '', firstName: '', lastName: '', currentVoteIntent: 'UNDECIDED' });
    setSearch(formData.documentId); // Buscar al recién creado
    loadPersons();
  } catch (error) { alert('Error al crear. Verifique que la cédula no exista.'); }
};
  useEffect(() => {
    loadPersons();
  }, [query]);

  const loadPersons = async () => {
    setLoading(true);
    try {
      // Usa el endpoint de búsqueda que ya tienes en backend
      const res = await api.get(`/persons?q=${query}&limit=50`);
      setPersons(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Padrón Electoral</h1>
        <button onClick={() => setShowModal(true)} className="bg-white text-black px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-zinc-200">
          <Plus size={16} /> Nueva Persona
        </button>
      </div>

      {/* BUSCADOR */}
      <div className="relative">
        <Search className="absolute left-4 top-3.5 text-zinc-500" size={20} />
        <input
          type="text"
          placeholder="Buscar por Cédula, Nombre o Apellido..."
          className="w-full bg-zinc-900 border border-zinc-800 text-white pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-white focus:outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* TABLA */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm text-zinc-400">
          <thead className="bg-black text-zinc-500 uppercase text-xs font-bold tracking-wider">
            <tr>
              <th className="p-4">Cédula</th>
              <th className="p-4">Nombre Completo</th>
              <th className="p-4">Intención</th>
              <th className="p-4">Estado</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center animate-pulse">
                  Buscando...
                </td>
              </tr>
            ) : (
              persons.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-zinc-800/50 transition-colors"
                >
                  <td className="p-4 font-mono text-white">{p.document_id}</td>
                  <td className="p-4 font-medium text-zinc-200">
                    {p.last_name}, {p.first_name}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold 
                    ${
                      p.current_vote_intent === "SURE"
                        ? "bg-emerald-900 text-emerald-300"
                        : p.current_vote_intent === "OPPOSITION"
                          ? "bg-red-900 text-red-300"
                          : "bg-zinc-800"
                    }`}
                    >
                      {p.current_vote_intent || "-"}
                    </span>
                  </td>
                  <td className="p-4">
                    {p.has_voted ? (
                      <span className="text-emerald-500 font-bold flex items-center gap-1">
                        ✅ VOTÓ
                      </span>
                    ) : (
                      <span className="text-zinc-600">Pendiente</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-zinc-400 hover:text-white p-2">
                      <Edit size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
            {!loading && persons.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-zinc-600">
                  No se encontraron resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {showModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
    <div className="bg-zinc-900 border border-zinc-700 w-full max-w-lg rounded-xl p-6 shadow-2xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Nueva Persona en Padrón</h2>
        <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white"><X /></button>
      </div>
      <form onSubmit={handleCreate} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-zinc-400 mb-1">CÉDULA</label>
            <input className="w-full bg-black border border-zinc-700 rounded p-3 text-white focus:border-white outline-none font-mono"
              value={formData.documentId} onChange={e => setFormData({...formData, documentId: e.target.value})} required />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-400 mb-1">INTENCIÓN</label>
            <select className="w-full bg-black border border-zinc-700 rounded p-3 text-white focus:border-white outline-none"
              value={formData.currentVoteIntent} onChange={e => setFormData({...formData, currentVoteIntent: e.target.value})}>
              <option value="SURE">VOTO SEGURO</option>
              <option value="PROBABLE">PROBABLE</option>
              <option value="UNDECIDED">INDECISO</option>
              <option value="OPPOSITION">OPOSICIÓN</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-zinc-400 mb-1">NOMBRES</label>
          <input className="w-full bg-black border border-zinc-700 rounded p-3 text-white focus:border-white outline-none"
            value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} required />
        </div>
        <div>
          <label className="block text-xs font-bold text-zinc-400 mb-1">APELLIDOS</label>
          <input className="w-full bg-black border border-zinc-700 rounded p-3 text-white focus:border-white outline-none"
            value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} required />
        </div>
        <div className="pt-4 flex gap-3">
          <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 font-bold text-zinc-400 hover:text-white">CANCELAR</button>
          <button type="submit" className="flex-1 bg-white text-black py-3 rounded font-black hover:bg-zinc-200">GUARDAR PERSONA</button>
        </div>
      </form>
    </div>
  </div>
)}
    </div>
  );
}
