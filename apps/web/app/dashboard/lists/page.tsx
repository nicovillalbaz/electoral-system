"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, Search, List as ListIcon, MapPin, Calendar, CheckCircle, Trash2, ArrowRight 
} from "lucide-react";
import api from "../../../lib/api";
import FilterModal from "../persons/components/FilterModal";

export default function ListsIndexPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [lists, setLists] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Cargar listas al iniciar
  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    try {
      const res = await api.get("/lists"); // Asegúrate de que este endpoint devuelve las listas con su conteo si es posible
      setLists(res.data);
    } catch (e) {
      console.error("Error cargando listas", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = async (filters: any) => {
    try {
      // 1. Pedir nombre al usuario (simple prompt por ahora, o podrías mejorar el modal)
      const name = prompt("Nombre para tu nueva lista:", "Nueva Lista Inteligente");
      if (!name) return;

      // 2. Crear en backend
      await api.post("/lists", {
        name,
        filters, 
        icon: "list" // Icono por defecto
      });
      
      // 3. Recargar
      setShowCreateModal(false);
      fetchLists();
    } catch (e) {
      alert("Error al crear la lista");
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Evitar entrar a la lista al hacer click en borrar
    if (!confirm("¿Seguro que quieres borrar esta lista?")) return;
    
    try {
      await api.delete(`/lists/${id}`);
      fetchLists();
    } catch (e) {
      console.error(e);
    }
  };

  // Helper para iconos dinámicos
  const getIcon = (iconName: string) => {
    switch(iconName) {
      case 'map-pin': return <MapPin className="text-blue-500" size={24} />;
      case 'calendar': return <Calendar className="text-amber-500" size={24} />;
      case 'check-circle': return <CheckCircle className="text-emerald-500" size={24} />;
      default: return <ListIcon className="text-purple-500" size={24} />;
    }
  };

  return (
    <div className="p-8 h-full relative z-0">
      
      {/* CABECERA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white">Listas Inteligentes</h1>
          <p className="text-zinc-400 mt-1">Segmenta y organiza tu electorado estratégicamente.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-white text-black px-5 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-zinc-200 transition-colors shadow-lg hover:shadow-xl"
        >
          <Plus size={20} strokeWidth={3} /> CREAR LISTA
        </button>
      </div>

      {/* GRID DE LISTAS */}
      {loading ? (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="h-40 bg-zinc-900/50 rounded-2xl animate-pulse border border-zinc-800"/>)}
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lists.map((list) => (
            <div 
              key={list.id}
              onClick={() => router.push(`/dashboard/lists/${list.id}`)}
              className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 cursor-pointer hover:bg-zinc-900 hover:border-zinc-700 hover:scale-[1.01] transition-all group relative overflow-hidden"
            >
              {/* Decoración de fondo */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full -mr-10 -mt-10 pointer-events-none"/>

              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-black rounded-xl border border-zinc-800 shadow-sm">
                    {getIcon(list.icon)}
                </div>
                {!list.is_favorite && ( // No dejar borrar las del sistema si son favoritas
                    <button 
                        onClick={(e) => handleDelete(e, list.id)}
                        className="text-zinc-600 hover:text-red-500 p-2 transition-colors z-10"
                    >
                        <Trash2 size={18}/>
                    </button>
                )}
              </div>

              <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">
                {list.name}
              </h3>
              <p className="text-sm text-zinc-500 font-medium mb-6 line-clamp-2">
                {/* Aquí podrías poner una descripción basada en los filtros */}
                Filtros activos: {Object.keys(list.filters || {}).length}
              </p>

              <div className="flex items-center justify-between text-sm pt-4 border-t border-zinc-800/50">
                 <span className="text-zinc-400 font-mono">
                    {/* Si tu backend envía el count, úsalo aquí. Si no, pon "Ver detalles" */}
                    Ver Miembros
                 </span>
                 <ArrowRight size={16} className="text-zinc-600 group-hover:text-white -translate-x-2 group-hover:translate-x-0 transition-transform"/>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL PARA CREAR (Reutilizamos FilterModal) */}
      <FilterModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onApply={handleCreateList}
        availableAddresses={[]} // Deberían venir de props o contexto
        availableTags={[]}
      />
    </div>
  );
}