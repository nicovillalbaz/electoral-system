"use client";

import { useEffect, useState, useCallback } from "react";
// Usamos safe api wrapper por si acaso, pero en apps/web/lib/api.ts debería estar exportado default
import safeApi from "../../../lib/api"; 

import { Search, Siren } from "lucide-react";
import VoterRow from "./components/VoterRow";
import CrisisModal from "../components/CrisisModal";
import { useDebounce } from "use-debounce";

export default function DayDPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 500);
  const [voters, setVoters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [collisionAlert, setCollisionAlert] = useState<string | null>(null);
  
  // Stations for Inline Edit
  const [stations, setStations] = useState<any[]>([]);
  useEffect(() => {
      safeApi.get('/stations').then(res => setStations(res.data)).catch(() => {});
  }, []);


  const loadGrid = useCallback(async () => {
    setLoading(true);
    try {
      // Endpoint consolidado: /voting/grid
      const { data } = await safeApi.get(`/voting/grid?limit=50&query=${debouncedQuery}`);
      setVoters(data);
    } catch (e) {
      console.error(e);
      // En modo offline total, podríamos cargar de cache si implementáramos cache de GET
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    loadGrid();
  }, [loadGrid]);

  // When query changes, clear selection? Maybe.
  useEffect(() => {
     if (query.length < 3) {
         setVoters([]);
     }
  }, [query]);

  // Anti-Fraud
  useEffect(() => {
    if (debouncedQuery.length >= 6) { 
        const found = voters.find(v => v.document_id === debouncedQuery || v.document_id.includes(debouncedQuery));
        
        if (found) {
            // Auto Select if exact match?
            // if (found.document_id === debouncedQuery) setSelectedVoter(found); 
            
            if (found.status_day_d === 'VOTED') {
                setCollisionAlert(`¡ALERTA! La cédula ${found.document_id} YA VOTÓ.`);
            } else if (found.status_day_d === 'ON_TRANSIT') {
                setCollisionAlert(`Precaución: ${found.document_id} ya está EN TRÁNSITO.`);
            } else {
                setCollisionAlert(null);
                checkCrossCollision(debouncedQuery);
            }
        }
    } else {
        setCollisionAlert(null);
    }
  }, [debouncedQuery, voters]);

  const checkCrossCollision = async (ci: string) => {
      try {
          // Endpoint consolidado: /voting/check-collision
          const { data } = await safeApi.get(`/voting/check-collision/${ci}`);
          if (data.active) {
               setCollisionAlert(`CONFLICTO GLOBAL: Esta cédula está siendo gestionada por ${data.details.operator_name} hace ${(new Date().getTime() - new Date(data.details.recorded_at).getTime()) / 60000 | 0} min.`);
          }
      } catch (e) {
          // Silent fail
      }
  }

  const [showCrisis, setShowCrisis] = useState(false);

    return (
        <div className="h-screen flex flex-col bg-zinc-950 overflow-hidden">
            {/* Header "War Room" */}
            <div className={`p-4 border-b border-white/5 transition-colors ${collisionAlert ? 'bg-red-900/50' : 'bg-zinc-900/50'} text-white shrink-0`}>
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-xl font-black tracking-tighter flex items-center gap-2">
                        <Siren className={collisionAlert ? 'animate-bounce' : 'text-emerald-500'} /> 
                        CONTROL DÍA D
                    </h1>
                     <div className="flex items-center gap-4">
                         <button 
                            onClick={() => setShowCrisis(true)}
                            className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase animate-pulse flex items-center gap-2"
                         >
                             <Siren size={16}/> Reportar Incidente
                         </button>
                        <div className="text-xs font-mono opacity-70">
                            {voters.length} registros
                        </div>
                     </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-3 text-zinc-500 w-5 h-5" />
                    <input 
                        autoFocus
                        placeholder="ESCANEAR CÉDULA O BUSCAR APELLIDO..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-lg font-bold text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
                
                {collisionAlert && (
                    <div className="mt-2 bg-red-950/50 border border-red-500/30 p-2 rounded text-center font-bold animate-pulse text-red-200">
                        {collisionAlert}
                    </div>
                )}
            </div>

            {/* Main Content Split */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Voter Operations */}
                <div className="flex-1 overflow-y-auto bg-zinc-950 p-4">
                     
                        <div className="max-w-4xl mx-auto space-y-4">
                            {voters.length > 0 && (
                                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2">Resultados ({voters.length})</h3>
                            )}
                            
                            {voters.map(v => (
                                <div key={v.id}> 
                                    <VoterRow 
                                        voter={v} 
                                        onUpdate={(updated) => {
                                            if(updated) {
                                                setVoters(prev => prev.map(p => p.id === updated.id ? {...p, ...updated} : p));
                                            }
                                        }}
                                        stations={stations}
                                    />
                                </div>
                            ))}

                            {voters.length === 0 && !loading && (
                                <div className="flex flex-col items-center justify-center p-20 text-zinc-800 opacity-50">
                                    <Search size={64} className="mb-4 text-zinc-900"/>
                                    <p className="text-xl font-black">INGRESA CEDULA O APELLIDO</p>
                                    <p className="text-sm">Usa los botones de la derecha para acciones rapidas</p>
                                </div>
                            )}
                        </div>
                </div>


            </div>

            {/* Crisis Modal */}
            {showCrisis && <CrisisModal onClose={() => setShowCrisis(false)} />}
        </div>
    );
}
