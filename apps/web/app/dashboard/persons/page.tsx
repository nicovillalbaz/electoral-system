"use client";
import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import api from "../../../lib/api";
import { 
  Search, Edit, Plus, MapPin, Flag, Phone,
  ArrowUp, ArrowDown, Eye, SlidersHorizontal, 
  ChevronLeft, ChevronRight 
} from "lucide-react";
import { useSearchParams } from 'next/navigation'; // Importa esto
// AQUÍ ESTÁ LA MAGIA: Importamos los componentes que acabas de crear
import PersonModal from "./components/PersonModal";
import FilterModal from "./components/FilterModal";

export default function PersonsPage() {
  const searchParams = useSearchParams();
  useEffect(() => {
    // Si la URL trae filtros (ej: vinimos de una Lista Inteligente)
    const filtersFromUrl: any = {};
    searchParams.forEach((value, key) => {
        if (key !== 'page' && key !== 'limit' && key !== 'q' && key !== 'listName') {
            filtersFromUrl[key] = value;
        }
    });

    if (Object.keys(filtersFromUrl).length > 0) {
        setActiveFilters(filtersFromUrl);
    }
}, [searchParams]);
  // --- ESTADOS DE DATOS ---
  const [search, setSearch] = useState("");
  const [query] = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 50;
  const [persons, setPersons] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState({ field: "last_name", dir: "ASC" });
  const [availableAddresses, setAvailableAddresses] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [activeFilters, setActiveFilters] = useState<any>({});
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        // 1. Cargar Direcciones
        const resAddr = await api.get("/persons/addresses");
        setAvailableAddresses(resAddr.data);

        // 2. Cargar Etiquetas Reales
        const resTags = await api.get("/tags");
        setAvailableTags(resTags.data);
      } catch (e) {
        console.error("Error cargando datos maestros", e);
      }
    };
    fetchMasterData();
  }, []);
  // --- ESTADOS DE VISTA ---
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [columns, setColumns] = useState({
    document: true, name: true, order: true, address: false,   
    party: true, intent: true, status: true, actions: true
  });

  // --- ESTADOS DE MODALES ---
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [personToEdit, setPersonToEdit] = useState<any>(null);

  // --- CARGA DE DATOS ---
  useEffect(() => {
    loadPersons();
  }, [query, sorting, page, activeFilters]); // <--- AÑADIDO activeFilters
  

  const loadPersons = async () => {
    setLoading(true);
    try {
      // 1. Construimos los parámetros base + filtros activos
      const params = new URLSearchParams({
        q: query,
        page: page.toString(),
        limit: limit.toString(),
        sortBy: sorting.field,
        sortDir: sorting.dir,
        ...activeFilters // <--- AQUÍ SE INYECTAN LOS FILTROS DEL MODAL
      });

      // 2. Limpieza: Eliminamos parámetros vacíos o por defecto para no ensuciar la URL
      // (Ej: si votedStatus es "ALL", no lo enviamos al backend)
      for (const [key, value] of Array.from(params.entries())) {
        if (!value || value === "ALL" || value === "TODOS") {
          params.delete(key);
        }
      }

      // 3. Petición limpia al Backend
      const res = await api.get(`/persons?${params.toString()}`);

      if (res.data.data) {
          setPersons(res.data.data);
          setTotalRecords(res.data.total);
      } else {
          setPersons(Array.isArray(res.data) ? res.data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // --- MANEJADORES ---
  const handleSort = (field: string) => {
    setSorting((prev) => ({
      field,
      dir: prev.field === field && prev.dir === "ASC" ? "DESC" : "ASC",
    }));
    setPage(1); 
  };

  const openCreate = () => {
    setPersonToEdit(null); // Limpiamos para crear
    setShowPersonModal(true);
  };

  const openEdit = (person: any) => {
    setPersonToEdit(person); // Pasamos los datos para editar
    setShowPersonModal(true);
  };

  // --- RENDERIZADO AUXILIAR ---
  const SortIcon = ({ field }: { field: string }) => {
    if (sorting.field !== field) return <div className="w-4" />;
    return sorting.dir === "ASC" ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const getPartyColor = (party: string) => {
    if (!party) return "text-zinc-500";
    if (party.includes("ANR")) return "text-red-500 font-bold";
    if (party.includes("PLRA")) return "text-blue-500 font-bold";
    return "text-zinc-300";
  };

  const totalPages = Math.ceil(totalRecords / limit);

  return (
    <div className="space-y-6 pb-20">
      {/* CABECERA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-white">Padrón Electoral</h1>
            <p className="text-zinc-400 text-sm">
                {totalRecords > 0 ? `${totalRecords} votantes registrados` : "Gestión maestra"}
            </p>
        </div>
        <div className="flex gap-2">
            {/* Botón Columnas */}
            <div className="relative">
                <button 
                    onClick={() => setShowColumnMenu(!showColumnMenu)}
                    className={`px-3 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors border ${showColumnMenu ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-transparent border-zinc-700 text-zinc-400 hover:text-white'}`}
                >
                    <Eye size={16} /> Vistas
                </button>
                {showColumnMenu && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowColumnMenu(false)}></div>
                        <div className="absolute right-0 top-12 bg-zinc-900 border border-zinc-700 p-3 rounded-xl shadow-xl z-20 w-48 space-y-2">
                            <p className="text-xs font-bold text-zinc-500 uppercase mb-2">Mostrar Columnas</p>
                            {Object.keys(columns).map((col) => (
                                <label key={col} className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer hover:bg-zinc-800 p-1 rounded">
                                    <input 
                                        type="checkbox" 
                                        checked={columns[col as keyof typeof columns]} 
                                        onChange={() => setColumns({...columns, [col]: !columns[col as keyof typeof columns]})}
                                        className="rounded bg-black border-zinc-600 text-white focus:ring-0"
                                    />
                                    <span className="capitalize">{col}</span>
                                </label>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <button onClick={openCreate} className="bg-white text-black px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-zinc-200 transition-colors">
                <Plus size={16} /> Nueva Persona
            </button>
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="flex gap-3">
        <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 text-zinc-500" size={20} />
            <input
            type="text"
            placeholder="Buscar por Cédula, Nombre, Apellido..."
            className="w-full bg-zinc-900 border border-zinc-800 text-white pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-white focus:outline-none"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
        </div>
        <button onClick={() => setShowFilterModal(true)} className="bg-zinc-900 border border-zinc-800 text-zinc-400 px-4 rounded-xl hover:text-white hover:border-zinc-600 transition-colors flex items-center gap-2">
            <SlidersHorizontal size={20} /> <span className="hidden md:inline">Filtros</span>
        </button>
      </div>

      {/* TABLA */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm relative min-h-[400px]">
        <div className="overflow-x-auto pb-4">
            <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-black text-zinc-500 uppercase text-xs font-bold tracking-wider border-b border-zinc-800">
                <tr>
                    {columns.document && <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort("document_id")}>Cédula <SortIcon field="document_id"/></th>}
                    {columns.name && <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort("last_name")}>Nombre <SortIcon field="last_name"/></th>}
                    {columns.order && <th className="p-4 text-center cursor-pointer hover:text-white" onClick={() => handleSort("voting_order_number")}>Orden <SortIcon field="voting_order_number"/></th>}
                    {columns.address && <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort("address")}>Dirección <SortIcon field="address"/></th>}
                    {columns.party && <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort("party_affiliation")}>Partido <SortIcon field="party_affiliation"/></th>}
                    {columns.intent && <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort("current_vote_intent")}>Intención <SortIcon field="current_vote_intent"/></th>}
                    {columns.status && <th className="p-4">Estado</th>}
                    {columns.actions && <th className="p-4 text-right">#</th>}
                </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
                {loading ? Array.from({length:5}).map((_,i)=><tr key={i} className="animate-pulse"><td colSpan={8} className="p-4"><div className="h-8 bg-zinc-800/50 rounded"></div></td></tr>) : 
                persons.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-800/40 transition-colors group">
                        {columns.document && <td className="p-4 font-mono text-white">{p.document_id}</td>}
                        {columns.name && <td className="p-4 font-medium text-zinc-200">{p.last_name}, {p.first_name}</td>}
                        {columns.order && <td className="p-4 text-center font-mono text-zinc-500 bg-black/20">{p.voting_order_number || "-"}</td>}
                        {columns.address && <td className="p-4"><div className="flex items-center gap-2 max-w-[200px]" title={p.address}><MapPin size={14} className="text-zinc-600 shrink-0"/><span className="truncate text-xs">{p.address || "-"}</span></div></td>}
                        {columns.party && <td className="p-4"><span className={`text-xs flex items-center gap-1 ${getPartyColor(p.party_affiliation)}`}>{p.party_affiliation ? <Flag size={12} fill="currentColor"/> : null} {p.party_affiliation || "-"}</span></td>}
                        {columns.intent && <td className="p-4"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.current_vote_intent === 'SURE' ? 'bg-emerald-900 text-emerald-300' : 'bg-zinc-800'}`}>{p.current_vote_intent}</span></td>}
                        {columns.status && <td className="p-4">{p.has_voted ? <span className="text-emerald-500 font-bold text-xs">✅ VOTÓ</span> : <span className="text-zinc-600 text-xs">Pendiente</span>}</td>}
                        {columns.actions && <td className="p-4 text-right"><button onClick={() => openEdit(p)} className="text-zinc-500 hover:text-white p-2 bg-zinc-800 rounded-full hover:bg-zinc-700"><Edit size={16} /></button></td>}
                    </tr>
                ))}
            </tbody>
            </table>
        </div>
        {/* FOOTER PAGINACIÓN */}
        <div className="border-t border-zinc-800 bg-black/50 p-4 flex items-center justify-between">
            <span className="text-xs text-zinc-500">Página <span className="text-white font-bold">{page}</span> de <span className="text-white font-bold">{totalPages || 1}</span></span>
            <div className="flex gap-2">
                <button disabled={page === 1 || loading} onClick={() => setPage(p => p - 1)} className="p-2 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"><ChevronLeft size={16}/></button>
                <button disabled={page >= totalPages || loading} onClick={() => setPage(p => p + 1)} className="p-2 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"><ChevronRight size={16}/></button>
            </div>
        </div>
      </div>

      {/* --- MODALES --- */}
      <PersonModal 
        isOpen={showPersonModal} 
        onClose={() => setShowPersonModal(false)} 
        onSuccess={loadPersons} 
        personToEdit={personToEdit} 
        availableAddresses={availableAddresses} // <--- ¡CONECTADO!
      />
      
      return (
    
      <FilterModal 
        isOpen={showFilterModal} 
        onClose={() => setShowFilterModal(false)}
        onApply={(filters) => { 
            setActiveFilters(filters); // <--- ESTO DISPARA EL RECARGAR
            setPage(1); // Volver a pag 1 al filtrar
        }}
        availableAddresses={availableAddresses} 
        availableTags={availableTags}
      />
    
  )

    </div>
  );
}