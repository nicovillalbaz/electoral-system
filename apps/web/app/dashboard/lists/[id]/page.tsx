"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation"; // Para leer el ID de la URL
import { 
  ArrowLeft, Filter, Edit, MapPin, User, Trash2, Pen, Save, X 
} from "lucide-react";
import api from "../../../../lib/api";
import PersonModal from "../../persons/components/PersonModal"; 
import FilterModal from "../../persons/components/FilterModal"; 
import BulkUpdateModal from "../../persons/components/BulkUpdateModal"; 

export default function SmartListPage() {
  const params = useParams();
  const router = useRouter();
  const listId = params.id as string;

  // ESTADOS
  const [loading, setLoading] = useState(true);
  const [listData, setListData] = useState<any>(null); 
  const [members, setMembers] = useState<any[]>([]);
  
  // States Renaming
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState("");

  // Modales
  const [personToEdit, setPersonToEdit] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false); 
  const [showBulkModal, setShowBulkModal] = useState(false); 

  // Cargar datos iniciales
  useEffect(() => {
    fetchListMembers();
  }, [listId]);

  const fetchListMembers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/lists/${listId}/members`);
      const data = res.data;
      setListData({ ...data, filters: data.filtersApplied || data.filters });
      setMembers(data.members || []);
    } catch (error) {

       // router.push("/dashboard/lists"); 
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async () => {
      if (!newName.trim()) return;
      try {
          await api.patch(`/lists/${listId}`, { name: newName });
          setListData({...listData, listName: newName});
          setIsRenaming(false);
      } catch (e) {
          alert("Error al renombrar");
      }
  };

  const handleDeleteList = async () => {
      if (!confirm("¿Estás seguro de ELIMINAR esta lista para siempre?")) return;
      try {
          await api.delete(`/lists/${listId}`);
          router.push("/dashboard/lists"); // Volver al índice de listas (si existiera, sino a dashboard)
      } catch (e) {
          alert("Error al eliminar");
      }
  };

  // Helper para actualizar filtros
  const handleUpdateListFilters = async (newFilters: any) => {
    try {
        await api.patch(`/lists/${listId}`, { filters: newFilters });
        setShowFilters(false);
        fetchListMembers(); 
    } catch (e) {
        alert("Error actualizando la lista");
    }
  };

  const [availableAddresses, setAvailableAddresses] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  
  useEffect(() => {
      const fetchData = async () => {
        try {
            // 1. Ubicaciones
            const resAddr = await api.get('/persons/addresses');
            setAvailableAddresses(resAddr.data);

            // 2. Etiquetas
            const resTags = await api.get('/tags');
            setAvailableTags(resTags.data);
        } catch(e) {
            // silently ignore
        }
      };
      fetchData();
  }, []);

  return (
    <div className="p-6 h-full flex flex-col relative z-0">
      
      {/* CABECERA */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                <ArrowLeft size={20}/>
            </button>
            <div>
                {loading ? (
                    <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse"/>
                ) : (
                    <div className="flex items-center gap-3">
                         {isRenaming ? (
                             <div className="flex items-center gap-2">
                                 <input 
                                    className="bg-black border border-zinc-700 rounded px-2 py-1 text-xl font-bold text-white outline-none focus:border-blue-500"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    autoFocus
                                 />
                                 <button onClick={handleRename} className="p-1 bg-green-900/50 text-green-400 rounded hover:bg-green-900"><Save size={18}/></button>
                                 <button onClick={() => setIsRenaming(false)} className="p-1 bg-red-900/50 text-red-400 rounded hover:bg-red-900"><X size={18}/></button>
                             </div>
                         ) : (
                            <h1 className="text-2xl font-black text-white flex items-center gap-2 group relative">
                                {listData?.listName}
                                <span className="text-xs font-normal bg-blue-900/30 text-blue-400 px-2 py-1 rounded-full border border-blue-800">
                                    Lista Inteligente
                                </span>
                                <button onClick={() => { setIsRenaming(true); setNewName(listData?.listName); }} className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-white transition-opacity">
                                    <Pen size={14} />
                                </button>
                            </h1>
                         )}
                    </div>
                )}
                <p className="text-zinc-500 text-sm mt-1">
                    {loading ? "Cargando..." : `${listData?.total || 0} personas buscan este criterio`}
                </p>
            </div>
        </div>

        <div className="flex gap-2">
            <button 
                onClick={() => setShowFilters(true)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors text-sm font-bold"
            >
                <Filter size={16}/> Criterios
            </button>
            <button 
                onClick={() => setShowBulkModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-yellow-500 hover:text-yellow-400 hover:border-yellow-600 transition-colors text-sm font-bold"
                title="Edición Masiva"
            >
                <Edit size={16}/> Masivo
            </button>
            <div className="h-8 w-[1px] bg-zinc-800 mx-2"></div>
             <button 
                onClick={handleDeleteList}
                className="flex items-center gap-2 px-4 py-2 bg-red-950/20 border border-red-900/30 rounded-lg text-red-400 hover:bg-red-900/40 hover:text-red-200 transition-colors text-sm font-bold"
            >
                <Trash2 size={16}/> Eliminar Lista
            </button>
        </div>
      </div>

      {/* TABLA DE MIEMBROS */}
      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm relative z-0">
        <div className="overflow-x-auto h-full">
            <table className="w-full text-left text-sm text-zinc-400">
                <thead className="bg-black text-zinc-500 uppercase text-xs font-bold tracking-wider border-b border-zinc-800 sticky top-0 z-10">
                    <tr>
                        <th className="p-4">Cédula</th>
                        <th className="p-4">Nombre</th>
                        <th className="p-4">Ubicación</th>
                        <th className="p-4">Estado</th>
                        <th className="p-4">Transporte</th>
                        <th className="p-4 text-right">#</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                    {loading ? (
                        Array.from({length:5}).map((_,i) => (
                            <tr key={i}><td colSpan={6} className="p-4"><div className="h-6 bg-zinc-800/50 rounded w-full animate-pulse"/></td></tr>
                        ))
                    ) : members.length > 0 ? (
                        members.map(p => (
                            <tr key={p.id} className="hover:bg-zinc-800/40 transition-colors group">
                                <td className="p-4 font-mono text-white">{p.document_id}</td>
                                <td className="p-4 font-bold text-zinc-200">{p.last_name}, {p.first_name}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2" title={p.address}>
                                        <MapPin size={14} className="text-zinc-600"/>
                                        <span className="truncate max-w-[150px]">{p.address || "-"}</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    {/* STATUS BADGE */}
                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                                        p.campaign_status === 'VISITED' ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-900' :
                                        p.campaign_status === 'CONTACTED' ? 'bg-blue-900/50 text-blue-400 border border-blue-900' :
                                        p.campaign_status === 'TO_VISIT' ? 'bg-amber-900/50 text-amber-400 border border-amber-900' :
                                        'bg-zinc-800 text-zinc-500'
                                    }`}>
                                        {p.campaign_status === 'NOT_VISITED' ? 'SIN VISITAR' : (p.campaign_status || 'SIN VISITAR')}
                                    </span>
                                </td>
                                <td className="p-4">
                                     {p.needs_transport ? (
                                        <span className="text-xs flex items-center gap-1 text-purple-400 font-bold">
                                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"/>
                                            {p.transport_status || 'PENDIENTE'}
                                        </span>
                                     ) : <span className="text-zinc-700 text-xs">-</span>}
                                </td>
                                <td className="p-4 text-right">
                                    <button onClick={() => setPersonToEdit(p)} className="p-2 hover:bg-zinc-700 rounded-full text-zinc-400 hover:text-white transition-colors">
                                        <Edit size={16}/>
                                    </button>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={6} className="p-10 text-center text-zinc-500">
                                <div className="flex flex-col items-center gap-2">
                                    <User size={32} className="opacity-20"/>
                                    <p>Nadie cumple con estos criterios actualmente.</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* MODALES */}
      {/* 1. Editar Persona (Reutilizamos el modal blindado) */}
      <PersonModal
        isOpen={!!personToEdit}
        onClose={() => setPersonToEdit(null)}
        onSuccess={() => {
            setPersonToEdit(null);
            fetchListMembers(); // Recargamos la lista al guardar cambios
        }}
        personToEdit={personToEdit}
        availableAddresses={availableAddresses}
        availableTags={availableTags}
      />

      {/* 2. Editar Filtros de la Lista */}
      <FilterModal
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={handleUpdateListFilters}
        // Pasamos los valores actuales para que el modal se pre-llene
        initialValues={listData?.filtersApplied || listData?.filters}
        availableAddresses={availableAddresses}
        availableTags={availableTags}
      />

      {/* 3. Masivo */}
      <BulkUpdateModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onSuccess={() => { fetchListMembers(); alert("Actualización completada"); }}
        activeFilters={listData?.filtersApplied || listData?.filters || {}}
      />

    </div>
  );
}
