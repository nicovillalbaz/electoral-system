"use client";
import { useState } from "react";
import { X, MapPin, Target, CheckCircle, RotateCcw, Filter, Tag, User } from "lucide-react";

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: any) => void | Promise<void>; 
  availableAddresses: string[];
  availableTags: any[];
  availableUsers: any[];
  initialValues?: any;
  isSubmitting?: boolean;
}

export default function FilterModal({ isOpen, onClose, onApply, availableAddresses, availableTags, availableUsers, initialValues, isSubmitting = false }: FilterModalProps) {
  const [internalApplying, setInternalApplying] = useState(false);
  const applying = isSubmitting || internalApplying;
  
  const [filters, setFilters] = useState({
    address: initialValues?.address || "",          
    party: initialValues?.party || "TODOS",       
    voteIntent: initialValues?.voteIntent || "ALL",    
    tagId: initialValues?.tagId || "",            
    assignedUserId: initialValues?.assignedUserId || initialValues?.assigned_user_id || "",
    votedStatus: initialValues?.votedStatus || "ALL",
    campaignStatus: initialValues?.campaignStatus || initialValues?.campaign_status || "ALL",
    needsTransport: initialValues?.needsTransport || "ALL",
    transportStatus: initialValues?.transportStatus || "ALL",
    hasRequests: initialValues?.hasRequests || false,
    hasFinancialNeeds: initialValues?.hasFinancialNeeds || "ALL",
    financialNeedsFulfilled: initialValues?.financialNeedsFulfilled || "ALL"
  });

  const handleApply = async () => {
    if (applying) return;
    setInternalApplying(true);
    try {
      await Promise.resolve(onApply(filters));
      onClose();
    } catch (_error) {
      // The caller already handles error feedback.
    } finally {
      setInternalApplying(false);
    }
  };

  const handleReset = () => {
    setFilters({
      address: "",
      party: "TODOS",
      voteIntent: "ALL",
      tagId: "",
      assignedUserId: "",
      votedStatus: "ALL",
      campaignStatus: "ALL",
      needsTransport: "ALL",
      transportStatus: "ALL",
      hasRequests: false,
      hasFinancialNeeds: "ALL",
      financialNeedsFulfilled: "ALL"
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-zinc-950 border border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* CABECERA */}
            <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 rounded-t-2xl">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Filter size={20} className="text-zinc-400"/> Filtros de Campaña
                </h2>
                <button onClick={onClose} className="text-zinc-500 hover:text-white bg-zinc-900 p-2 rounded-full hover:bg-zinc-800 transition-colors disabled:opacity-50" disabled={applying}>
                    <X size={18} />
                </button>
            </div>

            {/* CUERPO SCROLLEABLE */}
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                
                {/* 1. UBICACIÓN */}
                <div className="space-y-3">
                    <h3 className="text-xs font-black text-blue-500 uppercase tracking-wider flex items-center gap-2">
                        <MapPin size={14}/> Zona (Barrio/Dirección)
                    </h3>
                    <div>
                        <label className="block text-[10px] font-bold text-zinc-500 mb-1">SELECCIONAR ZONA</label>
                        <select 
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-sm text-white focus:border-blue-500 outline-none"
                            value={filters.address}
                            onChange={(e) => setFilters({...filters, address: e.target.value})}
                        >
                            <option value="">Todas las zonas</option>
                            {availableAddresses.length > 0 ? (
                                availableAddresses.map((addr, i) => (
                                    <option key={i} value={addr}>{addr}</option>
                                ))
                            ) : (
                                <option value="" disabled>Cargando zonas...</option>
                            )}
                        </select>
                    </div>
                </div>

                <hr className="border-zinc-800" />

                {/* 2. TERMÓMETRO POLÍTICO */}
                <div className="space-y-3">
                    <h3 className="text-xs font-black text-purple-500 uppercase tracking-wider flex items-center gap-2">
                        <Target size={14}/> Termómetro Político
                    </h3>
                    
                        <div>
                            <label className="block text-[10px] font-bold text-zinc-500 mb-2">INTENCIÓN DE VOTO</label>
                            <select 
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-sm text-white focus:border-purple-500 outline-none"
                                value={filters.voteIntent}
                                onChange={(e) => setFilters({...filters, voteIntent: e.target.value})}
                            >
                                <option value="ALL">Mostrar Todos</option>
                                <option value="SURE">🟢 Voto Seguro</option>
                                <option value="PROBABLE">🟡 Probable</option>
                                <option value="UNDECIDED">⚪ Indeciso</option>
                                <option value="OPPOSITION_INTERNAL">🔴 Oposición (Interna)</option>
                                <option value="OPPOSITION_PARTY">🔴 Oposición (Otro Partido)</option>
                                <option value="WONT_VOTE">⛔ No Vota</option>
                            </select>
                        </div>

                    <div>
                        <label className="block text-[10px] font-bold text-zinc-500 mb-2">AFILIACIÓN</label>
                        <div className="flex gap-2">
                            {['TODOS', 'ANR', 'PLRA', 'OTRO', 'INDEPENDIENTE', 'SIN_AFILIACION'].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setFilters({...filters, party: p})}
                                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all border ${
                                        filters.party === p 
                                        ? p === 'ANR' ? 'bg-red-950 text-red-400 border-red-900'
                                        : p === 'PLRA' ? 'bg-blue-950 text-blue-400 border-blue-900'
                                        : 'bg-zinc-800 text-white border-zinc-600'
                                        : 'bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-600'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <hr className="border-zinc-800" />

                {/* 3. OPERATIVO */}
                <div className="space-y-3">
                    <h3 className="text-xs font-black text-emerald-500 uppercase tracking-wider flex items-center gap-2">
                        <CheckCircle size={14}/> Estado Operativo
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-zinc-500 mb-1">CONTROL DE VOTO</label>
                            <select 
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm text-white focus:border-emerald-500 outline-none"
                                value={filters.votedStatus}
                                onChange={(e) => setFilters({...filters, votedStatus: e.target.value})}
                            >
                                <option value="ALL">Todos</option>
                                <option value="VOTED">✅ Ya Votó</option>
                                <option value="PENDING">⏳ Pendiente</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-zinc-500 mb-1">BITÁCORA / VISITAS</label>
                            <select 
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm text-white focus:border-emerald-500 outline-none"
                                value={filters.campaignStatus}
                                onChange={(e) => setFilters({...filters, campaignStatus: e.target.value})}
                            >
                                <option value="ALL">Todas las situaciones</option>
                                <option value="NOT_VISITED">❌ No Visitado</option>
                                <option value="TO_VISIT">📅 Por Visitar</option>
                                <option value="CONTACTED">📞 Contactado</option>
                                <option value="VISITED">✅ Visitado</option>
                                <option value="VISITED_PC">🟢 Pasó por PC</option>
                                <option value="DO_NOT_DISTURB">⛔ No Molestar</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-zinc-500 mb-1">PUNTERO / RESPONSABLE</label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 text-zinc-600" size={14} />
                            <select
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-9 p-2.5 text-sm text-white focus:border-emerald-500 outline-none appearance-none"
                                value={filters.assignedUserId}
                                onChange={(e) => setFilters({ ...filters, assignedUserId: e.target.value })}
                            >
                                <option value="">Todos los responsables</option>
                                <option value="__UNASSIGNED__">Sin responsable asignado</option>
                                {availableUsers.length > 0 ? (
                                    availableUsers.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.full_name || user.name || user.email || user.id}
                                        </option>
                                    ))
                                ) : (
                                    <option value="" disabled>Sin usuarios disponibles</option>
                                )}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-zinc-500 mb-1">NECESITA TRANSPORTE</label>
                            <select
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm text-white focus:border-emerald-500 outline-none"
                                value={filters.needsTransport}
                                onChange={(e) =>
                                    setFilters({
                                        ...filters,
                                        needsTransport: e.target.value,
                                        transportStatus: e.target.value === "true" ? filters.transportStatus : "ALL",
                                    })
                                }
                            >
                                <option value="ALL">Todos</option>
                                <option value="true">Sí</option>
                                <option value="false">No</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-zinc-500 mb-1">ESTADO TRANSPORTE</label>
                            <select
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm text-white focus:border-emerald-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                value={filters.transportStatus}
                                onChange={(e) => setFilters({ ...filters, transportStatus: e.target.value })}
                                disabled={filters.needsTransport !== "true"}
                            >
                                <option value="ALL">Todos</option>
                                <option value="PENDING">Pendiente</option>
                                <option value="ASSIGNED">Asignado</option>
                                <option value="COMPLETED">Completado</option>
                            </select>
                        </div>
                    </div>

                    {/* ETIQUETAS */}
                    <div>
                        <label className="block text-[10px] font-bold text-zinc-500 mb-1">ETIQUETAS</label>
                        <div className="relative">
                            <Tag className="absolute left-3 top-2.5 text-zinc-600" size={14} />
                            <select
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-9 p-2.5 text-sm text-white focus:border-emerald-500 outline-none appearance-none"
                                value={filters.tagId}
                                onChange={(e) => setFilters({...filters, tagId: e.target.value})}
                            >
                                <option value="">Todas las etiquetas</option>
                                {availableTags.length > 0 ? (
                                    availableTags.map((tag) => (
                                        <option key={tag.id} value={tag.id}>
                                            {tag.name}
                                        </option>
                                    ))
                                ) : (
                                    <option value="" disabled>Sin etiquetas creadas</option>
                                )}
                            </select>
                        </div>
                    </div>
                </div>

                <hr className="border-zinc-800" />

                {/* 4. PEDIDOS Y FINANZAS */}
                <div className="space-y-3">
                    <h3 className="text-xs font-black text-amber-500 uppercase tracking-wider flex items-center gap-2">
                        📋 Pedidos y Finanzas
                    </h3>
                    
                    <label className="flex items-center gap-3 text-sm text-zinc-300 cursor-pointer hover:bg-zinc-900/50 p-2 rounded-lg transition-colors">
                        <input
                            type="checkbox"
                            checked={filters.hasRequests === true || filters.hasRequests === 'true'}
                            onChange={(e) => setFilters({...filters, hasRequests: e.target.checked})}
                            className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500"
                        />
                        Solo con pedidos registrados
                    </label>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-zinc-500 mb-1">SOLICITUD FINANCIERA</label>
                            <select
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm text-white focus:border-amber-500 outline-none"
                                value={filters.hasFinancialNeeds}
                                onChange={(e) => setFilters({...filters, hasFinancialNeeds: e.target.value})}
                            >
                                <option value="ALL">Todos</option>
                                <option value="true">💰 Solicitó Aporte</option>
                                <option value="false">Sin Solicitud</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-zinc-500 mb-1">AYUDA ENTREGADA</label>
                            <select
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm text-white focus:border-amber-500 outline-none"
                                value={filters.financialNeedsFulfilled}
                                onChange={(e) => setFilters({...filters, financialNeedsFulfilled: e.target.value})}
                            >
                                <option value="ALL">Todos</option>
                                <option value="true">✅ Entregado</option>
                                <option value="false">⏳ Pendiente</option>
                            </select>
                        </div>
                    </div>
                </div>

            </div>

            {/* FOOTER */}
            <div className="p-5 border-t border-zinc-800 bg-zinc-900/50 rounded-b-2xl flex gap-3">
                <button 
                    onClick={handleReset}
                    className="px-4 py-2 rounded-lg font-bold text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-2 disabled:opacity-50"
                    disabled={applying}
                >
                    <RotateCcw size={14}/> Limpiar
                </button>
                <button 
                    onClick={handleApply} 
                    className="flex-1 bg-white text-black py-2 rounded-lg font-black hover:bg-zinc-200 transition-colors text-sm disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={applying}
                >
                    {applying ? "APLICANDO..." : "APLICAR FILTROS"}
                </button>
            </div>
        </div>
    </div>
  );
}
