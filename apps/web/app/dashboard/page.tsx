'use client';
import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { ROLE_ICONS, ROLE_COLORS, ROLE_LABELS } from './components/teamRoleStyles';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import { Users, CheckCircle, AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react';

export default function DashboardPage() {
  const [totals, setTotals] = useState<any>(null);
  const [voteIntent, setVoteIntent] = useState<any[]>([]);
  const [stationActivity, setStationActivity] = useState<any[]>([]);
  const [teamStats, setTeamStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Para forzar re-render visual si hace falta

  // Polling inteligente cada 30 segundos
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const fetchData = async () => {
      try {
        const [resTotals, resIntent, resActivity, resTeam] = await Promise.all([
          api.get('/dashboard/totals'),
          api.get('/dashboard/vote-intent'),
          api.get('/dashboard/station-activity?limit=5'),
          api.get('/dashboard/team-stats')
        ]);
        setTotals(resTotals.data);
        setVoteIntent(resIntent.data);
        setStationActivity(resActivity.data);
        setTeamStats(resTeam.data);
        setError(null);
      } catch (error) {
        console.error("Error cargando dashboard", error);
        setError("Error cargando datos. Intenta nuevamente.");
      } finally {
        setLoading(false);
      }
    };

    const startPolling = async () => {
      await fetchData();
      interval = setInterval(fetchData, 30000);
    };

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        stopPolling();
        startPolling();
      } else {
        stopPolling();
      }
    };

    handleVisibility();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refreshKey]);

  // COLORES TÁCTICOS (Coinciden con tu DB V3.1)
  const PIE_COLORS: any = {
    SURE: '#059669',              // Verde Esmeralda (Voto Duro)
    PROBABLE: '#d97706',          // Ámbar (A convencer)
    UNDECIDED: '#71717a',         // Gris (Indeciso)
    OPPOSITION_INTERNAL: '#8b5cf6', // Violeta (Interna Partido - Recuperable)
    OPPOSITION_PARTY: '#dc2626',    // Rojo (Oposición Real - Difícil)
    WONT_VOTE: '#3f3f46'            // Gris Oscuro (No vota/Fallecido)
  };

  const LABELS_MAP: any = {
    SURE: 'Seguro',
    PROBABLE: 'Probable',
    UNDECIDED: 'Indeciso',
    OPPOSITION_INTERNAL: 'Disidencia (ANR)',
    OPPOSITION_PARTY: 'Oposición (PLRA/Otros)',
    WONT_VOTE: 'No Vota'
  };

  const normalizeRole = (role: string) => (role || 'OTRO').toUpperCase().replace(/\s+/g, '_');
  const rolePriority = [
    'CHOFER',
    'PUNTERO',
    'JEFE_PC',
    'JEFE_DE_PC',
    'JEFE',
    'JEFE_CAMPAÑA',
    'COORDINADOR',
    'MESA_TESTIGO',
    'LOGISTICA',
    'SEGURIDAD',
    'CAJA',
    'OTRO'
  ];

  const roleCounts = teamStats.reduce((acc: Record<string, number>, item: any) => {
    const role = normalizeRole(item.role);
    acc[role] = (acc[role] || 0) + Number(item.count || 0);
    return acc;
  }, {});

  const normalizedTeamStats = Object.entries(roleCounts).map(([role, count]) => ({
    role,
    count
  })).sort((a, b) => {
    const aIdx = rolePriority.indexOf(a.role);
    const bIdx = rolePriority.indexOf(b.role);
    if (aIdx != bIdx) {
      return (aIdx == -1 ? rolePriority.length : aIdx) - (bIdx == -1 ? rolePriority.length : bIdx);
    }
    return Number(b.count) - Number(a.count);
  });

  const formatRoleLabel = (role: string) => {
    const label = ROLE_LABELS[role];
    if (label) return label;
    return role
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const teamRolePills = normalizedTeamStats.map((stat) => {
    const Icon = ROLE_ICONS[stat.role] || ROLE_ICONS.DEFAULT;
    const colorClass = ROLE_COLORS[stat.role] || ROLE_COLORS.DEFAULT;
    return {
      role: stat.role,
      label: formatRoleLabel(stat.role),
      count: stat.count,
      Icon,
      colorClass
    };
  });

  if (loading) return (
    <div className="flex h-full items-center justify-center space-x-2 animate-pulse">
      <div className="w-4 h-4 bg-red-600 rounded-full"></div>
      <div className="text-zinc-500 font-mono text-sm">Cargando Centro de Mando...</div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* HEADER CON REFRESH MANUAL */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-red-500 text-xs font-bold tracking-widest uppercase mb-1">Inteligencia Electoral</h2>
          <h1 className="text-3xl font-bold text-white tracking-tight">Tablero de Control</h1>
        </div>
        
        <div className="flex items-center gap-4">
           <button 
             onClick={() => setRefreshKey(k => k + 1)}
             className="text-xs text-zinc-500 hover:text-white flex items-center gap-2 transition-colors"
           >
             <RefreshCw size={12} /> Actualizar
           </button>
           <div className="text-xs text-zinc-500 flex items-center gap-2 bg-zinc-900/50 px-3 py-1 rounded-full border border-zinc-800">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono">LIVE</span>
          </div>
        </div>
      </div>
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard 
          title="Padrón Objetivo" 
          value={totals?.total_persons || 0} 
          icon={Users} 
          color="text-blue-500" 
        />
        <KpiCard 
          title="Voto Seguro" 
          value={totals?.sure_votes || 0} 
          subValue={`${totals?.total_persons ? ((totals.sure_votes/totals.total_persons)*100).toFixed(1) : 0}%`}
          icon={CheckCircle} 
          color="text-emerald-500" 
          border="border-emerald-500/20 bg-emerald-500/5" // Destacado sutil
        />
        <KpiCard 
          title="Participación Real" 
          value={totals?.voted || 0} 
          subValue={`${totals?.total_persons ? ((totals.voted/totals.total_persons)*100).toFixed(1) : 0}%`}
          icon={TrendingUp} 
          color="text-white" 
        />
        <KpiCard 
          title="Pendientes" 
          value={totals?.missing || 0} 
          icon={AlertTriangle} 
          color="text-amber-500" 
        />
        <TeamStatsCard items={teamRolePills} />
      </div>

      {/* SECCIÓN PRINCIPAL: GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[400px]">
        
        {/* GRÁFICO 1: PROYECCIÓN ELECTORAL */}
        <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-2xl backdrop-blur-sm flex flex-col">
          <h3 className="text-sm font-semibold text-zinc-400 mb-6 uppercase tracking-wider">Proyección de Votos</h3>
          
          <div className="flex-1 min-h-0 flex items-center">
            <div className="h-full w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={voteIntent}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={60} // Donut chart es más moderno
                    outerRadius={80}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {voteIntent.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[entry.label] || '#333'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: number) => [`${value} personas`, 'Cantidad']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Leyenda Personalizada a la derecha */}
            <div className="w-1/2 pl-4 space-y-3 overflow-y-auto max-h-[250px] custom-scrollbar">
              {voteIntent.map((v) => (
                <div key={v.label} className="flex items-center justify-between text-sm group">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full ring-2 ring-offset-1 ring-offset-zinc-900 ring-transparent group-hover:ring-current transition-all" 
                         style={{backgroundColor: PIE_COLORS[v.label] || '#333', color: PIE_COLORS[v.label]}}></div>
                    <span className="text-zinc-300">{LABELS_MAP[v.label] || v.label}</span>
                  </div>
                  <span className="font-mono text-zinc-500">{v.value}</span>
                </div>
              ))}
              {voteIntent.length === 0 && <p className="text-zinc-600 text-sm">Sin datos aún</p>}
            </div>
          </div>
        </div>

        {/* GRÁFICO 2: TOP PUESTOS DE COMANDO */}
        <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-2xl backdrop-blur-sm flex flex-col">
          <h3 className="text-sm font-semibold text-zinc-400 mb-6 uppercase tracking-wider">Top Actividad en Puestos</h3>
          
          <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar">
            {stationActivity.map((station, idx) => (
              <div key={idx} className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                <div className="flex items-center gap-4">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-500'}`}>
                    {idx + 1}
                  </div>
                  <div>
                    <span className="block font-medium text-zinc-200 group-hover:text-white transition-colors">
                      {station.station_name}
                    </span>
                    <div className="w-24 h-1 bg-zinc-800 mt-1 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full" 
                        style={{ width: `${(station.checkins / (stationActivity[0]?.checkins || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-lg font-bold text-white font-mono">{station.checkins}</span>
                  <span className="text-[10px] text-zinc-600 uppercase tracking-wide">Check-ins</span>
                </div>
              </div>
            ))}
             {stationActivity.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                <AlertTriangle size={32} className="mb-2 opacity-20" />
                <p>Sin actividad reciente en PCs</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// Componente KpiCard Refinado
function KpiCard({ title, value, subValue, icon: Icon, color, border }: any) {
  return (
    <div className={`p-6 rounded-2xl border transition-all hover:translate-y-[-2px] duration-300 ${border || 'border-white/5 bg-zinc-900/40 hover:bg-zinc-900/60'}`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">{title}</h3>
        <div className={`p-2 rounded-lg bg-black/20 ${color}`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="mt-2">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-white tracking-tighter">{value.toLocaleString()}</span>
        </div>
        {subValue && (
          <div className="mt-1 flex items-center gap-1">
             <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${color.replace('text-', 'bg-')}/10 ${color}`}>
               {subValue}
             </span>
             <span className="text-[10px] text-zinc-600">del total</span>
          </div>
        )}
      </div>
    </div>
  );
}

function TeamStatsCard({ items }: any) {
  return (
    <div className="md:col-span-4 p-6 rounded-2xl border border-white/5 bg-zinc-900/40 hover:bg-zinc-900/60 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Equipo Operativo</h3>
          <p className="text-xs text-zinc-600 mt-1">Distribucion por rol</p>
        </div>
        <div className="p-2 rounded-lg bg-black/20 text-blue-400">
          <Users size={16} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item: any) => (
          <span
            key={item.role}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold max-w-full whitespace-normal ${item.colorClass}`}
          >
            <item.Icon className="h-3.5 w-3.5" />
            {item.label}: {item.count}
          </span>
        ))}
        {items.length === 0 && (
          <span className="text-zinc-600 text-sm">Sin datos de equipo.</span>
        )}
      </div>
    </div>
  );
}
