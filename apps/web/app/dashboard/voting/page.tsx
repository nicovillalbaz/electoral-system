"use client";

import { useEffect, useState, useCallback } from "react";
// Usamos safe api wrapper por si acaso, pero en apps/web/lib/api.ts debería estar exportado default
import safeApi from "../../../lib/api"; 
import { addToQueue } from "../../../lib/offline-queue";

import { Search, Siren, Truck, Zap } from "lucide-react";
import VoterRow from "./components/VoterRow";
import { useDebounce } from "use-debounce";

export default function DayDPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 500);
  const [voters, setVoters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [collisionAlert, setCollisionAlert] = useState<string | null>(null);

  // Incentive Modal State
  const [showIncentive, setShowIncentive] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<{id: string, name: string} | null>(null);

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

  // Anti-Fraud
  useEffect(() => {
    if (debouncedQuery.length >= 6) { 
        const found = voters.find(v => v.document_id === debouncedQuery || v.document_id.includes(debouncedQuery));
        
        if (found && found.status_day_d === 'VOTED') {
            setCollisionAlert(`¡ALERTA! La cédula ${found.document_id} YA VOTÓ.`);
        } else if (found && found.status_day_d === 'ON_TRANSIT') {
            setCollisionAlert(`Precaución: ${found.document_id} ya está EN TRÁNSITO.`);
        } else {
            setCollisionAlert(null);
             checkCrossCollision(debouncedQuery);
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

  const handleStatusChange = async (id: string, newStatus: string) => {
    // 1. Optimistic Update (Instant feedback)
    setVoters(prev => prev.map(v => v.id === id ? { ...v, status_day_d: newStatus } : v));
    
    // 2. Offline Queue (Guaranteed Delivery)
    addToQueue("/voting/status", 'POST', { personId: id, status: newStatus });
  };

  const openIncentive = (id: string, name: string) => {
      setSelectedPerson({ id, name });
      setShowIncentive(true);
  };

  const submitIncentive = async (type: string) => {
      if (!selectedPerson) return;
      
      // Incentives are sensitive, maybe not fully offline-optimistic, 
      // but for consistency we can queue it or require online. 
      // Requirement says "Access Control", usually strict. 
      // But user asked for "Persistence" generally. Let's try online first, fallback to queue?
      // For security, queueing incentives might be risky if token expires. 
      // But allow it for usability.
      
      addToQueue("/voting/incentive", 'POST', { 
          personId: selectedPerson.id, 
          type, 
          amount: 50000,
          notes: "Entregado en Sala de Guerra (Offline Sync)" 
      });
      
      setShowIncentive(false);
      // Optimistic visual update (optional, complex to add marker locally without re-fetch)
      // loadGrid(); // Won't work offline immediately.
      // We manually toggle the dot
      setVoters(prev => prev.map(v => v.id === selectedPerson.id ? { ...v, has_incentive: true } : v));
  }


  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header "War Room" */}
      <div className={`p-4 border-b transition-colors ${collisionAlert ? 'bg-red-600' : 'bg-slate-900'} text-white`}>
        <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-black tracking-tighter flex items-center gap-2">
                <Siren className={collisionAlert ? 'animate-bounce' : 'text-red-500'} /> 
                CONTROL DÍA D
            </h1>
            <div className="text-xs font-mono opacity-70">
                {voters.length} registros visibles
            </div>
        </div>

        <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
            <input 
                autoFocus
                placeholder="ESCANEAR CÉDULA O BUSCAR APELLIDO..."
                className="w-full bg-slate-800 border-none rounded-xl py-3 pl-10 pr-4 text-lg font-bold text-white placeholder:text-slate-500 focus:ring-2 focus:ring-red-500"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
        </div>
        
        {collisionAlert && (
            <div className="mt-2 bg-white/10 p-2 rounded text-center font-bold animate-pulse text-yellow-300">
                {collisionAlert}
            </div>
        )}
      </div>

      {/* The Grid */}
      <div className="flex-1 overflow-y-auto">
        {voters.map(v => (
            <VoterRow 
                key={v.id} 
                voter={v} 
                onStatusChange={handleStatusChange} 
                onIncentiveClick={openIncentive} 
            />
        ))}
        {voters.length === 0 && !loading && (
            <div className="p-10 text-center text-gray-400">
                Esperando búsqueda...
            </div>
        )}
      </div>

      {/* Incentive Modal (Quick Action) */}
      {showIncentive && selectedPerson && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
                  <h3 className="text-lg font-bold mb-4">Logística: {selectedPerson.name}</h3>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                      <button onClick={() => submitIncentive('viatico')} className="p-4 bg-blue-50 text-blue-700 rounded-xl font-bold hover:bg-blue-100">
                          Viático
                      </button>
                      <button onClick={() => submitIncentive('combustible')} className="p-4 bg-orange-50 text-orange-700 rounded-xl font-bold hover:bg-orange-100">
                          Combustible
                      </button>
                      <button onClick={() => submitIncentive('logistica')} className="p-4 bg-purple-50 text-purple-700 rounded-xl font-bold hover:bg-purple-100">
                          Logística
                      </button>
                      <button onClick={() => submitIncentive('snack')} className="p-4 bg-green-50 text-green-700 rounded-xl font-bold hover:bg-green-100">
                          Refrigerio
                      </button>
                  </div>
                  <button onClick={() => setShowIncentive(false)} className="w-full py-3 text-gray-500 font-medium">Cancelar</button>
              </div>
          </div>
      )}
    </div>
  );
}
