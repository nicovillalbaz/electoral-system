import { memo, useState, useRef, useEffect } from "react";
import { Check, User, MapPin, Truck, AlertTriangle, DollarSign, CheckCircle, Vote, X, Car } from "lucide-react";
import safeApi from "../../../../lib/api";
import { getApiErrorMessage } from "../../../../lib/api-error";
import MonetaryAmountSelector from "../../components/MonetaryAmountSelector";
import { toast } from "sonner";

type Voter = {
    id: string;
    document_id: string;
    first_name: string;
    last_name: string;
    voting_table_number: number;
    status_day_d: 'PENDING' | 'SEARCHING' | 'ON_TRANSIT' | 'ARRIVED' | 'CHECKED_IN' | 'VOTED';
    logistics_flag: boolean;
    has_incentive: boolean;
    campaign_status?: string;
    station_checkin_at?: string;
    assigned_station_id?: string;
    current_vote_intent?: string;
    needs_transport?: boolean;
    transport_status?: "PENDING" | "ASSIGNED" | "COMPLETED";
    has_financial_needs?: boolean;
    financial_needs_fulfilled?: boolean;
    financial_amount?: number;
    notes?: string;
    requests?: any[];
};

type Props = {
    voter: Voter;
    onUpdate: (updatedVoter: any) => void;
    stations: any[]; // List of Available PCs
};

const statusColors: any = {
    PENDING: "bg-zinc-900 text-zinc-500",
    SEARCHING: "bg-orange-900/30 text-orange-400 animate-pulse border border-orange-800/50",
    ON_TRANSIT: "bg-yellow-900/30 text-yellow-500 border border-yellow-800/50",
    ARRIVED: "bg-blue-900/30 text-blue-400 border border-blue-800/50",
    CHECKED_IN: "bg-purple-900/30 text-purple-400 border border-purple-800/50",
    VOTED: "bg-emerald-900/30 text-emerald-500 border border-emerald-800/50"
};

const statusLabels: any = {
    PENDING: "PENDIENTE",
    SEARCHING: "BUSCANDO",
    ON_TRANSIT: "EN CAMINO",
    ARRIVED: "LLEGÓ",
    CHECKED_IN: "EN MESA",
    VOTED: "YA VOTÓ"
};

