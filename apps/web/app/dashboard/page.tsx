'use client';
import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie 
} from 'recharts';
import { Users, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const [totals, setTotals] = useState<any>(null);
  const [voteIntent, setVoteIntent] = useState<any[]>([]);
  const [stationActivity, setStationActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Polling cada 30 segundos para "Tiempo Real"
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resTotals, resIntent, resActivity] = await Promise.all([
          api.get('/dashboard/totals'),
          api.get('/dashboard/vote-intent'),
          api.get('/dashboard/station-activity?limit=5')
        ]);
        setTotals(resTotals.data);
        setVoteIntent(resIntent.data);
        setStationActivity(resActivity.data);
      } catch (error) {
        console.error("Error cargando dashboard", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // 30s refresh
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="text-zinc-500 animate-pulse">Cargando Centro de Mando...</div>;

  // Colores para la gráfica de torta
  const PIE_COLORS: any = {
    SURE: '#059669',      // Verde Esmeralda
    PROBABLE: '#d97706',  // Ambar
    UNDECIDED: '#52525b', // Gris Zinc
    OPPOSITION: '#dc2626',// Rojo
    ABSTAIN: '#71717a'    // Gris claro
  };

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-zinc-500 text-xs font-bold tracking-widest uppercase">Panorama General</h2>
          <h1 className="text-3xl font-bold text-white">Tablero de Control</h1>
        </div>
        <div className="text-xs text-zinc-500 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          Actualización en tiempo real
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard 
          title="Padrón Total" 
          value={totals?.total_persons || 0} 
          icon={Users} 
          color="text-blue-400" 
        />
        <KpiCard 
          title="Votos Seguros" 
          value={totals?.sure_votes || 0} 
          subValue={`${totals?.total_persons ? ((totals.sure_votes/totals.total_persons)*100).toFixed(1) : 0}%`}
          icon={CheckCircle} 
          color="text-emerald-400" 
          border="border-emerald-900/50 bg-emerald-950/10"
        />
        <KpiCard 
          title="Ya Votaron (Participación)" 
          value={totals?.voted || 0} 
          subValue={`${totals?.total_persons ? ((totals.voted/totals.total_persons)*100).toFixed(1) : 0}%`}
          icon={TrendingUp} 
          color="text-white" 
        />
        <KpiCard 
          title="Faltan Votar" 
          value={totals?.missing || 0} 
          icon={AlertTriangle} 
          color="text-orange-400" 
        />
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* INTENCIÓN DE VOTO */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <h3 className="text-lg font-bold mb-6 text-zinc-300">Proyección Electoral</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={voteIntent}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {voteIntent.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[entry.label] || '#333'} stroke="rgba(0,0,0,0.5)" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', borderColor: '#333', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-center text-zinc-500">
            {voteIntent.map((v) => (
              <div key={v.label} className="flex flex-col items-center">
                <span className="w-3 h-3 rounded-full mb-1" style={{background: PIE_COLORS[v.label] || '#333'}}></span>
                {v.label}
              </div>
            ))}
          </div>
        </div>

        {/* ACTIVIDAD DE PUESTOS */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <h3 className="text-lg font-bold mb-6 text-zinc-300">Puestos Más Activos (Top 5)</h3>
          <div className="space-y-4">
            {stationActivity.map((station, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-black rounded-lg border border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-zinc-800 flex items-center justify-center font-bold text-zinc-400">
                    {idx + 1}
                  </div>
                  <span className="font-medium text-zinc-200">{station.station_name}</span>
                </div>
                <div className="text-right">
                  <span className="block text-xl font-bold text-white">{station.checkins}</span>
                  <span className="text-xs text-zinc-500 uppercase">Registros</span>
                </div>
              </div>
            ))}
            {stationActivity.length === 0 && (
              <div className="text-center py-10 text-zinc-600">Sin actividad reciente</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// Componente auxiliar para tarjetas
function KpiCard({ title, value, subValue, icon: Icon, color, border }: any) {
  return (
    <div className={`p-6 rounded-xl border ${border || 'border-zinc-800 bg-zinc-900'}`}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider">{title}</h3>
        <Icon className={color} size={20} />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold text-white tracking-tight">{value.toLocaleString()}</span>
        {subValue && <span className={`text-sm font-bold ${color}`}>{subValue}</span>}
      </div>
    </div>
  );
}