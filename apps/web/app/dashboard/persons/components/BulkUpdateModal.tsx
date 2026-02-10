import { useState } from 'react';
import api from '../../../../lib/api';
import { AlertTriangle, Loader2, X, CheckCircle, Save, Plus, Trash2 } from 'lucide-react';
import clsx from 'clsx';

interface BulkUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  activeFilters: any;
}

export default function BulkUpdateModal({ isOpen, onClose, onSuccess, activeFilters }: BulkUpdateModalProps) {
  // Data States
  const [stations, setStations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  
  // Loading State
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [count, setCount] = useState<number | null>(null);

  // Form State: Tracks enabled fields and their values
  const [updates, setUpdates] = useState<any>({});
  const [enabledFields, setEnabledFields] = useState<Record<string, boolean>>({});

  // Sub-states for specific complex inputs
  const [requestType, setRequestType] = useState('LOGISTICS');
  const [requestNote, setRequestNote] = useState('');
  const [newTagInput, setNewTagInput] = useState('');

  // Load Data on Open
  useState(() => {
    if (isOpen) {
        api.get('/stations').then(res => setStations(res.data)).catch(()=>{});
        api.get('/users').then(res => setUsers(res.data)).catch(()=>{});
        api.get('/tags').then(res => setAvailableTags(res.data)).catch(()=>{});
    }
  });

  const toggleField = (field: string) => {
      setEnabledFields(prev => ({ ...prev, [field]: !prev[field] }));
      // If disabling, maybe clear value? No, keep it just in case re-enabling.
  };

  const updateValue = (field: string, value: any) => {
      setUpdates((prev: any) => ({ ...prev, [field]: value }));
      if (!enabledFields[field]) {
          setEnabledFields(prev => ({ ...prev, [field]: true }));
      }
  };

  const handleNext = async () => {
    // Check if any field is enabled
    const activeKeys = Object.keys(enabledFields).filter(k => enabledFields[k]);
    if (activeKeys.length === 0) return;

    setLoading(true);
    try {
        const params = new URLSearchParams(activeFilters);
        params.set('limit', '1');
        const res = await api.get(`/persons?${params.toString()}`);
        setCount(res.data.total);
        setStep(2);
    } catch(e) {
        alert("Error al verificar registros");
    } finally {
        setLoading(false);
    }
  };

  const handleExecute = async () => {
      setLoading(true);
      
      // Construct final payload
      const finalUpdates: any = {};
      Object.keys(enabledFields).forEach(k => {
          if (enabledFields[k]) {
              if (k === 'add_request') {
                   finalUpdates[k] = { type: requestType, subtypes: [requestNote], status: 'PENDING' };
              } else {
                   finalUpdates[k] = updates[k];
              }
          }
      });

      try {
          await api.patch('/persons/bulk-update', {
              filterCriteria: activeFilters,
              updates: finalUpdates
          });
          onSuccess();
          onClose();
      } catch (e: any) {
          alert("Error: " + (e.response?.data?.error || e.message));
      } finally {
          setLoading(false);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/50">
           <div>
             <h2 className="text-xl font-bold text-white">Edición Masiva</h2>
             <p className="text-zinc-500 text-sm">Selecciona los campos que deseas actualizar.</p>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400"><X size={20}/></button>
        </div>

        {step === 1 && (
            <div className="p-6 overflow-y-auto space-y-8 flex-1">
                
                {/* CAMPAIGN STATUS */}
                <div className="space-y-4">
                    <h3 className="text-xs font-black text-zinc-500 uppercase border-b border-zinc-800 pb-2">ESTADO DE CAMPAÑA</h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div className={clsx("space-y-2 transition-opacity", !enabledFields['current_vote_intent'] && "opacity-60")}>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" checked={!!enabledFields['current_vote_intent']} onChange={() => toggleField('current_vote_intent')} className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-blue-600"/>
                                <label className="text-xs font-bold text-zinc-400">INTENCIÓN DE VOTO</label>
                            </div>
                            <select 
                                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2.5 text-white outline-none focus:border-blue-500 disabled:cursor-not-allowed"
                                value={updates.current_vote_intent || ''}
                                onChange={e => updateValue('current_vote_intent', e.target.value)}
                                disabled={!enabledFields['current_vote_intent']}
                            >
                                <option value="">Seleccionar...</option>
                                <option value="SURE">VOTO SEGURO</option>
                                <option value="PROBABLE">PROBABLE</option>
                                <option value="UNDECIDED">INDECISO</option>
                                <option value="OPPOSITION">OPOSICIÓN</option>
                                <option value="WONT_VOTE">NO VOTA</option>
                            </select>
                        </div>
                        <div className={clsx("space-y-2 transition-opacity", !enabledFields['campaign_status'] && "opacity-60")}>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" checked={!!enabledFields['campaign_status']} onChange={() => toggleField('campaign_status')} className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-blue-600"/>
                                <label className="text-xs font-bold text-zinc-400">ESTADO VISITA</label>
                            </div>
                            <select 
                                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2.5 text-white outline-none focus:border-blue-500 disabled:cursor-not-allowed"
                                value={updates.campaign_status || ''} 
                                onChange={e => updateValue('campaign_status', e.target.value)}
                                disabled={!enabledFields['campaign_status']}
                            >
                                <option value="">Seleccionar...</option>
                                <option value="NOT_VISITED">NO VISITADO</option>
                                <option value="TO_VISIT">POR VISITAR</option>
                                <option value="CONTACTED">CONTACTADO</option>
                                <option value="VISITED">VISITADO</option>
                                <option value="DO_NOT_DISTURB">⛔ NO MOLESTAR</option>
                            </select>
                        </div>
                    </div>
                    <div className={clsx("space-y-2 transition-opacity", !enabledFields['add_note'] && "opacity-60")}>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" checked={!!enabledFields['add_note']} onChange={() => toggleField('add_note')} className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-blue-600"/>
                             <label className="text-xs font-bold text-zinc-400">AGREGAR NOTA</label>
                        </div>
                        <textarea 
                            className="w-full bg-zinc-900 border border-zinc-800 rounded p-2.5 text-white h-20 outline-none resize-none disabled:cursor-not-allowed" 
                            value={updates.add_note || ''} 
                            onChange={e => updateValue('add_note', e.target.value)} 
                            placeholder="..." 
                            disabled={!enabledFields['add_note']}
                        />
                    </div>
                </div>

                {/* LOGISTICS */}
                <div className="space-y-4">
                    <h3 className="text-xs font-black text-zinc-500 uppercase border-b border-zinc-800 pb-2">LOGÍSTICA</h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div className={clsx("space-y-2 transition-opacity", !enabledFields['needs_transport'] && "opacity-60")}>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" checked={!!enabledFields['needs_transport']} onChange={() => toggleField('needs_transport')} className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-blue-600"/>
                                <label className="text-xs font-bold text-zinc-400">NECESITA TRANSPORTE</label>
                            </div>
                            <select 
                                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2.5 text-white outline-none focus:border-blue-500 disabled:cursor-not-allowed" 
                                value={updates.needs_transport || ''} 
                                onChange={e => updateValue('needs_transport', e.target.value)}
                                disabled={!enabledFields['needs_transport']}
                            >
                                <option value="">Seleccionar...</option>
                                <option value="true">SÍ, NECESITA</option>
                                <option value="false">NO NECESITA</option>
                            </select>
                        </div>
                        <div className={clsx("space-y-2 transition-opacity", !enabledFields['transport_status'] && "opacity-60")}>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" checked={!!enabledFields['transport_status']} onChange={() => toggleField('transport_status')} className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-blue-600"/>
                                <label className="text-xs font-bold text-zinc-400">ESTADO TRANSPORTE</label>
                            </div>
                            <select 
                                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2.5 text-white outline-none focus:border-blue-500 disabled:cursor-not-allowed" 
                                value={updates.transport_status || ''} 
                                onChange={e => updateValue('transport_status', e.target.value)}
                                disabled={!enabledFields['transport_status']}
                            >
                                <option value="">Seleccionar...</option>
                                <option value="PENDING">PENDIENTE</option>
                                <option value="SEARCHING">BUSCANDO</option>
                                <option value="ON_TRANSIT">EN TRÁNSITO</option>
                                <option value="ARRIVED">LLEGÓ</option>
                                <option value="RETURNING">RETORNANDO</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* ASSIGNMENT */}
                <div className="space-y-4">
                    <h3 className="text-xs font-black text-zinc-500 uppercase border-b border-zinc-800 pb-2">UBICACIÓN & RESPONSABLES</h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div className={clsx("space-y-2 transition-opacity", !enabledFields['assigned_station_id'] && "opacity-60")}>
                             <div className="flex items-center gap-2">
                                <input type="checkbox" checked={!!enabledFields['assigned_station_id']} onChange={() => toggleField('assigned_station_id')} className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-blue-600"/>
                                <label className="text-xs font-bold text-zinc-400">PUESTO (PC)</label>
                            </div>
                            <select 
                                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2.5 text-white outline-none focus:border-blue-500 disabled:cursor-not-allowed" 
                                value={updates.assigned_station_id || ''} 
                                onChange={e => updateValue('assigned_station_id', e.target.value)}
                                disabled={!enabledFields['assigned_station_id']}
                            >
                                <option value="">-- Desvincular --</option>
                                {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className={clsx("space-y-2 transition-opacity", !enabledFields['assigned_user_id'] && "opacity-60")}>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" checked={!!enabledFields['assigned_user_id']} onChange={() => toggleField('assigned_user_id')} className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-blue-600"/>
                                <label className="text-xs font-bold text-zinc-400">RESPONSABLE</label>
                            </div>
                            <select 
                                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2.5 text-white outline-none focus:border-blue-500 disabled:cursor-not-allowed" 
                                value={updates.assigned_user_id || ''} 
                                onChange={e => updateValue('assigned_user_id', e.target.value)}
                                disabled={!enabledFields['assigned_user_id']}
                            >
                                <option value="">-- Desvincular --</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* EXTRAS */}
                <div className="space-y-4">
                    <h3 className="text-xs font-black text-zinc-500 uppercase border-b border-zinc-800 pb-2">EXTRAS</h3>
                    
                    {/* TAGS */}
                    <div className={clsx("space-y-2 transition-opacity", !enabledFields['add_tag'] && "opacity-60")}>
                         <div className="flex items-center gap-2">
                            <input type="checkbox" checked={!!enabledFields['add_tag']} onChange={() => toggleField('add_tag')} className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-blue-600"/>
                            <label className="text-xs font-bold text-zinc-400">AÑADIR ETIQUETA</label>
                        </div>
                         <select 
                            className="w-full bg-zinc-900 border border-zinc-800 rounded p-2.5 text-white outline-none focus:border-blue-500 disabled:cursor-not-allowed" 
                            value={updates.add_tag || ''} 
                            onChange={e => updateValue('add_tag', e.target.value)}
                            disabled={!enabledFields['add_tag']}
                        >
                            <option value="">Seleccionar Etiqueta...</option>
                            {availableTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    {/* FINANCIAL */}
                    <div className={clsx("bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 transition-opacity", !enabledFields['financial_amount'] && "opacity-60")}>
                        <div className="flex items-center gap-3 mb-3">
                            <input type="checkbox" checked={!!enabledFields['financial_amount']} onChange={() => toggleField('financial_amount')} className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"/>
                             <h3 className="text-xs font-bold text-emerald-500">ASIGNAR APORTE MONETARIO</h3>
                        </div>
                        <input 
                            type="number" 
                            className="w-full bg-black border border-emerald-900/50 rounded p-2 text-white font-mono outline-none focus:border-emerald-500 text-right disabled:cursor-not-allowed" 
                            placeholder="0"
                            value={updates.financial_amount || ''}
                            onChange={e => updateValue('financial_amount', e.target.value)}
                            disabled={!enabledFields['financial_amount']}
                        />
                    </div>

                    {/* REQUESTS */}
                    <div className={clsx("bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 transition-opacity", !enabledFields['add_request'] && "opacity-60")}>
                        <div className="flex items-center gap-3 mb-3">
                            <input type="checkbox" checked={!!enabledFields['add_request']} onChange={() => toggleField('add_request')} className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-blue-500 focus:ring-blue-500"/>
                             <h3 className="text-xs font-bold text-blue-500">AGREGAR PEDIDO</h3>
                        </div>
                        <div className="space-y-2">
                             <select 
                                className="w-full bg-black border border-zinc-700 rounded p-2 text-white outline-none disabled:cursor-not-allowed" 
                                value={requestType} 
                                onChange={e => setRequestType(e.target.value)}
                                disabled={!enabledFields['add_request']}
                            >
                                <option value="LOGISTICS">Logística</option>
                                <option value="FINANCIAL">Ayuda Económica</option>
                                <option value="MEDICINE">Medicamentos</option>
                                <option value="OTHER">Otro</option>
                            </select>
                            <input 
                                className="w-full bg-black border border-zinc-700 rounded p-2 text-white outline-none disabled:cursor-not-allowed" 
                                placeholder="Detalle (Ej: Combustible, Remedios...)" 
                                value={requestNote} 
                                onChange={e => { setRequestNote(e.target.value); updateValue("add_request", "dummy"); }} 
                                disabled={!enabledFields['add_request']}
                            />
                        </div>
                    </div>

                </div>

            </div>
        )}

        {step === 2 && (
            <div className="p-6 flex-1 flex flex-col items-center justify-center space-y-6 text-center">
                <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center text-yellow-500 animate-pulse">
                    <AlertTriangle size={32} />
                </div>
                <div>
                     <p className="text-zinc-400">Estás a punto de actualizar</p>
                     <p className="text-5xl font-bold text-white my-3">{count}</p>
                     <p className="text-zinc-400">personas con los campos seleccionados.</p>
                </div>

                <div className="text-left bg-zinc-900 p-4 rounded-xl border border-zinc-800 w-full max-w-sm">
                    <p className="text-xs font-bold text-zinc-500 mb-2 uppercase">Campos a modificar:</p>
                    <ul className="text-sm text-zinc-300 space-y-1 list-disc list-inside">
                        {Object.keys(enabledFields).filter(k => enabledFields[k]).map(k => (
                            <li key={k}>{k.replace(/_/g, ' ').toUpperCase()}</li>
                        ))}
                    </ul>
                </div>
            </div>
        )}

        {/* FOOTER */}
        <div className="p-6 border-t border-zinc-800 flex justify-end gap-3 bg-zinc-900/50">
             {step === 1 ? (
                 <>
                    <button onClick={onClose} className="px-4 py-2 text-zinc-400 hover:text-white font-bold">CANCELAR</button>
                    <button onClick={handleNext} disabled={loading} className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-500 disabled:opacity-50 flex items-center gap-2">
                        {loading && <Loader2 className="animate-spin" size={16}/>}
                        CONTINUAR
                    </button>
                 </>
             ) : (
                 <>
                    <button onClick={() => setStep(1)} className="px-4 py-2 text-zinc-400 hover:text-white font-bold">VOLVER</button>
                    <button onClick={handleExecute} disabled={loading} className="px-6 py-2 bg-yellow-600 text-white font-bold rounded hover:bg-yellow-500 disabled:opacity-50 flex items-center gap-2">
                        {loading && <Loader2 className="animate-spin" size={16}/>}
                        CONFIRMAR CAMBIOS
                    </button>
                 </>
             )}
        </div>

      </div>
    </div>
  );
}
