"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import safeApi from "../../../../lib/api"; // Adjusted path
import { Users, Truck, AlertTriangle, CheckCircle, Search, Plus, Trash2, Fuel, Sandwich, Bus } from "lucide-react";

// --- TYPES ---
type DashboardData = {
    collaborators: any[];
    stats: {
        total_assigned: number;
        total_visited_pc: number;
        total_voted: number;
    };
    voters: {
        data: any[];
        total: number;
        page: number;
        limit: number;
    };
};

export default function StationDashboardPage() {
    const params = useParams();
    const stationId = params.id as string;
    
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await safeApi.get(`/stations/${stationId}/dashboard`, { params: { page, search, limit: 50 } });
            setData(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (stationId) fetchData();
    }, [stationId, page, search]);

    // --- ACTIONS ---
    const handleRemoveCollaborator = async (personId: string) => {
        if (!confirm("Remove staff?")) return;
        try {
            await safeApi.delete(`/stations/${stationId}/collaborators/${personId}`);
            fetchData();
        } catch (e) {
            alert("Error removing");
        }
    };

    if (!data && loading) return <div className="p-8 text-white">Loading Dashboard...</div>;
    if (!data) return <div className="p-8 text-white">Error loading dashboard.</div>;

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto text-zinc-100">
            {/* HEADER & STATS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                    <h1 className="text-xl font-bold text-white mb-1">Station Dashboard</h1>
                    <p className="text-xs text-zinc-500 font-mono">{stationId}</p>
                </div>
                <StatCard label="Total Asignados" value={data.stats.total_assigned} icon={<Users className="text-blue-500" />} />
                <StatCard label="Pasaron por PC" value={data.stats.total_visited_pc} icon={<CheckCircle className="text-emerald-500" />} />
                <StatCard label="Votos Confirmados" value={data.stats.total_voted} icon={<CheckCircle className="text-purple-500" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* LEFT COL: TEAM MANAGEMENT */}
                <div className="col-span-1 bg-zinc-900 border border-zinc-800 rounded-xl p-4 h-fit">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold text-lg flex items-center gap-2">
                            <Users size={18} /> Equipo PC
                        </h2>
                    </div>

                    <div className="space-y-2">
                        {data.collaborators.length === 0 && <div className="text-zinc-600 text-xs italic">Sin equipo asignado.</div>}
                        {data.collaborators.map((c: any) => (
                            <div key={c.id} className="flex justify-between items-center p-2 bg-zinc-950/50 rounded border border-zinc-800/50">
                                <div>
                                    <div className="font-bold text-sm text-zinc-200">{c.first_name} {c.last_name}</div>
                                    <div className="text-[10px] text-zinc-500 font-mono">{c.role}</div>
                                </div>
                                {/* Read Only - No Remove */}
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT COL: VOTER AUDIT GRID - FULL WIDTH */}
                <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col min-h-[600px] shadow-2xl">
                    <div className="p-4 border-b border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-zinc-950/30">
                        <div className="flex items-center gap-2">
                            <Truck size={18} className="text-zinc-400" />
                            <div>
                                <h2 className="font-bold text-lg text-white">Auditoría General</h2>
                                <p className="text-xs text-zinc-500">Monitoreo de Votantes asignados a este PC</p>
                            </div>
                        </div>
                        <div className="relative flex-1 max-w-md w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                            <input 
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                placeholder="Buscar por Nombre, CI..."
                                className="w-full bg-zinc-950 border border-zinc-700/50 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:border-blue-500/50 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-zinc-950 text-zinc-500 font-medium sticky top-0 z-10 uppercase tracking-wider">
                                <tr>
                                    <th className="p-3 border-b border-zinc-800">Persona</th>
                                    <th className="p-3 border-b border-zinc-800 text-center">Intención</th>
                                    <th className="p-3 border-b border-zinc-800 text-center">PC Estado</th>
                                    <th className="p-3 border-b border-zinc-800">Logística (Resp)</th>
                                    <th className="p-3 border-b border-zinc-800">Viático</th>
                                    <th className="p-3 border-b border-zinc-800 text-center">Estado Voto</th>
                                    <th className="p-3 border-b border-zinc-800 w-[150px]">Notas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {data.voters.data.map((v: any) => (
                                    <tr key={v.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-3">
                                            <div className="font-bold text-zinc-200">{v.last_name}, {v.first_name}</div>
                                            <div className="text-[10px] text-zinc-500 font-mono">CI: {v.document_id}</div>
                                            <div className="text-[10px] text-zinc-600">Mesa {v.voting_table_number}</div>
                                        </td>
                                        <td className="p-3 text-center">
                                           <IntentionBadge intent={v.current_vote_intent} />
                                        </td>
                                        <td className="p-3 text-center">
                                            <StatusBadge status={v.campaign_status} />
                                        </td>
                                        <td className="p-3">
                                            {v.logistics.has_needs ? (
                                                <div className="space-y-1">
                                                    <div className="flex gap-1 flex-wrap">
                                                        {v.logistics.has_fuel && <BadgeIcon icon={<Fuel size={10} />} color="blue" label="Comb" />}
                                                        {v.logistics.has_transport && <BadgeIcon icon={<Bus size={10} />} color="purple" label="Trans" />}
                                                        {v.logistics.has_snack && <BadgeIcon icon={<Sandwich size={10} />} color="orange" label="Ref" />}
                                                        {v.logistics.has_accompaniment && <BadgeIcon icon={<Users size={10} />} color="indigo" label="Acomp" />}
                                                    </div>
                                                    {v.logistics.responsible && (
                                                        <div className="text-[10px] text-zinc-400 flex items-center gap-1">
                                                           <span className="text-zinc-600">Resp:</span> {v.logistics.responsible}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-zinc-700">-</span>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            {v.financial.has_needs ? (
                                                <div className="flex flex-col">
                                                    <span className="text-emerald-400 font-bold">Gs. {v.financial.amount?.toLocaleString()}</span>
                                                    <span className={`text-[9px] ${v.financial.fulfilled ? 'text-blue-400' : 'text-orange-400'}`}>
                                                        {v.financial.fulfilled ? 'ENTREGADO' : 'PENDIENTE'}
                                                    </span>
                                                </div>
                                            ) : <span className="text-zinc-700">-</span>}
                                        </td>
                                        <td className="p-3 text-center">
                                            <div className="flex justify-center">
                                                <VoteStatusBadge status={v.status_day_d} voted={v.has_voted} />
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            {v.notes ? (
                                                <div className="text-[10px] text-zinc-400 italic line-clamp-2 max-w-[150px]" title={v.notes}>
                                                    "{v.notes}"
                                                </div>
                                            ) : (
                                                <span className="text-zinc-800 text-[10px]">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINATION */}
                    <div className="p-3 border-t border-zinc-800 flex justify-between items-center text-xs text-zinc-500 bg-zinc-950/30 rounded-b-xl">
                        <div>
                            Total: <span className="text-zinc-300 font-bold">{data.voters.total}</span> | Página {page}
                        </div>
                        <div className="flex gap-2">
                            <button 
                                disabled={page === 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className="px-3 py-1 bg-zinc-800 rounded disabled:opacity-50 hover:bg-zinc-700 text-zinc-300 transition-colors"
                            >
                                Anterior
                            </button>
                            <button 
                                disabled={page * 50 >= data.voters.total}
                                onClick={() => setPage(p => p + 1)}
                                className="px-3 py-1 bg-zinc-800 rounded disabled:opacity-50 hover:bg-zinc-700 text-zinc-300 transition-colors"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

function StatCard({ label, value, icon }: any) {
    return (
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
            <div>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1">{label}</p>
                <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
            </div>
            <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800/50">
                {icon}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'VISITED_PC') return <span className="bg-emerald-900/20 text-emerald-400 border border-emerald-900/50 px-2 py-0.5 rounded text-[9px] font-bold shadow-[0_0_8px_rgba(16,185,129,0.2)]">PASÓ POR PC</span>;
    if (status === 'PENDING') return <span className="text-zinc-700 bg-zinc-900/50 border border-zinc-800 px-2 py-0.5 rounded text-[9px]">PENDIENTE</span>;
    return <span className="text-zinc-500 text-[9px]">{status}</span>;
}

function IntentionBadge({ intent }: { intent: string }) {
    if (intent === 'SURE') return <span className="text-emerald-500 text-lg" title="Seguro">🟢</span>;
    if (intent === 'PROBABLE') return <span className="text-yellow-500 text-lg" title="Probable">🟡</span>;
    if (intent === 'UNDECIDED') return <span className="text-zinc-500 text-lg" title="Indeciso">⚪</span>;
    if (intent === 'OPPOSITION') return <span className="text-red-500 text-lg" title="Oposición">🔴</span>;
    return <span className="text-zinc-700 text-lg">-</span>;
}

function VoteStatusBadge({ status, voted }: { status: string, voted: boolean }) {
    if (status === 'VOTED' || voted) return <div className="flex flex-col items-center"><CheckCircle size={14} className="text-emerald-500 mb-1" /><span className="text-[9px] text-emerald-600 font-bold">VOTÓ</span></div>;
    const colors: any = {
        PENDING: "text-zinc-600",
        SEARCHING: "text-orange-500",
        ON_TRANSIT: "text-yellow-500",
        ARRIVED: "text-blue-500",
        CHECKED_IN: "text-purple-500"
    };
    return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border border-transparent ${colors[status] || 'text-zinc-500'}`}>{status}</span>;
}

function BadgeIcon({ icon, color, label }: any) {
    const colorClasses: any = {
        blue: "bg-blue-900/30 text-blue-400 border-blue-900/50",
        purple: "bg-purple-900/30 text-purple-400 border-purple-900/50",
        orange: "bg-orange-900/30 text-orange-400 border-orange-900/50",
        indigo: "bg-indigo-900/30 text-indigo-400 border-indigo-900/50",
    }
    return (
        <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] ${colorClasses[color] || 'bg-zinc-800'}`} title={label}>
            {icon} {label}
        </span>
    )
}
