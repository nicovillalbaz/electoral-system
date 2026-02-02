"use client";
import { useState, useEffect } from "react";
import { X, Save, User, Plus, MapPin, Phone, History, Tag, Trash2, Calendar, Clock } from "lucide-react";
import api from "../../../../lib/api"; 

interface PersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; 
  personToEdit?: any;
  availableAddresses?: string[];
  availableTags?: any[]; // <--- Recibimos todas las etiquetas disponibles
}

export default function PersonModal({ 
    isOpen, onClose, onSuccess, personToEdit, 
    availableAddresses = [], availableTags = [] 
}: PersonModalProps) {
  
  const isEditing = !!personToEdit;
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  
  // ESTADOS NUEVOS PARA CREAR ETIQUETAS
  const [localTags, setLocalTags] = useState<any[]>(availableTags); 
  const [newTagInput, setNewTagInput] = useState(""); 

  // ESTADOS PARA ETIQUETAS Y EVENTOS
  const [assignedTags, setAssignedTags] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // CONSTANTES DE CAMPAÑA
  const CAMPAIGN_DEPT = "CORDILLERA";
  const CAMPAIGN_DIST = "SAN BERNARDINO";

  const [formData, setFormData] = useState({
    documentId: "", firstName: "", lastName: "", phoneNumber: "", address: "",
    department: CAMPAIGN_DEPT, district: CAMPAIGN_DIST, pollingPlace: "",
    tableNumber: "", orderNumber: "", partyAffiliation: "ANR",
    currentVoteIntent: "UNDECIDED", notes: ""
  });

  // Actualizar lista local si llegan nuevas props
  useEffect(() => {
      setLocalTags(availableTags);
  }, [availableTags]);

  // CARGAR DATOS AL ABRIR
  useEffect(() => {
    if (isOpen) {
        setActiveTab('details'); // Siempre abrir en detalles
        
        if (personToEdit) {
            // 1. Cargar Formulario
            setFormData({
                documentId: personToEdit.document_id,
                firstName: personToEdit.first_name,
                lastName: personToEdit.last_name,
                phoneNumber: personToEdit.phone_number || "",
                address: personToEdit.address || "",
                // OJO: Si el backend no envía estos campos, tomará los valores por defecto
                department: personToEdit.location_department || CAMPAIGN_DEPT,
                district: personToEdit.location_district || CAMPAIGN_DIST,
                pollingPlace: personToEdit.location_place || "",
                tableNumber: personToEdit.voting_table_number || "",
                orderNumber: personToEdit.voting_order_number || "",
                partyAffiliation: personToEdit.party_affiliation || "ANR",
                currentVoteIntent: personToEdit.current_vote_intent || "UNDECIDED",
                notes: personToEdit.notes || ""
            });

            // 2. Cargar Etiquetas Asignadas
            fetchTags(personToEdit.id);

            // 3. Cargar Historial
            fetchHistory(personToEdit.id);

        } else {
            // Limpiar para crear
            setFormData({
                documentId: "", firstName: "", lastName: "", phoneNumber: "", address: "",
                department: CAMPAIGN_DEPT, district: CAMPAIGN_DIST, pollingPlace: "",
                tableNumber: "", orderNumber: "", partyAffiliation: "ANR",
                currentVoteIntent: "UNDECIDED", notes: ""
            });
            setAssignedTags([]);
            setHistory([]);
        }
    }
  }, [isOpen, personToEdit]);

  // --- FUNCIONES DE CARGA ---
  const fetchTags = async (personId: string) => {
      try {
          const res = await api.get(`/tags/person/${personId}`);
          setAssignedTags(res.data);
      } catch (e) { console.error("Error cargando etiquetas", e); }
  };

  const fetchHistory = async (personId: string) => {
      setLoadingHistory(true);
      try {
          const res = await api.get(`/events?personId=${personId}&limit=50`);
          setHistory(res.data);
      } catch (e) { console.error("Error historial", e); }
      finally { setLoadingHistory(false); }
  };

  // --- MANEJO DE ETIQUETAS ---
  const handleAssignTag = async (tagId: string) => {
      if (!tagId || !personToEdit) return;
      try {
          await api.post('/tags/assign', { personId: personToEdit.id, tagId });
          fetchTags(personToEdit.id); 
          // Refrescar historial brevemente después para ver el evento
          setTimeout(() => fetchHistory(personToEdit.id), 500);
      } catch (e) { alert("Error al asignar etiqueta"); }
  };

  const handleRemoveTag = async (tagId: string) => {
      if (!personToEdit) return;
      try {
          await api.post('/tags/remove', { personId: personToEdit.id, tagId });
          fetchTags(personToEdit.id); 
      } catch (e) { alert("Error al quitar etiqueta"); }
  };

  // --- NUEVA FUNCIÓN: CREAR ETIQUETA ---
  const handleCreateTag = async () => {
      if (!newTagInput.trim()) return;
      try {
          // Asumimos un color por defecto azul
          const res = await api.post('/tags', { name: newTagInput.trim(), color: '#3b82f6' });
          const newTag = res.data;
          setLocalTags([...localTags, newTag]); // Agregar a la lista local inmediatamente
          if (personToEdit) {
              handleAssignTag(newTag.id); // Asignarla automáticamente al crearla
          }
          setNewTagInput(""); // Limpiar input
      } catch (e) { alert("Error al crear etiqueta"); }
  };

  // --- GUARDAR PERSONA ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.patch(`/persons/${personToEdit.id}`, formData);
      } else {
        await api.post('/persons', formData);
      }
      onSuccess(); 
      onClose();   
    } catch (error) { 
        alert('Error al guardar. Verifique los datos.'); 
    }
  };

  // Renderizado del Historial (Formato Amigable)
  const formatEvent = (event: any) => {
      const date = new Date(event.created_at).toLocaleString('es-PY', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' });
      let text = event.event_type;
      let icon = <CheckCircle size={14} className="text-zinc-500"/>;

      // Personalizar mensaje según tipo de evento
      if (event.event_type === 'TAG_ASSIGNED') {
          // Buscamos el nombre en localTags para que sea reactivo
          const tagName = localTags.find(t => t.id === event.payload?.tagId)?.name || 'Etiqueta';
          text = `Asignó etiqueta: "${tagName}"`;
          icon = <Tag size={14} className="text-blue-500"/>;
      } else if (event.event_type === 'TAG_REMOVED') {
          text = `Quitó una etiqueta`;
          icon = <Trash2 size={14} className="text-red-500"/>;
      } else if (event.event_type === 'PERSON_CREATED') {
          text = "Persona registrada en el sistema";
          icon = <User size={14} className="text-emerald-500"/>;
      } else if (event.event_type === 'PERSON_UPDATED') {
          // Si el backend mandó detalles, los mostramos. Si no, mensaje genérico.
          const details = event.payload?.details;
          text = details ? `Actualizó: ${details}` : "Actualizó datos de la ficha";
          icon = <Save size={14} className="text-orange-500"/>;
      }

      return (
          <div key={event.id} className="flex gap-3 items-start pb-4 border-l border-zinc-800 pl-4 ml-2 relative">
              <div className="absolute -left-[5px] top-1 bg-zinc-900 rounded-full border border-zinc-700 p-0.5">
                  {icon}
              </div>
              <div className="text-sm">
                  <p className="text-zinc-300 font-medium">{text}</p>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                      <span className="flex items-center gap-1"><Clock size={10}/> {date}</span>
                      <span>•</span>
                      <span className="text-zinc-400">{event.actor_name || 'Sistema'}</span>
                  </div>
              </div>
          </div>
      );
  };

  // Icono auxiliar para no romper si no hay iconos importados arriba
  const CheckCircle = ({size, className}: any) => <div className={`w-3 h-3 rounded-full border ${className}`} />;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
        <div className="bg-zinc-950 border border-zinc-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* CABECERA CON PESTAÑAS */}
            <div className="border-b border-zinc-800 bg-zinc-900/50 rounded-t-2xl">
                <div className="p-6 flex justify-between items-center pb-2">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            {isEditing ? <><User size={20}/> Perfil 360°</> : <><Plus size={20}/> Nueva Persona</>}
                        </h2>
                        <p className="text-zinc-400 text-xs mt-1">
                            {isEditing ? `CI: ${formData.documentId} - ${formData.firstName} ${formData.lastName}` : "Registro de nuevo votante."}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white bg-zinc-800 p-2 rounded-full"><X size={18} /></button>
                </div>
                
                {/* BARRA DE NAVEGACIÓN (TABS) */}
                {isEditing && (
                    <div className="flex px-6 gap-6">
                        <button 
                            onClick={() => setActiveTab('details')}
                            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'details' ? 'text-white border-white' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
                        >
                            FICHA DE DATOS
                        </button>
                        <button 
                            onClick={() => setActiveTab('history')}
                            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'history' ? 'text-white border-white' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
                        >
                            <History size={14}/> HISTORIAL Y EVENTOS
                        </button>
                    </div>
                )}
            </div>

            {/* CONTENIDO SCROLLEABLE */}
            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1">
                
                {/* --- TAB 1: DETALLES (FORMULARIO) --- */}
                {activeTab === 'details' && (
                    <form id="person-form" onSubmit={handleSave} className="space-y-6">
                        
                        {/* ETIQUETAS (SOLO EN EDICIÓN - ACTUALIZADO) */}
                        {isEditing && (
                            <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-xs font-black text-zinc-400 uppercase flex items-center gap-2"><Tag size={12}/> Etiquetas Asignadas</h3>
                                    
                                    {/* SELECTOR + CREAR (NUEVO DISEÑO) */}
                                    <div className="flex gap-2">
                                        <select 
                                            className="bg-black border border-zinc-700 text-xs text-white rounded px-2 py-1 outline-none focus:border-zinc-500 max-w-[120px]"
                                            onChange={(e) => { handleAssignTag(e.target.value); e.target.value = ""; }}
                                        >
                                            <option value="">+ Asignar</option>
                                            {localTags.map(tag => (
                                                <option key={tag.id} value={tag.id}>{tag.name}</option>
                                            ))}
                                        </select>
                                        <div className="flex items-center gap-1">
                                            <input 
                                                className="bg-black border border-zinc-700 text-xs text-white rounded px-2 py-1 w-24 outline-none focus:border-blue-500"
                                                placeholder="Nueva..."
                                                value={newTagInput}
                                                onChange={e => setNewTagInput(e.target.value)}
                                            />
                                            <button type="button" onClick={handleCreateTag} className="bg-blue-600 text-white p-1 rounded hover:bg-blue-500"><Plus size={12}/></button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {assignedTags.length > 0 ? assignedTags.map(tag => (
                                        <span key={tag.id} className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-300 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{backgroundColor: tag.color || '#fff'}}></div>
                                            {tag.name}
                                            <button type="button" onClick={() => handleRemoveTag(tag.id)} className="hover:text-red-500"><X size={12}/></button>
                                        </span>
                                    )) : <span className="text-xs text-zinc-600 italic">Sin etiquetas asignadas.</span>}
                                </div>
                            </div>
                        )}

                        {/* SECCIÓN 1: DATOS PERSONALES */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-emerald-500 uppercase tracking-wider flex items-center gap-2">1. Datos Personales</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 mb-1">CÉDULA</label>
                                    <input className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white font-mono focus:border-emerald-500 outline-none"
                                        value={formData.documentId} onChange={e => setFormData({...formData, documentId: e.target.value})} 
                                        required disabled={isEditing} 
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-zinc-500 mb-1">TELÉFONO</label>
                                    <input className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white focus:border-emerald-500 outline-none"
                                        placeholder="09xx..."
                                        value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} 
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 mb-1">NOMBRES</label>
                                    <input className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white focus:border-emerald-500 outline-none"
                                        value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} required 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 mb-1">APELLIDOS</label>
                                    <input className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white focus:border-emerald-500 outline-none"
                                        value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} required 
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 mb-1">DIRECCIÓN / BARRIO</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-2.5 text-zinc-600" size={16}/>
                                    <input list="address-options" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-10 p-2.5 text-white focus:border-emerald-500 outline-none"
                                        value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} 
                                        placeholder="Seleccione o escriba uno nuevo..."
                                    />
                                    <datalist id="address-options">
                                        {availableAddresses.map((addr) => <option key={addr} value={addr} />)}
                                    </datalist>
                                </div>
                            </div>
                        </div>

                        <hr className="border-zinc-800" />

                        {/* SECCIÓN 2: DATOS ELECTORALES */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-blue-500 uppercase tracking-wider flex items-center gap-2">2. Datos Electorales</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 mb-1">DEPARTAMENTO</label>
                                    <input className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-2.5 text-zinc-500 font-bold outline-none cursor-not-allowed"
                                        value={formData.department} readOnly 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 mb-1">DISTRITO</label>
                                    <input className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-2.5 text-zinc-500 font-bold outline-none cursor-not-allowed"
                                        value={formData.district} readOnly 
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 mb-1">LOCAL DE VOTACIÓN</label>
                                <input className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none"
                                    placeholder="Ej: ESCUELA N 39..."
                                    value={formData.pollingPlace} onChange={e => setFormData({...formData, pollingPlace: e.target.value})} 
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 mb-1">MESA</label>
                                    <input type="number" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white font-mono text-center focus:border-blue-500 outline-none"
                                        value={formData.tableNumber} onChange={e => setFormData({...formData, tableNumber: e.target.value})} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 mb-1">ORDEN</label>
                                    <input type="number" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white font-mono text-center focus:border-blue-500 outline-none"
                                        value={formData.orderNumber} onChange={e => setFormData({...formData, orderNumber: e.target.value})} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 mb-1">AFILIACIÓN</label>
                                    <input className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white text-center focus:border-blue-500 outline-none"
                                        value={formData.partyAffiliation} onChange={e => setFormData({...formData, partyAffiliation: e.target.value})} 
                                    />
                                </div>
                            </div>
                        </div>

                        <hr className="border-zinc-800" />

                        {/* SECCIÓN 3: ESTRATEGIA */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-purple-500 uppercase tracking-wider flex items-center gap-2">3. Estrategia</h3>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 mb-1">INTENCIÓN DE VOTO</label>
                                <select className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                                    value={formData.currentVoteIntent} onChange={e => setFormData({...formData, currentVoteIntent: e.target.value})}>
                                    <option value="SURE">VOTO SEGURO 🟢</option>
                                    <option value="PROBABLE">PROBABLE 🟡</option>
                                    <option value="UNDECIDED">INDECISO ⚪</option>
                                    <option value="OPPOSITION">OPOSICIÓN 🔴</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 mb-1">NOTAS / BITÁCORA</label>
                                <textarea className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white h-24 focus:border-purple-500 outline-none resize-none"
                                    placeholder="Escribe aquí notas sobre visitas..."
                                    value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} 
                                />
                            </div>
                        </div>
                    </form>
                )}

                {/* --- TAB 2: HISTORIAL Y EVENTOS --- */}
                {activeTab === 'history' && (
                    <div className="space-y-4">
                        {loadingHistory ? (
                            <p className="text-zinc-500 text-center py-10 animate-pulse">Cargando eventos...</p>
                        ) : history.length > 0 ? (
                            <div className="pt-2">
                                {history.map(event => formatEvent(event))}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-zinc-600">
                                <History size={40} className="mx-auto mb-2 opacity-20"/>
                                <p>No hay eventos registrados para esta persona.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* FOOTER */}
            <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 rounded-b-2xl flex gap-4">
                <button onClick={onClose} className="flex-1 py-3 font-bold text-zinc-400 hover:text-white transition-colors">
                    CANCELAR
                </button>
                {activeTab === 'details' && (
                    <button form="person-form" type="submit" className="flex-1 bg-white text-black py-3 rounded-xl font-black hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2">
                        <Save size={18}/> {isEditing ? "GUARDAR CAMBIOS" : "REGISTRAR PERSONA"}
                    </button>
                )}
                {activeTab === 'history' && (
                    <button onClick={() => setActiveTab('details')} className="flex-1 bg-zinc-800 text-white py-3 rounded-xl font-bold hover:bg-zinc-700 transition-colors">
                        VOLVER A DATOS
                    </button>
                )}
            </div>
        </div>
    </div>
  );
}