const VoterRow = memo(({ voter, onUpdate, stations }: Props) => {
    const [openPopover, setOpenPopover] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Temp State for Inputs
    const [tempStationId, setTempStationId] = useState("");
    const [tempFinanceAmount, setTempFinanceAmount] = useState("");
    const [tempNotes, setTempNotes] = useState("");
    const [tempRequests, setTempRequests] = useState<any[]>([]);
    const [tempNeedsTransport, setTempNeedsTransport] = useState(false);
    const [tempTransportStatus, setTempTransportStatus] = useState<"PENDING" | "ASSIGNED" | "COMPLETED">("PENDING");
    const [newRequestDetail, setNewRequestDetail] = useState("");
    const [newRequestType, setNewRequestType] = useState("LOGISTICS");
    const [newRequestAssignee, setNewRequestAssignee] = useState("");
    
    // Users for Logistics
    const [userOptions, setUserOptions] = useState<any[]>([]);
    const [usersLoaded, setUsersLoaded] = useState(false);

    // Click Outside Handler
    const rowRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (rowRef.current && !rowRef.current.contains(event.target as Node)) {
                setOpenPopover(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Initialize temp state when opening a popover
    useEffect(() => {
        if (!openPopover) return;

        if (openPopover === 'PC') {
            setTempStationId(voter.assigned_station_id || "");
        }
        if (openPopover === 'FINANCE') {
            const currentAmount = voter.financial_amount ? Number(voter.financial_amount) : 0;
            setTempFinanceAmount(currentAmount ? String(currentAmount) : "");
        }
        if (openPopover === 'NOTES') {
            setTempNotes(voter.notes || "");
        }
        if (openPopover === 'TRANSPORT') {
            setTempNeedsTransport(!!voter.needs_transport);
            setTempTransportStatus((voter.transport_status || "PENDING") as "PENDING" | "ASSIGNED" | "COMPLETED");
        }
        if (openPopover === 'LOGISTICS') {
            setTempRequests(Array.isArray(voter.requests) ? voter.requests : []);
            setNewRequestType("LOGISTICS");
            setNewRequestDetail("");
            setNewRequestAssignee("");
            
            // Load users if not loaded
            if (!usersLoaded) {
                safeApi.get('/users?limit=100').then(res => {
                    const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
                    setUserOptions(data);
                    setUsersLoaded(true);
                }).catch(() => {});
            }
        }
    }, [openPopover, voter, usersLoaded]);


    const handleSave = async () => {
        if (loading) return;
        setLoading(true);
        const patch: any = {};

        try {
            if (openPopover === 'NOTES') {
                patch.notes = tempNotes;
            }

            if (openPopover === 'LOGISTICS') {
                patch.requests = tempRequests;
            }

            if (Object.keys(patch).length === 0) {
                setOpenPopover(null);
                return;
            }

            await safeApi.patch(`/persons/${voter.id}`, patch);

            onUpdate({ ...voter, ...patch }); // Optimistic
            toast.success("Cambios guardados.");
            setOpenPopover(null);

        } catch (e) {
            console.error(e);
            toast.error(getApiErrorMessage(e, "Error al guardar cambios. Intente nuevamente."));
        } finally {
            setLoading(false);
        }
    };

    const handleMarkPC = async () => {
        if (loading) return;
        const alreadyPassed = voter.campaign_status === 'VISITED_PC' || !!voter.station_checkin_at || voter.status_day_d === 'CHECKED_IN';
        if (alreadyPassed) {
            setOpenPopover(null);
            return;
        }
        if (voter.status_day_d === 'VOTED') {
            toast.warning("Esta persona ya figura como VOTO. No se puede marcar paso por PC.");
            return;
        }
        if (!tempStationId) {
            toast.warning("Asigna un PC antes de registrar el paso.");
            return;
        }
        setLoading(true);
        try {
            const patch: any = { assignedStationId: tempStationId, campaignStatus: 'VISITED_PC' };
            await safeApi.patch(`/persons/${voter.id}`, patch);
            await safeApi.post('/stations/checkin', { personId: voter.id, stationId: tempStationId });
            onUpdate({ 
                ...voter, 
                assigned_station_id: tempStationId, 
                campaign_status: 'VISITED_PC',
                status_day_d: 'CHECKED_IN'
            });
            toast.success("Paso por PC registrado.");
            setOpenPopover(null);
        } catch (e) {
            console.error(e);
            toast.error(getApiErrorMessage(e, "Error al registrar paso por PC."));
        } finally {
            setLoading(false);
        }
    };

    const handleFinanceSave = async () => {
        if (loading) return;
        if (voter.financial_needs_fulfilled) {
            setOpenPopover(null);
            return;
        }
        const amount = Number(tempFinanceAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
            toast.warning("Ingrese un monto válido.");
            return;
        }
        setLoading(true);
        try {
            await safeApi.post('/voting/financial', { personId: voter.id, amount });
            onUpdate({ 
                ...voter, 
                has_financial_needs: true, 
                financial_amount: amount, 
                financial_needs_fulfilled: true 
            });
            toast.success("Viático registrado.");
            setOpenPopover(null);
        } catch (e) {
            console.error(e);
            toast.error(getApiErrorMessage(e, "Error al registrar viático."));
        } finally {
            setLoading(false);
        }
    };

    const handleTransportSave = async () => {
        if (loading) return;

        const patch: any = {};
        if (!voter.needs_transport) {
            if (!tempNeedsTransport) {
                setOpenPopover(null);
                return;
            }
            patch.needsTransport = true;
            patch.transportStatus = tempTransportStatus;
        } else if (voter.transport_status !== tempTransportStatus) {
            patch.transportStatus = tempTransportStatus;
        } else {
            setOpenPopover(null);
            return;
        }

        setLoading(true);
        try {
            await safeApi.patch(`/persons/${voter.id}`, patch);
            onUpdate({
                ...voter,
                needs_transport: patch.needsTransport ?? voter.needs_transport,
                transport_status: patch.transportStatus ?? voter.transport_status,
            });
            toast.success("Transporte actualizado.");
            setOpenPopover(null);
        } catch (e) {
            console.error(e);
            toast.error(getApiErrorMessage(e, "Error al guardar transporte."));
        } finally {
            setLoading(false);
        }
    };

    const addRequest = () => {
        const val = newRequestDetail.trim();
        if (!val) return;
        const selectedUser = userOptions.find(u => u.id === newRequestAssignee);
        const newReq = {
            type: newRequestType,
            detail: val,
            subtypes: [val],
            assignedUserId: newRequestAssignee || null,
            responsible: selectedUser ? selectedUser.full_name : undefined,
            status: 'PENDING'
        };
        setTempRequests((prev) => [...prev, newReq]);
        setNewRequestDetail("");
        setNewRequestAssignee("");
    };

    const handleVoteStatusChange = async (newStatus: string) => {
        setLoading(true);
        try {
            await safeApi.post('/voting/status', { personId: voter.id, status: newStatus });
            onUpdate({ ...voter, status_day_d: newStatus });
            toast.success("Estado de voto actualizado.");
            setOpenPopover(null);
        } catch (e) {
             console.error(e);
             toast.error(getApiErrorMessage(e, "Error al actualizar estado."));
        } finally {
            setLoading(false);
        }
    };
    
    const handleQuickIntent = async (val: string) => {
        setLoading(true);
        try {
            await safeApi.patch(`/persons/${voter.id}`, { currentVoteIntent: val });
            onUpdate({ ...voter, current_vote_intent: val });
            setOpenPopover(null);
        } catch(e) { toast.error(getApiErrorMessage(e, "Error al actualizar intención de voto.")); setLoading(false); }
    };

    const togglePopover = (name: string, e: React.MouseEvent) => {
        e.stopPropagation(); 
        setOpenPopover(openPopover === name ? null : name);
    };

    // --- RENDER HELPERS ---
    const getPCStatus = () => {
        const hasPC = !!voter.assigned_station_id;
        const passed = voter.campaign_status === 'VISITED_PC' || !!voter.station_checkin_at || voter.status_day_d === 'CHECKED_IN';
        return { hasPC, passed };
    };
    const pcStat = getPCStatus();
    const financeLocked = !!voter.financial_needs_fulfilled;
    const financeRequested = !!voter.has_financial_needs;
    const hasLogistics = (Array.isArray(voter.requests) && voter.requests.length > 0) || !!voter.logistics_flag;
    const hasTransport = !!voter.needs_transport;

    return (
        <div ref={rowRef} className={`relative flex items-center p-3 border-b border-white/5 hover:bg-white/5 transition-colors group ${voter.status_day_d === 'VOTED' ? 'bg-emerald-900/10' : ''}`}>
            
            {/* 1. Main Click Area (Name) */}
            <div className="flex-1 flex items-center min-w-0 mr-4">
                 
                 {/* Status Badge (Static) */}
                 <div className={`w-24 flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded border border-transparent mr-4 text-center transition-colors ${statusColors[voter.status_day_d] || 'bg-zinc-900'}`}>
                    {statusLabels[voter.status_day_d] || voter.status_day_d}
                </div>

                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-200 truncate group-hover:text-emerald-400 transition-colors">
                            {voter.last_name}, {voter.first_name}
                        </span>
                    </div>
                    <div className="text-xs text-zinc-500 font-mono flex gap-2">
                        <span>CI: {voter.document_id}</span>
                        <span className="text-zinc-700">•</span>
                        <span>Mesa {voter.voting_table_number}</span>
                    </div>
                </div>
            </div>

            {/* 2. Inline Action Icons */}
            <div className="flex items-center gap-1">
                
                {/* A. STATUS ICON (NEW) */}
                <div className="relative">
                    <button 
                        onClick={(e) => togglePopover('STATUS', e)}
                        className={`p-2 rounded-lg transition-colors ${voter.status_day_d === 'VOTED' ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-500 hover:bg-white/10'}`}
                        title="Cambiar Estado de Voto"
                    >
                        <Vote size={18} />
                    </button>
                    {openPopover === 'STATUS' && (
                        <div className="absolute right-0 top-full mt-2 w-40 bg-zinc-900 border border-zinc-700 shadow-2xl rounded-xl z-50 p-1 flex flex-col gap-1 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
                             {['PENDING', 'ON_TRANSIT', 'CHECKED_IN', 'VOTED'].map(s => (
                                 <button
                                    key={s}
                                    onClick={(e) => { e.stopPropagation(); handleVoteStatusChange(s); }}
                                    className={`text-[10px] font-bold px-3 py-2 rounded text-left hover:bg-white/10 ${voter.status_day_d === s ? 'text-white bg-white/5' : 'text-zinc-400'}`}
                                 >
                                     {statusLabels[s]}
                                 </button>
                             ))}
                        </div>
                    )}
                </div>

                <div className="w-px h-6 bg-white/10 mx-1"></div>

                {/* B. PC / STATION */}
                <div className="relative">
                    <button 
                        onClick={(e) => togglePopover('PC', e)}
                        className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${pcStat.passed ? 'bg-emerald-500/20 text-emerald-400' : (pcStat.hasPC ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:bg-white/10')}`}
                        title={pcStat.hasPC ? "PC Asignado" : "Sin PC"}
                    >
                        <MapPin size={16} />
                        {pcStat.passed && <CheckCircle size={10} className="absolute top-1 right-1" />}
                    </button>
                    {openPopover === 'PC' && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-900 border border-zinc-700 shadow-2xl rounded-xl z-50 p-3 flex flex-col gap-3 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
                            <label className="text-xs font-bold text-zinc-500">ASIGNAR PC</label>
                            <select 
                                disabled={pcStat.passed}
                                className={`w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white ${pcStat.passed ? 'opacity-60 cursor-not-allowed' : ''}`}
                                value={tempStationId}
                                onChange={(e) => setTempStationId(e.target.value)}
                            >
                                <option value="">-- Sin Asignar --</option>
                                {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            {pcStat.passed ? (
                                <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded p-2 text-center">
                                    YA PASO POR PC
                                </div>
                            ) : (
                                <>
                                    {!tempStationId && (
                                        <div className="text-[11px] text-zinc-500">
                                            Asigna un PC para marcar el paso.
                                        </div>
                                    )}
                                    <button 
                                        onClick={handleMarkPC}
                                        disabled={loading || !tempStationId}
                                        className="w-full bg-white text-black font-bold text-xs py-2 rounded hover:bg-zinc-200 flex justify-center items-center gap-2 disabled:opacity-60"
                                    >
                                        {loading ? '...' : 'MARCAR PASO POR PC'} <Check size={14} />
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* C. TRANSPORT */}
                <div className="relative">
                    <button
                        onClick={(e) => togglePopover('TRANSPORT', e)}
                        className={`p-2 rounded-lg transition-colors ${
                            hasTransport
                                ? (voter.transport_status === "COMPLETED" ? "text-emerald-400 bg-emerald-500/10" : "text-cyan-400 bg-cyan-500/10")
                                : "text-zinc-600 hover:bg-white/10"
                        }`}
                        title="Transporte"
                    >
                        <Car size={16} />
                    </button>
                    {openPopover === 'TRANSPORT' && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-900 border border-zinc-700 shadow-2xl rounded-xl z-50 p-3 flex flex-col gap-3 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
                            <div className="text-xs font-bold text-zinc-400">TRANSPORTE</div>

                            {!voter.needs_transport && !tempNeedsTransport ? (
                                <>
                                    <div className="text-xs text-zinc-500">Necesita transporte?</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setOpenPopover(null)}
                                            className="bg-zinc-800 text-zinc-300 font-bold text-xs py-2 rounded hover:bg-zinc-700"
                                        >
                                            NO
                                        </button>
                                        <button
                                            onClick={() => {
                                                setTempNeedsTransport(true);
                                                setTempTransportStatus((voter.transport_status || "PENDING") as "PENDING" | "ASSIGNED" | "COMPLETED");
                                            }}
                                            className="bg-white text-black font-bold text-xs py-2 rounded hover:bg-zinc-200"
                                        >
                                            SI
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <label className="text-xs font-bold text-zinc-500">ESTADO</label>
                                    <select
                                        className="bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white"
                                        value={tempTransportStatus}
                                        onChange={(e) => setTempTransportStatus(e.target.value as "PENDING" | "ASSIGNED" | "COMPLETED")}
                                    >
                                        <option value="PENDING">PENDIENTE</option>
                                        <option value="ASSIGNED">ASIGNADO</option>
                                        <option value="COMPLETED">COMPLETADO</option>
                                    </select>
                                    <button
                                        onClick={handleTransportSave}
                                        disabled={loading}
                                        className="w-full bg-white text-black font-bold text-xs py-2 rounded hover:bg-zinc-200 flex justify-center items-center gap-2 disabled:opacity-60"
                                    >
                                        {loading ? '...' : 'GUARDAR'} <Check size={14} />
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* D. VOTE INTENT */}
                <div className="relative">
                    <button 
                         onClick={(e) => togglePopover('INTENT', e)}
                         className={`p-2 rounded-lg transition-colors ${
                             voter.current_vote_intent === 'SURE' ? 'text-emerald-500 bg-emerald-500/10' : 
                             voter.current_vote_intent === 'PROBABLE' ? 'text-yellow-500' :
                             (voter.current_vote_intent === 'OPPOSITION_INTERNAL' || voter.current_vote_intent === 'OPPOSITION_PARTY') ? 'text-red-500' : 'text-zinc-600'
                         } hover:bg-white/10`}
                    >
                        <User size={16} />
                    </button>
                     {openPopover === 'INTENT' && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-700 shadow-2xl rounded-xl z-50 p-2 grid gap-1 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
                            {[
                                { val: 'SURE', label: 'VOTO SEGURO 🟢' },
                                { val: 'PROBABLE', label: 'PROBABLE 🟡' },
                                { val: 'UNDECIDED', label: 'INDECISO ⚪' },
                                { val: 'OPPOSITION_INTERNAL', label: 'OPOSICIÓN (INTERNA) 🔴' },
                                { val: 'OPPOSITION_PARTY', label: 'OPOSICIÓN (OTRO PARTIDO) 🔴' },
                            ].map(opt => (
                                <button
                                    key={opt.val}
                                    onClick={() => handleQuickIntent(opt.val)}
                                    className={`text-left text-xs font-bold p-2 rounded hover:bg-white/10 ${voter.current_vote_intent === opt.val ? 'bg-white/5 text-white' : 'text-zinc-400'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* E. FINANCE */}
                <div className="relative">
                    <button 
                        onClick={(e) => togglePopover('FINANCE', e)}
                        className={`p-2 rounded-lg transition-colors ${
                            financeLocked ? 'text-emerald-400 bg-emerald-500/10' :
                            financeRequested ? 'text-yellow-400 bg-yellow-500/10' :
                            'text-zinc-600 hover:bg-white/10'
                        }`}
                    >
                        <DollarSign size={16} />
                    </button>
                    {openPopover === 'FINANCE' && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-900 border border-zinc-700 shadow-2xl rounded-xl z-50 p-3 flex flex-col gap-3 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
                             <div className="text-xs font-bold text-zinc-400">SOLICITUD VIATICO</div>
                             {financeLocked ? (
                                 <div className="space-y-2">
                                     <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded p-2 text-center">
                                         APORTE ENTREGADO
                                     </div>
                                     <div>
                                         <label className="block text-[10px] font-bold text-zinc-500 mb-1">MONTO ENTREGADO (Gs.)</label>
                                         <input 
                                             type="number" 
                                             className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white opacity-80"
                                             value={tempFinanceAmount}
                                             readOnly
                                             disabled
                                         />
                                     </div>
                                 </div>
                             ) : (
                                 <>
                                     <label className="text-xs font-bold text-zinc-400">MONTO (Gs.)</label>
                                     <MonetaryAmountSelector
                                         value={tempFinanceAmount}
                                         onChange={setTempFinanceAmount}
                                         selectClassName="bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white"
                                         inputClassName="bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white"
                                         summaryClassName="text-xs text-zinc-400 bg-zinc-950 border border-zinc-800 rounded p-2 font-mono"
                                         manualPlaceholder="Monto"
                                     />
                                     <button 
                                        onClick={handleFinanceSave}
                                        disabled={loading}
                                        className="w-full bg-white text-black font-bold text-xs py-2 rounded hover:bg-zinc-200 flex justify-center items-center gap-2 disabled:opacity-60"
                                    >
                                        {loading ? '...' : 'REGISTRAR Y MARCAR ENTREGADO'} <Check size={14} />
                                    </button>
                                 </>
                             )}
                        </div>
                    )}
                </div>

                {/* F. LOGISTICS */}
                <div className="relative">
                    <button 
                        onClick={(e) => togglePopover('LOGISTICS', e)}
                        className={`p-2 rounded-lg transition-colors ${hasLogistics ? 'text-blue-400 bg-blue-500/10' : 'text-zinc-600 hover:bg-white/10'}`}
                    >
                        <Truck size={16} />
                    </button>
                    {openPopover === 'LOGISTICS' && (
                        <div className="absolute right-0 top-full mt-2 w-72 bg-zinc-900 border border-zinc-700 shadow-2xl rounded-xl z-50 p-3 flex flex-col gap-3 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
                             <label className="text-xs font-bold text-zinc-500">PEDIDOS / LOGISTICA</label>
                             <div className="flex gap-2">
                                 <select 
                                     className="bg-black border border-zinc-700 rounded px-2 py-1 text-xs text-white outline-none"
                                     value={newRequestType}
                                     onChange={e => setNewRequestType(e.target.value)}
                                 >
                                     <option value="LOGISTICS">Logistica</option>
                                     <option value="MEDICINE">Medicamentos</option>
                                     <option value="OTHER">Otro</option>
                                 </select>
                                 <select 
                                     className="flex-1 bg-black border border-zinc-700 rounded px-2 py-1 text-xs text-white outline-none"
                                     value={newRequestAssignee}
                                     onChange={e => setNewRequestAssignee(e.target.value)}
                                 >
                                     <option value="">-- Asignar Responsable (Opcional) --</option>
                                     {userOptions.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>)}
                                 </select>
                             </div>
                             <div className="flex gap-2">
                                 <input 
                                     className="flex-1 bg-black border border-zinc-700 rounded px-2 py-1 text-sm text-white outline-none placeholder-zinc-600"
                                     placeholder="Detalle (Ej: Combustible, Remedios...)"
                                     value={newRequestDetail}
                                     onChange={(e) => setNewRequestDetail(e.target.value)}
                                     onKeyDown={(e) => {
                                         if (e.key === "Enter") {
                                             e.preventDefault();
                                             addRequest();
                                         }
                                     }}
                                 />
                                 <button 
                                     type="button" 
                                     className="text-xs font-bold bg-zinc-800 px-3 rounded hover:bg-zinc-700 text-white"
                                     onClick={addRequest}
                                 >
                                     AGREGAR
                                 </button>
                             </div>
                             <div className="max-h-40 overflow-y-auto space-y-1">
                                 {tempRequests.length === 0 && <p className="text-xs text-zinc-600 italic text-center py-2">- Sin pedidos registrados -</p>}
                                 {tempRequests.map((req, idx) => {
                                     const isString = typeof req === 'string';
                                     const detail = isString ? req : (req.detail || (Array.isArray(req.subtypes) ? req.subtypes.join(", ") : ""));
                                     const type = isString ? 'LOGISTICS' : req.type;
                                     const assigneeId = isString ? null : req.assignedUserId;
                                     const assigneeName = assigneeId ? userOptions.find(u => u.id === assigneeId)?.full_name : (isString ? null : req.responsible);

                                     return (
                                         <div key={idx} className="flex justify-between items-center text-sm bg-zinc-950/50 px-2 py-1.5 rounded border border-zinc-800/50">
                                             <div className="flex flex-col leading-tight">
                                                 <span className="text-zinc-300">
                                                     <span className="text-[10px] bg-zinc-800 px-1 rounded mr-2 text-zinc-400">{type}</span>
                                                     {detail}
                                                 </span>
                                                 {assigneeName && <span className="text-[10px] text-blue-400 pl-1">Resp: {assigneeName}</span>}
                                             </div>
                                             <button type="button" onClick={() => setTempRequests(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 hover:bg-red-950/30 p-1 rounded"><X size={12} /></button>
                                         </div>
                                     );
                                 })}
                             </div>
                            <button 
                                onClick={handleSave}
                                disabled={loading}
                                className="w-full bg-white text-black font-bold text-xs py-2 rounded hover:bg-zinc-200 flex justify-center items-center gap-2"
                            >
                                {loading ? '...' : 'GUARDAR'} <Check size={14} />
                            </button>
                        </div>
                    )}
                </div>

                {/* G. NOTES */}
                 <div className="relative">
                    <button 
                        onClick={(e) => togglePopover('NOTES', e)}
                        className={`p-2 rounded-lg transition-colors ${voter.notes ? 'text-orange-400' : 'text-zinc-700 hover:bg-white/10'}`}
                    >
                        <AlertTriangle size={16} />
                    </button>
                    {openPopover === 'NOTES' && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-900 border border-zinc-700 shadow-2xl rounded-xl z-50 p-3 flex flex-col gap-3 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
                             <label className="text-xs font-bold text-zinc-500">NOTAS / OBSERVACIONES</label>
                             <textarea 
                                className="bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-white h-20 resize-none"
                                value={tempNotes}
                                onChange={(e) => setTempNotes(e.target.value)}
                             />
                             <button 
                                onClick={handleSave}
                                disabled={loading}
                                className="w-full bg-white text-black font-bold text-xs py-2 rounded hover:bg-zinc-200 flex justify-center items-center gap-2"
                            >
                                {loading ? '...' : 'GUARDAR'} <Check size={14} />
                            </button>
                        </div>
                    )}
                </div>

            </div>
            
        </div>
    );
});

VoterRow.displayName = "VoterRow";

export default VoterRow;



