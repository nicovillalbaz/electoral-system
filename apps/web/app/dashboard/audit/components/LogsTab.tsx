"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Undo2 } from "lucide-react";

interface LogsTabProps {
  stationId: string;
}

export default function LogsTab({ stationId }: LogsTabProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [revertingId, setRevertingId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events?stationId=${stationId}&limit=200`);
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      } else {
        setLogs([]);
      }
    } catch (e) {
      console.error(e);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (stationId) fetchLogs();
  }, [stationId]);

  const isReversible = (log: any) => {
    if (log.event_type === "STATION_CHECKIN_CREATED") {
      return !!log.payload?.checkinId;
    }
    if (log.event_type === "TAG_ASSIGNED" || log.event_type === "TAG_REMOVED") {
      return !!log.payload?.tagId && !!log.person_id;
    }
    return false;
  };

  const handleRevert = async (log: any) => {
    if (!confirm("¿Revertir esta acción?")) return;
    setRevertingId(log.id);
    try {
      const res = await fetch(`/api/events/${log.id}/revert`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.message || "No se pudo revertir.");
      } else {
        await fetchLogs();
      }
    } catch (e) {
      console.error(e);
      alert("Error al revertir.");
    } finally {
      setRevertingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-white">Log Detallado</h3>
          <p className="text-zinc-500 text-sm">Últimos eventos del PC</p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white"
        >
          <RefreshCw size={12} /> Actualizar
        </button>
      </div>

      {loading && (
        <div className="text-zinc-500 text-sm">Cargando logs...</div>
      )}

      {!loading && logs.length === 0 && (
        <div className="text-zinc-600 text-sm">No hay eventos aún.</div>
      )}

      <div className="space-y-3">
        {logs.map((log) => (
          <div key={log.id} className="border border-zinc-800 bg-zinc-900/50 rounded-xl p-4">
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="text-sm font-bold text-white">{log.event_type}</div>
                <div className="text-xs text-zinc-500">
                  {new Date(log.created_at || log.timestamp).toLocaleString()} ·{" "}
                  {log.actor_name || "Sistema"}
                </div>
                {log.station_name && (
                  <div className="text-[11px] text-zinc-600">PC: {log.station_name}</div>
                )}
              </div>
              <button
                onClick={() => handleRevert(log)}
                disabled={!isReversible(log) || revertingId === log.id}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-zinc-700 text-zinc-300 hover:text-white hover:border-white disabled:opacity-40"
                title={!isReversible(log) ? "No reversible" : "Revertir acción"}
              >
                <Undo2 size={12} /> Revertir
              </button>
            </div>

            <div className="mt-3 text-xs text-zinc-400 font-mono whitespace-pre-wrap break-words">
              {JSON.stringify(log.payload || {}, null, 2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
