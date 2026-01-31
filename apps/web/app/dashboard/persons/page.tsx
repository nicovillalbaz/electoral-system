"use client";
import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import api from "../../../lib/api";
import { Search, Edit, Plus, MapPin, Hash, Flag } from "lucide-react"; // Iconos nuevos
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
      setSearch(formData.documentId); 
      loadPersons();
    } catch (error) { 
        alert('Error al crear. Verifique que la cédula no exista.'); 
    }
  };

  useEffect(() => {
    loadPersons();
  }, [query]);

  const loadPersons = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/persons?q=${query}&limit=50`);
      setPersons(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Función auxiliar para colorear partidos
  const getPartyColor = (party: string) => {
    if (!party) return "text-zinc-500";
    if (party.includes("ANR")) return "text-red-500 font-bold"; // Colorados
    if (party.includes("PLRA")) return "text-blue-500 font-bold"; // Liberales
    return "text-zinc-300"; // Otros
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-white">Padrón Electoral</h1>
            <p className="text-zinc-400 text-sm">Gestión maestra de votantes y datos demográficos.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-white text-black px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-zinc-200 transition-colors">
          <Plus size={16} /> Nueva Persona
        </button>
      </div>

      {/* BUSCADOR */}
      <div className="relative">
        <Search className="absolute left-4 top-3.5 text-zinc-500" size={20} />
        <input
          type="text"
          placeholder="Buscar por Cédula, Nombre o Apellido..."
          className="w-full bg-zinc-900 border border-zinc-800 text-white pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-white focus:outline-none placeholder:text-zinc-600"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* TABLA MEJORADA */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto"> {/* Para scroll horizontal si hace falta */}
            <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-black text-zinc-500 uppercase text-xs font-bold tracking-wider border-b border-zinc-800">
                <tr>
                <th className="p-4 w-24">Cédula</th>
                <th className="p-4">Nombre Completo</th>
                <th className="p-4 w-20 text-center">Orden</th>
                <th className="p-4">Dirección</th>
                <th className="p-4 w-24">Partido</th>
                <th className="p-4 w-32">Intención</th>
                <th className="p-4 w-24">Estado</th>
                <th className="p-4 w-16 text-right">#</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
                {loading ? (
                <tr>
                    <td colSpan={8} className="p-8 text-center animate-pulse text-zinc-500">
                    Cargando datos del padrón...
                    </td>
                </tr>
                ) : (
                persons.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-800/40 transition-colors group">
                    {/* Cédula */}
                    <td className="p-4 font-mono text-white font-medium">{p.document_id}</td>
                    
                    {/* Nombre */}
                    <td className="p-4 font-medium text-zinc-200">
                        {p.last_name}, {p.first_name}
                    </td>

                    {/* Orden (Nuevo) */}
                    <td className="p-4 text-center font-mono text-zinc-500">
                        {p.voting_order_number || "-"}
                    </td>

                    {/* Dirección (Nuevo) */}
                    <td className="p-4">
                        <div className="flex items-center gap-2 max-w-[200px]" title={p.address}>
                            <MapPin size={14} className="text-zinc-600 shrink-0" />
                            <span className="truncate text-xs">{p.address || "Sin dirección"}</span>
                        </div>
                    </td>

                    {/* Partido (Nuevo) */}
                    <td className="p-4">
                         <span className={`text-xs flex items-center gap-1 ${getPartyColor(p.party_affiliation)}`}>
                            {p.party_affiliation ? <Flag size={12} fill="currentColor" /> : null}
                            {p.party_affiliation || "-"}
                         </span>
                    </td>

                    {/* Intención */}
                    <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase border ${
                            p.current_vote_intent === "SURE" ? "bg-emerald-950 text-emerald-400 border-emerald-900" :
                            p.current_vote_intent === "OPPOSITION" ? "bg-red-950 text-red-400 border-red-900" :
                            p.current_vote_intent === "PROBABLE" ? "bg-yellow-950 text-yellow-400 border-yellow-900" :
                            "bg-zinc-800 text-zinc-400 border-zinc-700"
                        }`}>
                        {p.current_vote_intent === "SURE" ? "VOTO SEGURO" :
                         p.current_vote_intent === "OPPOSITION" ? "OPOSICIÓN" :
                         p.current_vote_intent === "PROBABLE" ? "PROBABLE" : "INDECISO"}
                        </span>
                    </td>

                    {/* Estado Voto */}
                    <td className="p-4">
                        {p.has_voted ? (
                        <span className="text-emerald-500 font-bold text-xs flex items-center gap-1">
                            ✅ YA VOTÓ
                        </span>
                        ) : (
                        <span className="text-zinc-600 text-xs">Pendiente</span>
                        )}
                    </td>

                    {/* Acciones */}
                    <td className="p-4 text-right">
                        <button className="text-zinc-500 hover:text-white p-2 rounded-full hover:bg-zinc-700 transition-all" title="Editar ficha">
                        <Edit size={16} />
                        </button>
                    </td>
                    </tr>
                ))
                )}
                {!loading && persons.length === 0 && (
                <tr>
                    <td colSpan={8} className="p-12 text-center text-zinc-600">
                    <div className="flex flex-col items-center gap-2">
                        <Search size={32} className="opacity-20" />
                        <p>No se encontraron votantes con esa búsqueda.</p>
                    </div>
                    </td>
                </tr>
                )}
            </tbody>
            </table>
        </div>
      </div>

      {/* MODAL DE CREACIÓN (Mantenemos el que tenías, luego lo mejoramos) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-700 w-full max-w-lg rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Nueva Persona en Padrón</h2>
                <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white transition-colors"><X /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1">CÉDULA</label>
                    <input className="w-full bg-black border border-zinc-700 rounded p-3 text-white focus:border-white outline-none font-mono transition-colors"
                    value={formData.documentId} onChange={e => setFormData({...formData, documentId: e.target.value})} required autoFocus />
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
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 font-bold text-zinc-400 hover:text-white transition-colors">CANCELAR</button>
                <button type="submit" className="flex-1 bg-white text-black py-3 rounded font-black hover:bg-zinc-200 transition-colors">GUARDAR PERSONA</button>
                </div>
            </form>
            </div>
        </div>
        )}
    </div>
  );
}