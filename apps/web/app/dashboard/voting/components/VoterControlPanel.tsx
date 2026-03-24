'use client';

import { useState, useEffect } from "react";
import safeApi from "../../../../lib/api";
import { getApiErrorMessage } from "../../../../lib/api-error";
import { addToQueue } from "../../../../lib/offline-queue";
import { User, MapPin, CheckCircle, Smartphone, DollarSign, ClipboardList, Send, AlertTriangle, Truck, Save, X } from "lucide-react";
import { toast } from "sonner";

interface AppUser {
    id: string;
    full_name: string;
    role: string;
}

interface VoterControlPanelProps {
    voter: any;
    onClose: () => void;
    onUpdate: (updatedVoter: any) => void; 
}

const QUICK_AMOUNT_VALUES = [50000, 100000] as const;
type QuickAmountPreset = `${(typeof QUICK_AMOUNT_VALUES)[number]}` | "MANUAL";

const resolveQuickAmountPreset = (amount: number): QuickAmountPreset => {
    if (QUICK_AMOUNT_VALUES.includes(amount as (typeof QUICK_AMOUNT_VALUES)[number])) {
        return String(amount) as QuickAmountPreset;
    }
    return "MANUAL";
};

export default function VoterControlPanel({ voter, onClose, onUpdate }: VoterControlPanelProps) {
    const [loading, setLoading] = useState(false);
    
    // --- UNIFIED LOCAL STATE ---
    // We initialize ONCE from props.
    const [form, setForm] = useState({
        status_day_d: voter.status_day_d || 'PENDING',
        current_vote_intent: voter.current_vote_intent || 'UNDECIDED',
        assigned_station_id: voter.assigned_station_id || "",
        passed_pc: (voter.campaign_status === 'VISITED_PC' || !!voter.station_checkin_at),
        
        // Finance
        has_financial_needs: voter.has_financial_needs || false,
        financial_amount: voter.financial_amount || 0,
        
        // Logistics (Extracted from Requests JSON)
        wants_logistics: false,
        logistics_types: [] as string[],
        logistics_responsible: "",

        // Notes
        notes: voter.notes || ""
    });
    const [financePreset, setFinancePreset] = useState<QuickAmountPreset>(
        resolveQuickAmountPreset(Number(voter.financial_amount || 0))
    );

    const [stationOptions, setStationOptions] = useState<any[]>([]);
    const [userOptions, setUserOptions] = useState<AppUser[]>([]);

    // Initialize Logistics from JSON
    useEffect(() => {
        const requests = Array.isArray(voter.requests) ? voter.requests : [];
        const logReq = requests.find((r: any) => r.type === 'LOGISTICS');
        
        setForm(prev => ({
            ...prev,
            wants_logistics: !!logReq,
            logistics_types: logReq?.subtypes || [],
            logistics_responsible: logReq?.assignedUserId || logReq?.responsible || "" // Load ID or legacy legacy name
        }));
    }, [voter]);

    useEffect(() => {
        setFinancePreset(resolveQuickAmountPreset(Number(voter.financial_amount || 0)));
    }, [voter.id, voter.financial_amount]);

    // Load PCs & Users
    useEffect(() => {
        safeApi.get('/stations').then(res => setStationOptions(res.data)).catch(() => {});
        safeApi.get('/users?limit=100').then(res => {
            const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
            setUserOptions(data);
        }).catch(() => {});
    }, []);


    // --- HANDLERS ---
    
    const handleChange = (field: string, value: any) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const payload: any = {};

            // 1. Compare Simple Fields
            if (form.current_vote_intent !== voter.current_vote_intent) {
                 payload.currentVoteIntent = form.current_vote_intent;
            }

            // 2. Campaign Status (Passed PC?)
            const newStatus = form.passed_pc ? 'VISITED_PC' : (voter.campaign_status === 'VISITED_PC' ? 'NOT_VISITED' : voter.campaign_status);
            // If undefined/null in voter, treat as '' or match logic
            const prevStatus = voter.campaign_status;
            if (newStatus !== prevStatus) {
                payload.campaignStatus = newStatus;
            }

            // 2.1 Station (PC) Logic - Explicit save if changed OR if status is VISITED_PC (to be safe per user request)
            if (form.assigned_station_id !== voter.assigned_station_id) {
                payload.assignedStationId = form.assigned_station_id;
            } else if (newStatus === 'VISITED_PC' && form.assigned_station_id) {
                 // Force send if marking as visited, to ensure linkage
                 payload.assignedStationId = form.assigned_station_id;
            }

            // 3. Financial
            if (form.has_financial_needs !== voter.has_financial_needs) {
                payload.hasFinancialNeeds = form.has_financial_needs;
            }
            if (Number(form.financial_amount) !== Number(voter.financial_amount)) {
                payload.financialAmount = Number(form.financial_amount);
            }

            // 4. Notes
            // Treat null/undefined as empty string for comparison
            const prevNotes = voter.notes || "";
            if (form.notes !== prevNotes) {
                payload.notes = form.notes;
            }

            // 5. Logistics (Requests) Logic
            const requests = Array.isArray(voter.requests) ? [...voter.requests] : [];
            const logReq = requests.find((r: any) => r.type === 'LOGISTICS');
            
            const prevWants = !!logReq;
            const prevSubtypes = logReq?.subtypes || [];
            const prevResponsible = logReq?.responsible || "";

            // Check difference (ignoring order for subtypes array comparison usually, but simple join is fast enough for now if sorted)
            const subtypesChanged = JSON.stringify([...form.logistics_types].sort()) !== JSON.stringify([...prevSubtypes].sort());
            const logisticsChanged = 
                   (form.wants_logistics !== prevWants) ||
                   subtypesChanged ||
                   (form.logistics_responsible !== prevResponsible);

            if (logisticsChanged) {
                 // Rebuild requests array
                 const otherRequests = requests.filter((r: any) => r.type !== 'LOGISTICS');
                 const selectedUser = userOptions.find(u => u.id === form.logistics_responsible); // Moved declaration
                 if (form.wants_logistics) {
                     otherRequests.push({
                        type: 'LOGISTICS',
                        subtypes: form.logistics_types,
                        responsible: selectedUser ? selectedUser.full_name : form.logistics_responsible, // Keep name for display
                        assignedUserId: selectedUser ? selectedUser.id : undefined, // <--- Only send valid UUID
                        created_at: new Date().toISOString()
                    });
                 }
                 payload.requests = otherRequests;
            }

            // 6. Send PATCH only if keys exist
            if (Object.keys(payload).length > 0) {
                 // Remove undefined/null/empty strings if needed?
                 // Zod 'optional' handles missing keys well.
                 // Empty strings "" might be sent if user cleared a note. This is correct.
                 await safeApi.patch(`/persons/${voter.id}`, payload);
            }

            // 7. Handle Status Change (Endpoint specific - NOT in PATCH)
            if (form.status_day_d !== voter.status_day_d) {
                await safeApi.post('/voting/status', { personId: voter.id, status: form.status_day_d });
            }

            // 8. Handle Checkin (Manual Trigger)
            if (form.passed_pc && !voter.station_checkin_at && form.assigned_station_id) {
                 await safeApi.post('/stations/checkin', { personId: voter.id, stationId: form.assigned_station_id });
            }

            // 9. Success -> Update Parent & Close
            // Merge changes for optimistic update
            const optimisticUpdate = {
                ...voter,
                ...payload,
                status_day_d: form.status_day_d,
                // Simple optimistic checkin logic
                station_checkin_at: form.passed_pc ? (voter.station_checkin_at || new Date().toISOString()) : null
            };
            
            onUpdate(optimisticUpdate);
            toast.success("Cambios guardados.");
            onClose();

        } catch (e) {
            console.error(e);
            toast.error(getApiErrorMessage(e, "Error al guardar. Verifica tu conexión."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-full h-full w-[500px] max-w-full">
            {/* HEADER */}
            <div className="p-4 bg-black/40 border-b border-white/5 flex justify-between items-center">
                 <div>
                     <h2 className="text-xl font-black uppercase text-white">{voter.first_name} {voter.last_name}</h2>
                     <div className="text-xs text-zinc-500 font-mono">CI: {voter.document_id}</div>
                 </div>
                 <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                     <X size={20} className="text-zinc-500"/>
                 </button>
            </div>

            {/* BODY */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* 1. STATUS BUTTONS */}
                <div className="grid grid-cols-3 gap-2 bg-black/20 p-2 rounded-xl border border-white/5">
                    {['PENDING', 'ON_TRANSIT', 'VOTED'].map(status => {
                        const labels: any = { PENDING: 'PENDIENTE', ON_TRANSIT: 'EN CAMINO', VOTED: 'YA VOTÓ' };
                        const colors: any = { 
                            PENDING: 'bg-zinc-800 text-zinc-400', 
                            ON_TRANSIT: 'bg-orange-500/20 text-orange-500 border-orange-500/50', 
                            VOTED: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50' 
                        };
                        const active = form.status_day_d === status;
                        return (
                            <button
                                key={status}
                                onClick={() => handleChange('status_day_d', status)}
                                className={`py-2 px-1 rounded-lg text-[10px] font-bold border transition-all ${active ? colors[status] + ' ring-1 ring-white/20' : 'border-transparent text-zinc-600 hover:bg-white/5'}`}
                            >
                                {labels[status]}
                            </button>
                        );
                    })}
                </div>

                {/* 2. PC CHECKIN */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 flex items-center gap-2">
                        <MapPin size={14}/> PUESTO DE COMANDO
                    </label>
                    <div className="flex gap-2">
                        <select 
                            className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-white p-2 outline-none focus:border-emerald-500"
                            value={form.assigned_station_id}
                            onChange={(e) => handleChange('assigned_station_id', e.target.value)}
                        >
                            <option value="">-- Asignar PC --</option>
                            {stationOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <button
                            onClick={() => handleChange('passed_pc', !form.passed_pc)}
                            className={`px-3 rounded-lg border flex items-center gap-2 text-xs font-bold transition-all ${form.passed_pc ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'border-zinc-700 text-zinc-500'}`}
                        >
                            <CheckCircle size={14} /> PASÓ
                        </button>
                    </div>
                </div>

                {/* 3. VOTE INTENT */}
                <div className="space-y-2">
                     <label className="text-xs font-bold text-zinc-500">INTENCIÓN DE VOTO</label>
                     <select 
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-white p-2 outline-none focus:border-blue-500"
                        value={form.current_vote_intent}
                        onChange={(e) => handleChange('current_vote_intent', e.target.value)}
                     >
                        <option value="SURE">VOTO SEGURO 🟢</option>
                        <option value="PROBABLE">PROBABLE 🟡</option>
                        <option value="UNDECIDED">INDECISO ⚪</option>
                        <option value="OPPOSITION_INTERNAL">OPOSICIÓN (INTERNA) 🔴</option>
                        <option value="OPPOSITION_PARTY">OPOSICIÓN (OTRO PARTIDO) 🔴</option>
                     </select>
                </div>

                <div className="h-px bg-white/10" />

                {/* 4. FINANCIAL / VIATICO */}
                <div className="space-y-2">
                    <div className="flex justify-between">
                         <label className="text-xs font-bold text-zinc-500 flex items-center gap-2">
                            <DollarSign size={14}/> VIÁTICO / APORTE
                        </label>
                        <input 
                            type="checkbox" 
                            checked={form.has_financial_needs}
                            onChange={(e) => handleChange('has_financial_needs', e.target.checked)}
                            className="accent-emerald-500"
                        />
                    </div>
                    {form.has_financial_needs && (
                        <div className="space-y-2 animate-in slide-in-from-top-1">
                            <select
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-sm text-white"
                                value={financePreset}
                                onChange={(e) => {
                                    const nextPreset = e.target.value as QuickAmountPreset;
                                    setFinancePreset(nextPreset);
                                    if (nextPreset !== "MANUAL") {
                                        handleChange('financial_amount', Number(nextPreset));
                                    }
                                }}
                            >
                                <option value="50000">Gs. 50.000</option>
                                <option value="100000">Gs. 100.000</option>
                                <option value="MANUAL">Otro (manual)</option>
                            </select>
                            {financePreset === "MANUAL" ? (
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-zinc-500 text-sm">Gs.</span>
                                    <input 
                                        type="number" 
                                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-10 p-2 text-sm text-white font-mono"
                                        value={form.financial_amount}
                                        onChange={(e) => handleChange('financial_amount', e.target.value)}
                                        placeholder="0"
                                    />
                                </div>
                            ) : (
                                <div className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-xs text-zinc-300 font-mono">
                                    Monto seleccionado: Gs. {Number(form.financial_amount || 0).toLocaleString("es-PY")}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 5. LOGISTICS */}
                <div className="space-y-3">
                    <div className="flex justify-between">
                         <label className="text-xs font-bold text-zinc-500 flex items-center gap-2">
                            <Truck size={14}/> LOGÍSTICA OPERATIVA
                        </label>
                        <input 
                            type="checkbox" 
                            checked={form.wants_logistics}
                            onChange={(e) => handleChange('wants_logistics', e.target.checked)}
                            className="accent-blue-500"
                        />
                    </div>
                    {form.wants_logistics && (
                        <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800 space-y-3 animate-in slide-in-from-top-1">
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'FUEL', label: 'COMBUSTIBLE' },
                                    { id: 'TRANSPORT', label: 'TRANSPORTE' },
                                    { id: 'SNACK', label: 'REFRIGERIO' },
                                    { id: 'ACCOMPANIMENT', label: 'ACOMPAÑAMIENTO' }
                                ].map(option => (
                                    <button
                                        key={option.id}
                                        onClick={() => {
                                            const types = form.logistics_types.includes(option.id)
                                                ? form.logistics_types.filter(t => t !== option.id)
                                                : [...form.logistics_types, option.id];
                                            handleChange('logistics_types', types);
                                        }}
                                        className={`text-[10px] font-bold p-2 rounded border transition-colors ${form.logistics_types.includes(option.id) ? 'bg-blue-900/30 border-blue-500 text-blue-400' : 'bg-transparent border-zinc-800 text-zinc-500'}`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                            <select 
                                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-white placeholder:text-zinc-600 focus:border-blue-500 outline-none appearance-none"
                                value={form.logistics_responsible}
                                onChange={(e) => handleChange('logistics_responsible', e.target.value)}
                            >
                                <option value="">-- Asignar Responsable --</option>
                                {userOptions.map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.full_name} ({u.role})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* 6. NOTES */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 flex items-center gap-2">
                        <AlertTriangle size={14}/> NOTAS / RECLAMOS
                    </label>
                    <textarea 
                        className="w-full h-20 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-white resize-none focus:border-emerald-500 outline-none placeholder:text-zinc-700"
                        placeholder="Observaciones importantes..."
                        value={form.notes}
                        onChange={(e) => handleChange('notes', e.target.value)}
                    />
                </div>

            </div>

            {/* FOOTER */}
            <div className="p-4 bg-black/40 border-t border-white/5 flex gap-3">
                <button 
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-400 font-bold hover:bg-zinc-700 transition-colors"
                >
                    CANCELAR
                </button>
                <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-[2] py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {loading ? "GUARDANDO..." : <><Save size={18}/> GUARDAR CAMBIOS</>}
                </button>
            </div>
        </div>
    );
}
