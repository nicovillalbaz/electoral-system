"use client";

import { useEffect, useState } from "react";
import api from "../../../../lib/api";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import { AlertTriangle, TrendingDown, TrendingUp, Users } from "lucide-react";

export default function CrisisDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Mock data for initial render until we have a real endpoint for "stats"
  // In a real implementation this would come from an aggregation endpoint
  const mockStats = {
     totalSure: 1500,
     votedSure: 850,
     missingSure: 650,
     hourlyAlerts: [
        { hour: "10:00", message: "PC Central: Bajo rendimiento (30% vs 45% esperado)", severity: "HIGH" },
        { hour: "14:00", message: "Escuela Perú: Falta transporte", severity: "MEDIUM" },
     ]
  };

  useEffect(() => {
    // Simulate fetch
    setTimeout(() => {
        setStats(mockStats);
        setLoading(false);
    }, 1000);
  }, []);

  if (loading) return <div className="p-10">Cargando Tablero de Crisis...</div>;

  const data = [
    { name: 'Ya Votaron', value: stats.votedSure },
    { name: 'Faltan', value: stats.missingSure },
  ];

  const COLORS = ['#22c55e', '#ef4444'];

  const participation = Math.round((stats.votedSure / stats.totalSure) * 100);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-bold tracking-tight text-gray-900">Tablero de Crisis (Día D)</h1>
           <p className="text-gray-500">Monitoreo en tiempo real del Voto Seguro.</p>
        </div>
        <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-full border border-red-200 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-600"></span>
            <span className="text-sm font-bold">EN VIVO</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI Principal */}
        <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col items-center justify-center">
            <h3 className="text-gray-500 font-medium mb-2">Participación Voto Seguro</h3>
            <div className="text-5xl font-extrabold text-blue-900 mb-2">{participation}%</div>
            <p className="text-sm text-gray-400">Objetivo: 85%</p>
        </div>

        {/* Gráfico Torta */}
        <div className="bg-white p-6 rounded-xl border shadow-sm col-span-1 md:col-span-2 flex flex-col md:flex-row items-center">
            <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-4 p-4 border-l">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <div>
                        <div className="text-2xl font-bold text-gray-900">{stats.votedSure}</div>
                        <div className="text-xs text-gray-500">YA VOTARON</div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div>
                        <div className="text-2xl font-bold text-gray-900">{stats.missingSure}</div>
                        <div className="text-xs text-gray-500">FALTAN (CRÍTICO)</div>
                    </div>
                </div>
                 <div className="pt-4 border-t">
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg">
                        Ver Lista de Faltantes
                    </button>
                 </div>
            </div>
        </div>
      </div>

      {/* Alertas */}
      <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-4 border-b bg-gray-50 rounded-t-xl flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                 <AlertTriangle className="w-4 h-4 text-orange-500" />
                 Alertas de Rendimiento
              </h3>
              <span className="text-xs text-gray-500">Actualizado hace 1 min</span>
          </div>
          <div className="divide-y">
            {stats.hourlyAlerts.map((alert: any, i: number) => (
                <div key={i} className="p-4 flex items-start gap-4 hover:bg-gray-50">
                    <span className="font-mono text-sm text-gray-500 bg-gray-100 px-2 rounded">{alert.hour}</span>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                    </div>
                    {alert.severity === 'HIGH' && (
                        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">CRÍTICO</span>
                    )}
                     {alert.severity === 'MEDIUM' && (
                        <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">ATENCIÓN</span>
                    )}
                </div>
            ))}
          </div>
      </div>
    </div>
  );
}
