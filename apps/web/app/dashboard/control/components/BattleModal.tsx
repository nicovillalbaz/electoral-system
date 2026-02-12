"use client";

import { useState } from "react";
import { format } from "date-fns";
import { X, Check, Car, DollarSign, MapPin, Loader2 } from "lucide-react";

interface Person {
  id: string;
  first_name: string;
  last_name: string;
  document_id: string;
  address: string;
  has_voted: boolean;
  needs_transport: boolean;
  has_financial_needs: boolean;
  assigned_station_id?: string;
  // Add other fields as needed
}

interface BattleModalProps {
  person: Person;
  onClose: () => void;
  onUpdate: () => void; // Trigger refresh
}

interface User {
    id: string;
    full_name: string;
    role: string;
}

export default function BattleModal({ person, onClose, onUpdate }: BattleModalProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [assignedUserId, setAssignedUserId] = useState<string>("");

  // Load Users for Assignment
  useState(() => {
      fetch('/api/users?limit=100').then(res => res.json()).then(data => {
          setUsers(data.data || []);
      }).catch(err => console.error("Failed to load users", err));
  });

  const [transportAddress, setTransportAddress] = useState(person.address || "");
  const [showTransportInput, setShowTransportInput] = useState(false);
  const [showFinancialConfirm, setShowFinancialConfirm] = useState(false);

  const handleMarkVoted = async () => {
    if (confirm("¿Confirmar que YA VOTÓ?")) {
        setLoading("voted");
        try {
            const res = await fetch("/api/voting/mark-voted", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ personId: person.id })
            });
            if (!res.ok) throw new Error("Error marking voted");
            onUpdate();
            onClose();
        } catch (e) {
            alert("Error al marcar voto");
            console.error(e);
        } finally {
            setLoading(null);
        }
    }
  };

  const handleRequestTransport = async () => {
    setLoading("transport");
    try {
        const res = await fetch("/api/voting/transport", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                personId: person.id,
                pickupAddress: transportAddress,
                assignedUserId: assignedUserId || undefined // <--- Pass assignee
            })
        });
        if (!res.ok) throw new Error("Error requesting transport");
        alert("Solicitud de Transporte Creada (Tarea URGENT)");
        onUpdate();
        setShowTransportInput(false);
    } catch (e) {
        alert("Error al solicitar transporte");
        console.error(e);
    } finally {
        setLoading(null);
    }
  };

  const handleRequestFinancial = async () => {
    setLoading("financial");
    try {
        const res = await fetch("/api/voting/financial", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                personId: person.id,
                assignedUserId: assignedUserId || undefined // <--- Pass assignee
            })
        });
        if (!res.ok) throw new Error("Error requesting financial");
        alert("Solicitud Financiera Creada (Tarea URGENT)");
        onUpdate();
        setShowFinancialConfirm(false);
    } catch (e) {
        alert("Error al solicitar viático");
        console.error(e);
    } finally {
        setLoading(null);
    }
  };

  const handlePassPC = async () => {
      setLoading("pc");
      try {
          if (!person.assigned_station_id) {
              alert("Asigná un PC antes de registrar el paso.");
              return;
          }
          const res = await fetch("/api/stations/checkin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                personId: person.id,
                stationId: person.assigned_station_id
            })
          });
          if (!res.ok) throw new Error("Error registering checkin");
          onUpdate();
          onClose(); // Close on check-in?
      } catch (e) {
          alert("Error al registrar paso por PC");
      } finally {
          setLoading(null);
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-2xl max-w-[95vw] overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex justify-between items-start bg-zinc-950">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight">
              {person.first_name} {person.last_name}
            </h2>
            <div className="flex items-center gap-3 mt-2 text-zinc-400">
              <span className="bg-zinc-800 px-2 py-1 rounded text-sm font-mono text-zinc-300 border border-zinc-700">
                {person.document_id}
              </span>
              <span className="flex items-center gap-1 text-sm">
                <MapPin className="w-3 h-3" />
                {person.address || "Sin dirección"}
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Status Indicators */}
        <div className="px-6 py-3 bg-zinc-900/50 flex gap-2 border-b border-zinc-800">
             {person.has_voted && (
                 <span className="px-3 py-1 bg-green-500/10 text-green-500 text-xs font-bold uppercase rounded-full border border-green-500/20">
                     YA VOTÓ
                 </span>
             )}
             {person.needs_transport && (
                 <span className="px-3 py-1 bg-blue-500/10 text-blue-500 text-xs font-bold uppercase rounded-full border border-blue-500/20">
                     Transporte Solicitado
                 </span>
             )}
              {person.has_financial_needs && (
                 <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 text-xs font-bold uppercase rounded-full border border-yellow-500/20">
                     Viático Solicitado
                 </span>
             )}
        </div>

        {/* Actions Grid */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* YA VOTÓ */}
          <button
            onClick={handleMarkVoted}
            disabled={person.has_voted || !!loading}
            className={`col-span-2 md:col-span-1 h-32 flex flex-col items-center justify-center gap-3 rounded-xl border transition-all
              ${person.has_voted 
                ? "bg-zinc-900 border-zinc-800 opacity-50 cursor-not-allowed text-zinc-500" 
                : "bg-gradient-to-br from-green-900/50 to-emerald-900/20 border-green-500/30 hover:border-green-400 hover:shadow-[0_0_20px_rgba(34,197,94,0.2)] text-green-400"
              }`}
          >
            {loading === "voted" ? <Loader2 className="w-8 h-8 animate-spin" /> : <Check className="w-10 h-10" />}
            <span className="text-xl font-black uppercase tracking-wider">
                {person.has_voted ? "Voto Registrado" : "YA VOTÓ"}
            </span>
          </button>

          {/* PASÓ POR PC */}
          <button
            onClick={handlePassPC}
            disabled={!!loading}
            className="col-span-2 md:col-span-1 h-32 flex flex-col items-center justify-center gap-3 rounded-xl border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-500 text-zinc-100 transition-all"
          >
             {loading === "pc" ? <Loader2 className="w-8 h-8 animate-spin" /> : <MapPin className="w-10 h-10 text-purple-400" />}
            <span className="text-xl font-black uppercase tracking-wider">Pasó por PC</span>
          </button>

          {/* SOLICITA TRANSPORTE */}
          {!showTransportInput ? (
               <button
               onClick={() => setShowTransportInput(true)}
               disabled={person.needs_transport || !!loading}
               className="h-28 flex flex-col items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-950/20 hover:bg-blue-900/30 hover:border-blue-400 text-blue-400 transition-all"
             >
               <Car className="w-8 h-8" />
               <span className="font-bold uppercase">Solicita Transporte</span>
             </button>
          ) : (
             <div className="h-28 flex flex-col gap-2 p-2 rounded-xl border border-blue-500/50 bg-blue-900/10">
                 <input 
                    autoFocus
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
                    placeholder="Dirección de recogida..."
                    value={transportAddress}
                    onChange={(e) => setTransportAddress(e.target.value)}
                 />
                  <select 
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
                      value={assignedUserId}
                      onChange={(e) => setAssignedUserId(e.target.value)}
                  >
                      <option value="">-- Asignar Chofer/Responsable (Opcional) --</option>
                      {users.map(u => (
                          <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                      ))}
                  </select>
                 <div className="flex gap-2 h-full">
                     <button onClick={() => setShowTransportInput(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 rounded text-xs text-white">Cancelar</button>
                     <button 
                        onClick={handleRequestTransport}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 rounded text-xs text-white font-bold flex items-center justify-center gap-1"
                     >
                         {loading === "transport" ? <Loader2 className="w-3 h-3 animate-spin"/> : "Confirmar"}
                     </button>
                 </div>
             </div>
          )}

          {/* SOLICITA VIÁTICO */}
          {!showFinancialConfirm ? (
              <button
                onClick={() => setShowFinancialConfirm(true)}
                disabled={person.has_financial_needs || !!loading}
                className="h-28 flex flex-col items-center justify-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-950/20 hover:bg-yellow-900/30 hover:border-yellow-400 text-yellow-400 transition-all"
              >
                <DollarSign className="w-8 h-8" />
                <span className="font-bold uppercase">Solicita Viático</span>
              </button>
          ) : (
            <div className="h-28 flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-yellow-500/50 bg-yellow-900/10">
                <span className="text-yellow-200 text-sm font-bold text-center">¿Confirmar solicitud financiera URGENTE?</span>
                <select 
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white mb-1"
                      value={assignedUserId}
                      onChange={(e) => setAssignedUserId(e.target.value)}
                  >
                      <option value="">-- Asignar Responsable (Opcional) --</option>
                      {users.map(u => (
                          <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                      ))}
                  </select>
                <div className="flex gap-2 w-full">
                     <button onClick={() => setShowFinancialConfirm(false)} className="flex-1 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-xs text-white">No</button>
                     <button 
                        onClick={handleRequestFinancial}
                        className="flex-1 py-1 bg-yellow-600 hover:bg-yellow-500 rounded text-xs text-black font-bold flex items-center justify-center"
                     >
                         {loading === "financial" ? <Loader2 className="w-3 h-3 animate-spin"/> : "SÍ, CONFIRMAR"}
                     </button>
                 </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
