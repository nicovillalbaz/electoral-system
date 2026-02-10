"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, TrendingUp, Users, CheckCircle2 } from "lucide-react";

export default function AuditSelectorPage() {
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchStations();
  }, []);

  const fetchStations = async () => {
    try {
      const res = await fetch("/api/stations");
      if (res.ok) {
        const data = await res.json();
        setStations(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                Torre de Control (Modo Auditoría)
            </h1>
            <p className="text-zinc-400">Selecciona un Puesto de Comando para auditar su operación y equipo.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stations.map((pc) => {
                const assigned = pc.assigned_count || 0;
                const voted = pc.voted_count || 0;
                const progress = assigned > 0 ? (voted / assigned) * 100 : 0;
                
                // Color logic for thermometer
                let barColor = "bg-blue-600";
                if (progress > 50) barColor = "bg-emerald-500";
                if (progress > 80) barColor = "bg-green-400";

                return (
                    <button
                        key={pc.id}
                        onClick={() => router.push(`/dashboard/audit/${pc.id}`)}
                        className="group relative overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 transition-all text-left p-6 hover:shadow-2xl hover:shadow-blue-900/10"
                    >
                        {/* Glow Effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="relative z-10 space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                                        {pc.name}
                                    </h3>
                                    <p className="text-sm text-zinc-500 mt-1">
                                        {pc.address || "Sin dirección"}
                                    </p>
                                </div>
                                <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-blue-900/30 transition-colors">
                                    <TrendingUp className="h-5 w-5 text-zinc-400 group-hover:text-blue-400" />
                                </div>
                            </div>

                            {/* Thermometer */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-semibold text-zinc-400">
                                    <span>AVANCE DE VOTOS</span>
                                    <span className={progress > 50 ? "text-emerald-400" : "text-blue-400"}>
                                        {progress.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full ${barColor} transition-all duration-1000`} 
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-zinc-500">
                                    <span>{voted} Votaron</span>
                                    <span>Meta: {assigned}</span>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="pt-4 border-t border-zinc-800 flex gap-4 text-xs text-zinc-500">
                                <div className="flex items-center gap-1">
                                   <Users className="h-3 w-3" />
                                   Staff: --
                                </div>
                                <div className="flex items-center gap-1">
                                   <CheckCircle2 className="h-3 w-3" />
                                   Check-ins: --
                                </div>
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>

      </div>
    </div>
  );
}