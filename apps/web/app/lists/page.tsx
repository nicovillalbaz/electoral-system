"use client";
import { useState, useEffect } from "react";
import { Plus, List, Trash2, Star, Filter, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
// Importamos el Modal de Filtros que YA HICIMOS (reutilización total)
import FilterModal from "../dashboard/persons/components/FilterModal";

export default function ListsPage() {
  const router = useRouter();
  const [lists, setLists] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Datos maestros para el modal de filtros
  const [availableAddresses, setAvailableAddresses] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);

  // Estados para crear lista nueva
  const [pendingFilters, setPendingFilters] = useState<any>(null); // Filtros seleccionados temporalmente
  const [newListName, setNewListName] = useState("");

  useEffect(() => {
    loadLists();
    loadMasterData();
  }, []);

  const loadLists = async () => {
      try { const res = await api.get("/lists"); setLists(res.data); } 
      catch (e) { console.error(e); }
  };

  const loadMasterData = async () => {
      // Cargar direcciones y etiquetas para pasárselas al FilterModal
      try {
          const [addrRes, tagsRes] = await Promise.all([
              api.get("/persons/addresses"),
              api.get("/tags")
          ]);
          setAvailableAddresses(addrRes.data);
          setAvailableTags(tagsRes.data);
      } catch (e) { console.error(e); }
  };

  // PASO 1: Abrir modal de filtros
  const startCreation = () => {
      setShowCreateModal(true);
  };

  // PASO 2: Recibir filtros y pedir nombre
  const handleFiltersSelected = (filters: any) => {
      setPendingFilters(filters);
      // Aquí podríamos mostrar un segundo modal pequeño para pedir el nombre,
      // o usar el estado para cambiar la UI. Para simplificar, hagamos un prompt simple o UI condicional.
      // (Ver implementación abajo en el render)
  };

  const saveList = async () => {
      if (!newListName.trim()) return alert("Ponle un nombre a la lista");
      try {
          await api.post("/lists", {
              name: newListName,
              filters: pendingFilters,
              icon: "users" 
          });
          setPendingFilters(null);
          setNewListName("");
          loadLists();
      } catch (e) { alert("Error al guardar"); }
  };

  const goToList = (list: any) => {
      // Navegamos a la tabla de personas PERO inyectando los filtros en la URL
      const params = new URLSearchParams(list.filters);
      router.push(`/dashboard/persons?${params.toString()}&listName=${list.name}`);
  };

  const deleteList = async (e: any, id: string) => {
      e.stopPropagation();
      if(!confirm("¿Borrar lista?")) return;
      await api.delete(`/lists/${id}`);
      loadLists();
  };

  return (
    <div className="p-8">
        <div className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Listas Inteligentes</h1>
                <p className="text-zinc-400 mt-1">Segmentos dinámicos de tu padrón electoral.</p>
            </div>
            <button 
                onClick={startCreation}
                className="bg-white text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-zinc-200 transition-colors"
            >
                <Plus size={18}/> NUEVA LISTA
            </button>
        </div>

        {/* UI DE CREACIÓN (Aparece si seleccionaste filtros pero no has guardado) */}
        {pendingFilters && (
            <div className="mb-8 bg-zinc-900 border border-blue-900/50 p-6 rounded-xl animate-in fade-in slide-in-from-top-4">
                <h3 className="text-blue-400 font-bold text-sm mb-4 flex items-center gap-2">
                    <Filter size={14}/> CONFIGURACIÓN DE NUEVA LISTA
                </h3>
                <div className="flex gap-4">
                    <input 
                        className="flex-1 bg-black border border-zinc-700 rounded-lg p-3 text-white outline-none focus:border-blue-500"
                        placeholder="Nombre de la lista (Ej: Voto Duro Centro)"
                        value={newListName}
                        onChange={e => setNewListName(e.target.value)}
                        autoFocus
                    />
                    <button onClick={saveList} className="bg-blue-600 text-white px-6 rounded-lg font-bold hover:bg-blue-500">
                        GUARDAR LISTA
                    </button>
                    <button onClick={() => setPendingFilters(null)} className="text-zinc-500 font-bold hover:text-white px-4">
                        CANCELAR
                    </button>
                </div>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                    {/* Previsualización de filtros seleccionados */}
                    {Object.entries(pendingFilters).map(([key, val]) => val && val !== 'ALL' && val !== 'TODOS' && (
                        <span key={key} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded border border-zinc-700">
                            {key}: <b>{String(val)}</b>
                        </span>
                    ))}
                </div>
            </div>
        )}

        {/* GRID DE LISTAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lists.map(list => (
                <div 
                    key={list.id} 
                    onClick={() => goToList(list)}
                    className="group bg-zinc-950 border border-zinc-800 hover:border-zinc-600 p-5 rounded-xl cursor-pointer transition-all hover:bg-zinc-900 relative"
                >
                    <div className="flex justify-between items-start mb-3">
                        <div className="bg-zinc-900 p-2 rounded-lg text-zinc-400 group-hover:text-white group-hover:bg-zinc-800 transition-colors">
                            <List size={20}/>
                        </div>
                        <button onClick={(e) => deleteList(e, list.id)} className="text-zinc-600 hover:text-red-500 transition-colors p-1">
                            <Trash2 size={16}/>
                        </button>
                    </div>
                    
                    <h3 className="font-bold text-white text-lg mb-1">{list.name}</h3>
                    <p className="text-xs text-zinc-500 mb-4 truncate">
                        {list.description || "Lista personalizada dinámica"}
                    </p>

                    <div className="flex flex-wrap gap-1 mb-4 h-6 overflow-hidden">
                        {Object.entries(list.filters).slice(0,3).map(([key, val]) => val && val !== 'ALL' && val !== 'TODOS' && (
                            <span key={key} className="text-[10px] bg-zinc-900 text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-800">
                                {String(val)}
                            </span>
                        ))}
                        {Object.keys(list.filters).length > 3 && <span className="text-[10px] text-zinc-600 px-1">...</span>}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold text-blue-500 group-hover:translate-x-1 transition-transform">
                        VER PADRÓN <ArrowRight size={12}/>
                    </div>
                </div>
            ))}
            
            {/* CARD PARA AGREGAR (Placeholder visual) */}
            <button onClick={startCreation} className="border border-dashed border-zinc-800 rounded-xl p-5 flex flex-col items-center justify-center text-zinc-600 hover:text-white hover:border-zinc-600 hover:bg-zinc-900/50 transition-all min-h-[180px]">
                <Plus size={30} className="mb-2 opacity-50"/>
                <span className="font-bold text-sm">CREAR NUEVA LISTA</span>
            </button>
        </div>

        {/* MODAL DE FILTROS REUTILIZADO (Para crear la configuración) */}
        <FilterModal 
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onApply={(filters) => {
                setShowCreateModal(false);
                handleFiltersSelected(filters);
            }}
            availableAddresses={availableAddresses}
            availableTags={availableTags}
        />
    </div>
  );
}