import { memo, useState, useRef, useEffect } from "react";
import { Check, User, MapPin, Truck, AlertTriangle, DollarSign, ChevronDown, CheckCircle, X, Flag, Vote, Save } from "lucide-react";
import safeApi from "../../../../lib/api";

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
    has_financial_needs?: boolean;
    financial_amount?: number;
    notes?: string;
    requests?: any[];
};

type Props = {
    voter: Voter;
    onSelect: () => void;
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

const VoterRow = memo(({ voter, onSelect, onUpdate, stations }: Props) => {
    const [openPopover, setOpenPopover] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Temp State for Inputs
    const [tempStationId, setTempStationId] = useState("");
    const [tempPassedPC, setTempPassedPC] = useState(false);
    
    const [tempFinance, setTempFinance] = useState({ active: false, amount: 0 });
    const [tempNotes, setTempNotes] = useState("");
    const [tempLogistics, setTempLogistics] = useState<{subtypes: string[], responsible: string}>({ subtypes: [], responsible: "" });
    
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
            setTempPassedPC(voter.campaign_status === 'VISITED_PC' || !!voter.station_checkin_at);
        }
        if (openPopover === 'FINANCE') {
            setTempFinance({ 
                active: voter.has_financial_needs || false, 
                amount: voter.financial_amount || 0 
            });
        }
        if (openPopover === 'NOTES') {
            setTempNotes(voter.notes || "");
        }
        if (openPopover === 'LOGISTICS') {
            const requests = voter.requests || [];
            const logReq = requests.find((r:any) => r.type === 'LOGISTICS');
            setTempLogistics({
                subtypes: logReq?.subtypes || [],
                responsible: logReq?.assignedUserId || logReq?.responsible || "" // Prefer ID
            });
            
            // Load users if not loaded
            if (!usersLoaded) {
                safeApi.get('/users?limit=100').then(res => {
                    setUserOptions(res.data.data || []);
                    setUsersLoaded(true);
                }).catch(() => {});
            }
        }
    }, [openPopover, voter, usersLoaded]);


    const handleSave = async () => {
        setLoading(true);
        const patch: any = {};
        let shouldClose = true;

        try {
            if (openPopover === 'PC') {
                patch.assignedStationId = tempStationId;
                if (tempPassedPC) {
                    patch.campaignStatus = 'VISITED_PC';
                } else if (!tempPassedPC && voter.campaign_status === 'VISITED_PC') {
                    patch.campaignStatus = 'PENDING'; // Or whatever default
                }
            }

            if (openPopover === 'FINANCE') {
                patch.hasFinancialNeeds = tempFinance.active;
                patch.financialAmount = tempFinance.amount;
            }

            if (openPopover === 'NOTES') {
                patch.notes = tempNotes;
            }

            if (openPopover === 'LOGISTICS') {
                const requests = voter.requests ? [...voter.requests] : [];
                // Remove existing logistics
                const otherRequests = requests.filter((r:any) => r.type !== 'LOGISTICS');
                
                if (tempLogistics.subtypes.length > 0) {
                    const selectedUser = userOptions.find(u => u.id === tempLogistics.responsible);
                    otherRequests.push({ 
                        type: 'LOGISTICS', 
                        subtypes: tempLogistics.subtypes, 
                        responsible: selectedUser ? selectedUser.full_name : tempLogistics.responsible,
                        assignedUserId: selectedUser ? selectedUser.id : undefined // <--- Add ID
                    });
                }
                patch.requests = otherRequests;
                // Update flag as well for visual consistency if backend doesn't do it automatically immediately
                // patch.logistics_flag = tempLogistics.subtypes.length > 0; 
            }

            await safeApi.patch(`/persons/${voter.id}`, patch);

            // Manual trigger for checkin if needed
            if (patch.campaignStatus === 'VISITED_PC' && patch.assignedStationId) {
                await safeApi.post('/stations/checkin', { personId: voter.id, stationId: patch.assignedStationId });
            }

            onUpdate({ ...voter, ...patch }); // Optimistic
            setOpenPopover(null);

        } catch (e) {
            console.error(e);
            alert("Error al guardar cambios. Intente nuevamente.");
            shouldClose = false;
        } finally {
            setLoading(false);
        }
    };

    const handleVoteStatusChange = async (newStatus: string) => {
        setLoading(true);
        try {
            await safeApi.post('/voting/status', { personId: voter.id, status: newStatus });
            onUpdate({ ...voter, status_day_d: newStatus });
            setOpenPopover(null);
        } catch (e) {
             console.error(e);
             alert("Error al actualizar estado.");
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
        } catch(e) { alert("Error"); setLoading(false); }
    };

    const togglePopover = (name: string, e: React.MouseEvent) => {
        e.stopPropagation(); 
        setOpenPopover(openPopover === name ? null : name);
    };

    // --- RENDER HELPERS ---
    const getPCStatus = () => {
        const hasPC = !!voter.assigned_station_id;
        const passed = voter.campaign_status === 'VISITED_PC' || !!voter.station_checkin_at;
        return { hasPC, passed };
    };
    const pcStat = getPCStatus();

    return (
        <div ref={rowRef} className={`relative flex items-center p-3 border-b border-white/5 hover:bg-white/5 transition-colors group ${voter.status_day_d === 'VOTED' ? 'bg-emerald-900/10' : ''}`}>
            
            {/* 1. Main Click Area (Name) */}
            <div onClick={onSelect} className="flex-1 flex items-center cursor-pointer min-w-0 mr-4">
                 
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
                                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white"
                                value={tempStationId}
                                onChange={(e) => setTempStationId(e.target.value)}
                            >
                                <option value="">-- Sin Asignar --</option>
                                {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <div className="flex justify-between items-center bg-zinc-950 p-2 rounded border border-zinc-800">
                                <span className="text-xs font-bold text-zinc-400">YA PASÓ POR PC?</span>
                                <button 
                                    onClick={() => setTempPassedPC(!tempPassedPC)}
                                    className={`px-3 py-1 rounded text-xs font-bold transition-colors ${tempPassedPC ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}
                                >
                                    {tempPassedPC ? 'SÍ, PASÓ' : 'NO'}
                                </button>
                            </div>
                            <button 
                                onClick={handleSave}
                                disabled={loading}
                                className="w-full bg-white text-black font-bold text-xs py-2 rounded hover:bg-zinc-200 flex justify-center items-center gap-2"
                            >
                                {loading ? '...' : 'GUARDAR CAMBIOS'} <Check size={14} />
                            </button>
                        </div>
                    )}
                </div>

                {/* C. VOTE INTENT */}
                <div className="relative">
                    <button 
                         onClick={(e) => togglePopover('INTENT', e)}
                         className={`p-2 rounded-lg transition-colors ${
                             voter.current_vote_intent === 'SURE' ? 'text-emerald-500 bg-emerald-500/10' : 
                             voter.current_vote_intent === 'PROBABLE' ? 'text-yellow-500' :
                             voter.current_vote_intent === 'OPPOSITION' ? 'text-red-500' : 'text-zinc-600'
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
                                { val: 'OPPOSITION', label: 'OPOSICIÓN 🔴' },
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

                {/* D. FINANCE */}
                <div className="relative">
                    <button 
                        onClick={(e) => togglePopover('FINANCE', e)}
                        className={`p-2 rounded-lg transition-colors ${voter.has_financial_needs ? 'text-green-400 bg-green-500/10' : 'text-zinc-600 hover:bg-white/10'}`}
                    >
                        <DollarSign size={16} />
                    </button>
                    {openPopover === 'FINANCE' && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-900 border border-zinc-700 shadow-2xl rounded-xl z-50 p-3 flex flex-col gap-3 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
                             <div className="flex justify-between">
                                <span className="text-xs font-bold text-zinc-400">Solicita Viático?</span>
                                <input 
                                    type="checkbox" 
                                    checked={tempFinance.active} 
                                    onChange={(e) => setTempFinance({ ...tempFinance, active: e.target.checked })}
                                    className="accent-emerald-500"
                                />
                             </div>
                             {tempFinance.active && (
                                 <input 
                                     type="number" 
                                     placeholder="Monto Gs."
                                     className="bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white"
                                     value={tempFinance.amount}
                                     onChange={(e) => setTempFinance({ ...tempFinance, amount: Number(e.target.value) })}
                                 />
                             )}
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

                {/* E. LOGISTICS */}
                <div className="relative">
                    <button 
                        onClick={(e) => togglePopover('LOGISTICS', e)}
                        className={`p-2 rounded-lg transition-colors ${voter.logistics_flag ? 'text-blue-400 bg-blue-500/10' : 'text-zinc-600 hover:bg-white/10'}`}
                    >
                        <Truck size={16} />
                    </button>
                     {openPopover === 'LOGISTICS' && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-900 border border-zinc-700 shadow-2xl rounded-xl z-50 p-3 flex flex-col gap-3 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
                             <label className="text-xs font-bold text-zinc-500">LOGÍSTICA REQUERIDA</label>
                             <div className="grid grid-cols-2 gap-2 mb-2">
                                {[
                                    { id: 'FUEL', label: 'COMBUSTIBLE' },
                                    { id: 'TRANSPORT', label: 'TRANSPORTE' },
                                    { id: 'SNACK', label: 'REFRIGERIO' },
                                    { id: 'ACCOMPANIMENT', label: 'ACOMPAÑAMIENTO' },
                                ].map(t => {
                                    const isActive = tempLogistics.subtypes.includes(t.id);
                                    
                                    return (
                                        <button 
                                            key={t.id}
                                            onClick={() => {
                                                const newSubtypes = isActive 
                                                    ? tempLogistics.subtypes.filter(x => x !== t.id) 
                                                    : [...tempLogistics.subtypes, t.id];
                                                setTempLogistics({ ...tempLogistics, subtypes: newSubtypes });
                                            }}
                                            className={`text-[10px] font-bold p-2 rounded border ${isActive ? 'bg-blue-900/40 border-blue-500 text-blue-300' : 'border-zinc-800 text-zinc-500'}`}
                                        >
                                            {t.label}
                                        </button>
                                    )
                                })}
                             </div>
                             
                              {/* Responsible Field */}
                              {(tempLogistics.subtypes.length > 0) && (
                                 <select 
                                     className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-white placeholder:text-zinc-600 focus:border-blue-500 outline-none"
                                     value={tempLogistics.responsible}
                                     onChange={(e) => setTempLogistics({ ...tempLogistics, responsible: e.target.value })}
                                 >
                                     <option value="">-- Asignar Responsable --</option>
                                     {userOptions.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                                 </select>
                              )}

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

                {/* F. NOTES */}
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
