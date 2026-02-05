"use client";
import { useState, useEffect, useRef } from "react"; // <--- Agregamos useRef
import {
  X,
  Save,
  User,
  Plus,
  MapPin,
  Phone,
  History,
  Tag,
  Trash2,
  Clock,
  Car,
} from "lucide-react";
import api from "../../../../lib/api";

interface PersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  personToEdit?: any;
  availableAddresses?: string[];
  availableTags?: any[];
}

export default function PersonModal({
  isOpen,
  onClose,
  onSuccess,
  personToEdit,
  availableAddresses = [],
  availableTags = [],
}: PersonModalProps) {
  const isEditing = !!personToEdit;
  const [activeTab, setActiveTab] = useState<"details" | "history">("details");

  // STATES
  const [localTags, setLocalTags] = useState<any[]>(availableTags);
  const [newTagInput, setNewTagInput] = useState("");
  const [assignedTags, setAssignedTags] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [stations, setStations] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    documentId: "", // CREATE ONLY
    firstName: "",  // CREATE ONLY
    lastName: "",   // CREATE ONLY
    phoneNumber: "",
    whatsappNumber: "", 
    address: "", // "Barrio"
    exactAddress: "", 
    assignedStationId: "",
    currentVoteIntent: "UNDECIDED",
    campaignStatus: "NOT_VISITED",
    notes: "",
    needsTransport: false,
    transportStatus: "PENDING",
    // New Fields
    requests: [] as string[],
    hasFinancialNeeds: false,
    financialNeedsFulfilled: false,
    financialAmount: 0
  });

  // Load Reference Data
  useEffect(() => {
    if (isOpen) { 
        loadStations(); 
        if (personToEdit) {
            setFormData({
                documentId: personToEdit.document_id,
                firstName: personToEdit.first_name,
                lastName: personToEdit.last_name,
                phoneNumber: personToEdit.phone_number || "",
                whatsappNumber: personToEdit.whatsapp_number || "",
                address: personToEdit.address || "",
                exactAddress: personToEdit.exact_address || "",
                assignedStationId: personToEdit.assigned_station_id || "",
                currentVoteIntent: personToEdit.current_vote_intent || "UNDECIDED",
                campaignStatus: personToEdit.campaign_status || "NOT_VISITED",
                notes: personToEdit.notes || "",
                needsTransport: personToEdit.needs_transport || false,
                transportStatus: personToEdit.transport_status || "PENDING",
                
                // Mapeo nuevos campos
                requests: personToEdit.requests || [],
                hasFinancialNeeds: personToEdit.has_financial_needs || false,
                financialNeedsFulfilled: personToEdit.financial_needs_fulfilled || false,
                financialAmount: personToEdit.financial_amount ? Number(personToEdit.financial_amount) : 0
            });
            fetchTags(personToEdit.id);
            fetchHistory(personToEdit.id);
        } else {
            // RESET FORM FOR NEW
             setFormData({
                documentId: "", firstName: "", lastName: "",
                phoneNumber: "", whatsappNumber: "", address: "", exactAddress: "",
                assignedStationId: "", currentVoteIntent: "UNDECIDED", campaignStatus: "NOT_VISITED",
                notes: "", needsTransport: false, transportStatus: "PENDING",
                requests: [], hasFinancialNeeds: false, financialNeedsFulfilled: false, financialAmount: 0
            });
            setAssignedTags([]);
            setHistory([]);
        }
    }
  }, [isOpen, personToEdit]);

  const loadStations = async () => {
      try { const res = await api.get('/stations'); setStations(res.data); } catch(e){}
  };

  const fetchTags = async (pid: string) => {
      try { const res = await api.get(`/tags/person/${pid}`); setAssignedTags(res.data); } catch(e){}
  };
  
  const fetchHistory = async (pid: string) => {
      setLoadingHistory(true);
      try { const res = await api.get(`/events?personId=${pid}&limit=50`); setHistory(res.data); } catch(e){} finally { setLoadingHistory(false); }
  };

  // --- HANDLERS ---
  const handleAssignTag = async (tagId: string) => {
    if (!tagId || !personToEdit) return;
    try {
      await api.post("/tags/assign", { personId: personToEdit.id, tagId });
      fetchTags(personToEdit.id);
      setTimeout(() => fetchHistory(personToEdit.id), 500);
    } catch (e) {
      alert("Error al asignar");
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!personToEdit) return;
    try {
      await api.post("/tags/remove", { personId: personToEdit.id, tagId });
      fetchTags(personToEdit.id);
    } catch (e) {
      alert("Error al quitar");
    }
  };

  const handleCreateTag = async () => {
    if (!newTagInput.trim()) return;
    try {
      const res = await api.post("/tags", {
        name: newTagInput.trim(),
        color: "#3b82f6",
      });
      const newTag = res.data;
      setLocalTags((prev) => [...prev, newTag]);
      if (personToEdit) handleAssignTag(newTag.id);
      setNewTagInput("");
    } catch (e) {
      alert("Error al crear etiqueta");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing) await api.patch(`/persons/${personToEdit.id}`, formData);
      else await api.post("/persons", formData);
      
      onSuccess();
      onClose();
    } catch (error) {
      alert("Error al guardar.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/50">
           <div>
             <h2 className="text-xl font-bold text-white">{isEditing ? "Editar Persona" : "Nueva Persona"}</h2>
             {isEditing && <p className="text-zinc-500 text-sm">CI: {personToEdit.document_id}</p>}
           </div>
           <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400"><X size={20}/></button>
        </div>

        {/* CONTENT */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
           {isEditing && (
             <div className="flex gap-4 border-b border-zinc-800 mb-4">
               <button onClick={() => setActiveTab("details")} className={`pb-2 border-b-2 font-bold text-sm ${activeTab === "details" ? "border-white text-white" : "border-transparent text-zinc-500"}`}>FICHA TÉCNICA</button>
               <button onClick={() => setActiveTab("history")} className={`pb-2 border-b-2 font-bold text-sm ${activeTab === "history" ? "border-white text-white" : "border-transparent text-zinc-500"}`}>HISTORIAL</button>
             </div>
           )}

           {activeTab === "details" ? (
             <form id="person-form" onSubmit={handleSave} className="space-y-6">
                
                {/* NEW PERSON FIELDS */}
                {!isEditing && (
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 mb-1">CÉDULA DE IDENTIDAD</label>
                            <input className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white outline-none focus:border-blue-500" value={formData.documentId} onChange={e => setFormData({...formData, documentId: e.target.value})} required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 mb-1">NOMBRES</label>
                            <input className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white outline-none focus:border-blue-500" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 mb-1">APELLIDOS</label>
                            <input className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white outline-none focus:border-blue-500" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} required />
                        </div>
                    </div>
                )}

                {/* ETIQUETAS RESTAURADAS */}
                {isEditing && (
                    <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 mb-4">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-xs font-black text-zinc-400 uppercase flex items-center gap-2"><Tag size={12} /> Etiquetas</h3>
                            <div className="flex gap-2">
                            <select className="bg-black border border-zinc-700 text-xs text-white rounded px-2 outline-none" onChange={(e) => { handleAssignTag(e.target.value); e.target.value = ""; }}>
                                <option value="">+ Asignar</option>
                                {localTags.map(tag => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
                            </select>
                            <div className="flex items-center gap-1">
                                <input className="bg-black border border-zinc-700 text-xs text-white rounded px-2 py-1 w-24 outline-none" placeholder="Nueva..." value={newTagInput} onChange={(e) => setNewTagInput(e.target.value)} />
                                <button type="button" onClick={handleCreateTag} className="bg-blue-600 text-white p-1 rounded"><Plus size={12} /></button>
                            </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {assignedTags.map(tag => (
                                <span key={tag.id} className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-300 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color || "#fff" }}></div>
                                    {tag.name}
                                    <button type="button" onClick={() => handleRemoveTag(tag.id)} className="hover:text-red-500"><X size={12}/></button>
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* CONTACT INFO */}
                <div className="space-y-4 pt-4 border-t border-zinc-900">
                    <h3 className="text-xs font-black text-zinc-500 uppercase">INFORMACIÓN DE CONTACTO</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 mb-1">CELULAR</label>
                            <input className="w-full bg-zinc-900 border border-zinc-800 rounded p-2.5 text-white outline-none focus:border-emerald-500" value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} placeholder="09xx..." />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 mb-1">WHATSAPP</label>
                            <input className="w-full bg-zinc-900 border border-zinc-800 rounded p-2.5 text-white outline-none focus:border-emerald-500" value={formData.whatsappNumber} onChange={e => setFormData({...formData, whatsappNumber: e.target.value})} placeholder="09xx..." />
                        </div>
                    </div>
                </div>

                {/* LOCATION */}
                <div className="space-y-4 pt-4 border-t border-zinc-900">
                    <h3 className="text-xs font-black text-zinc-500 uppercase">UBICACIÓN & PUESTO</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 mb-1">BARRIO / SECCIONAL (Select)</label>
                            <input list="address-options" className="w-full bg-zinc-900 border border-zinc-800 rounded p-2.5 text-white outline-none focus:border-blue-500" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Seleccionar..." />
                            <datalist id="address-options">
                                {availableAddresses.map((addr) => <option key={addr} value={addr} />)}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 mb-1">PUESTO ASIGNADO (PC)</label>
                            <select className="w-full bg-zinc-900 border border-zinc-800 rounded p-2.5 text-white outline-none focus:border-blue-500" value={formData.assignedStationId} onChange={(e) => setFormData({ ...formData, assignedStationId: e.target.value })}>
                                <option value="">-- Ninguno --</option>
                                {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2">
                             <label className="block text-xs font-bold text-zinc-500 mb-1">REFERENCIA / DIRECCIÓN EXACTA</label>
                             <input className="w-full bg-zinc-900 border border-zinc-800 rounded p-2.5 text-white outline-none focus:border-blue-500" value={formData.exactAddress} onChange={e => setFormData({...formData, exactAddress: e.target.value})} placeholder="Ej: Portón verde, frente a la plaza..." />
                        </div>
                    </div>
                </div>

                {/* CAMPAIGN STATUS */}
                <div className="space-y-4 pt-4 border-t border-zinc-900">
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-bold text-zinc-500 mb-1">INTENCIÓN DE VOTO</label>
                            <select className="w-full bg-zinc-900 border border-zinc-800 rounded p-2.5 text-white outline-none focus:border-blue-500" value={formData.currentVoteIntent} onChange={(e) => setFormData({ ...formData, currentVoteIntent: e.target.value })}>
                                <option value="SURE">VOTO SEGURO</option>
                                <option value="PROBABLE">PROBABLE</option>
                                <option value="UNDECIDED">INDECISO</option>
                                <option value="OPPOSITION">OPOSICIÓN</option>
                                <option value="DOES_NOT_VOTE">NO VOTA</option>
                            </select>
                         </div>
                         <div>
                            <label className="block text-xs font-bold text-zinc-500 mb-1">ESTADO VISITA</label>
                            <select className="w-full bg-zinc-900 border border-zinc-800 rounded p-2.5 text-white outline-none focus:border-blue-500" value={formData.campaignStatus} onChange={(e) => setFormData({ ...formData, campaignStatus: e.target.value })}>
                                <option value="NOT_VISITED">NO VISITADO</option>
                                <option value="TO_VISIT">POR VISITAR</option>
                                <option value="CONTACTED">CONTACTADO</option>
                                <option value="VISITED">VISITADO</option>
                                <option value="DO_NOT_DISTURB">⛔ NO MOLESTAR</option>
                            </select>
                         </div>
                    </div>
                    <div>
                         <label className="block text-xs font-bold text-zinc-500 mb-1">NOTAS</label>
                         <textarea className="w-full bg-zinc-900 border border-zinc-800 rounded p-2.5 text-white h-20 outline-none resize-none" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="..." />
                    </div>
                    {/* PEDIDOS (LISTA) */}
                    <div>
                         <label className="block text-xs font-bold text-zinc-500 mb-2">📋 PEDIDOS (Medicamentos, remeras, etc.)</label>
                         <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                             <div className="p-2 border-b border-zinc-800 flex gap-2">
                                <input 
                                    className="flex-1 bg-black border border-zinc-700 rounded px-2 py-1 text-sm text-white outline-none placeholder-zinc-600"
                                    placeholder="Escribir pedido..."
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            const val = e.currentTarget.value.trim();
                                            if (val) {
                                                setFormData({ ...formData, requests: [...formData.requests, val] });
                                                e.currentTarget.value = "";
                                            }
                                        }
                                    }}
                                />
                                <button type="button" className="text-xs font-bold bg-zinc-800 px-3 rounded hover:bg-zinc-700 text-white">AGREGAR</button>
                             </div>
                             <div className="p-2 max-h-32 overflow-y-auto space-y-1">
                                {formData.requests.length === 0 && <p className="text-xs text-zinc-600 italic text-center py-2">- Sin pedidos registrados -</p>}
                                {formData.requests.map((req, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-sm bg-zinc-950/50 px-2 py-1 rounded border border-zinc-800/50">
                                        <span className="text-zinc-300">{req}</span>
                                        <button type="button" onClick={() => setFormData({...formData, requests: formData.requests.filter((_, i) => i !== idx)})} className="text-red-500 hover:bg-red-950/30 p-1 rounded"><X size={12} /></button>
                                    </div>
                                ))}
                             </div>
                         </div>
                    </div>

                    {/* FINANCIERO */}
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
                         <div className="flex items-center gap-3">
                            <h3 className="text-xs font-bold text-emerald-500 flex items-center gap-2">¿💵? APORTE MONETARIO</h3>
                            <button 
                                type="button" 
                                onClick={() => setFormData({...formData, hasFinancialNeeds: !formData.hasFinancialNeeds})}
                                className={`w-10 h-5 rounded-full relative transition-colors ${formData.hasFinancialNeeds ? "bg-emerald-500" : "bg-zinc-700"}`}
                            >
                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.hasFinancialNeeds ? "left-6" : "left-1"}`} />
                            </button>
                         </div>

                         {formData.hasFinancialNeeds && (
                             <div className="pl-4 border-l-2 border-emerald-900/30 space-y-3 animate-in slide-in-from-top-2">
                                <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={formData.financialNeedsFulfilled}
                                        onChange={(e) => setFormData({...formData, financialNeedsFulfilled: e.target.checked})}
                                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500" 
                                    />
                                    <span>¿Ya recibió el aporte? (Obtuvo)</span>
                                </label>
                                
                                {formData.financialNeedsFulfilled && (
                                    <div>
                                        <label className="block text-[10px] font-bold text-zinc-500 mb-1">MONTO ENTREGADO (Gs.)</label>
                                        <input 
                                            type="number" 
                                            className="w-full bg-black border border-emerald-900/50 rounded p-2 text-white font-mono outline-none focus:border-emerald-500 text-right" 
                                            placeholder="0"
                                            value={formData.financialAmount}
                                            onChange={(e) => setFormData({...formData, financialAmount: Number(e.target.value)})}
                                        />
                                    </div>
                                )}
                             </div>
                         )}
                    </div>
                </div>

             </form>
           ) : (
                <div className="space-y-4">
                    {history.map((e: any) => (
                        <div key={e.id} className="border-l-2 border-zinc-800 pl-4 py-1">
                            <p className="text-zinc-300 text-sm">{e.event_type} - {e.payload?.details || ""}</p>
                            <p className="text-xs text-zinc-600">{new Date(e.created_at).toLocaleString()} por {e.actor_name}</p>
                        </div>
                    ))}
                </div>
           )}

        </div>

        {/* FOOTER */}
        <div className="p-6 border-t border-zinc-800 flex justify-end gap-3 bg-zinc-900/50">
            <button onClick={onClose} className="px-4 py-2 text-zinc-400 hover:text-white font-bold">CANCELAR</button>
            {activeTab === "details" && <button onClick={handleSave} className="px-6 py-2 bg-white text-black font-bold rounded hover:bg-zinc-200">GUARDAR</button>}
        </div>

      </div>
    </div>
  );
}
