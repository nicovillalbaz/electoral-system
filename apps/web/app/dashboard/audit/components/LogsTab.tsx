"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Undo2, Filter } from "lucide-react";
import { toast } from "sonner";

interface LogsTabProps {
  stationId: string;
}

const EVENT_CATEGORIES: Record<string, { label: string; types: string[] }> = {
  ALL: { label: "Todos", types: [] },
  VOTES: { label: "ðŸ—³ï¸ Votos", types: ["PERSON_MARKED_VOTED", "DAY_D_STATUS_CHANGED"] },
  USERS: { label: "ðŸ‘¤ Usuarios", types: ["USER_CREATED", "USER_UPDATED", "USER_PASSWORD_CHANGE", "ADMIN_RESET_PASSWORD"] },
  STATIONS: { label: "ðŸ¢ Estaciones", types: ["STATION_CREATED", "STATION_UPDATED", "STATION_CHECKIN_CREATED"] },
  LOGISTICS: { label: "ðŸšš LogÃ­stica", types: ["TRANSPORT_REQUESTED", "FINANCIAL_REQUESTED"] },
  CONTACTS: { label: "ðŸ“ž Contactos", types: ["PERSON_CONTACTED", "PERSON_UPDATED"] },
  TAGS: { label: "ðŸ·ï¸ Etiquetas", types: ["TAG_ASSIGNED", "TAG_REMOVED"] },
};

export default function LogsTab({ stationId }: LogsTabProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("ALL");

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
    if (!confirm("Â¿Revertir esta acciÃ³n?")) return;
    setRevertingId(log.id);
    try {
      const res = await fetch(`/api/events/${log.id}/revert`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.message || "No se pudo revertir.");
      } else {
        await fetchLogs();
        toast.success("AcciÃ³n revertida correctamente.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error al revertir.");
    } finally {
      setRevertingId(null);
    }
  };

  // Filter logs by selected category
  const filteredLogs = categoryFilter === "ALL"
    ? logs
    : logs.filter((log) => {
        const cat = EVENT_CATEGORIES[categoryFilter];
        return cat && cat.types.includes(log.event_type);
      });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h3 className="text-xl font-bold text-white">Log Detallado</h3>
          <p className="text-zinc-500 text-sm">Ãšltimos eventos del PC</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Category Filter */}
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5">
            <Filter size={12} className="text-zinc-500" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent text-sm text-zinc-300 outline-none cursor-pointer"
            >
              {Object.entries(EVENT_CATEGORIES).map(([key, { label }]) => (
                <option key={key} value={key} className="bg-zinc-900 text-zinc-300">
                  {label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white"
          >
            <RefreshCw size={12} /> Actualizar
          </button>
        </div>
      </div>

      {/* Active filter indicator */}
      {categoryFilter !== "ALL" && (
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span>Filtro activo: <strong className="text-white">{EVENT_CATEGORIES[categoryFilter]?.label}</strong></span>
          <span>({filteredLogs.length} de {logs.length} eventos)</span>
          <button
            onClick={() => setCategoryFilter("ALL")}
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Limpiar
          </button>
        </div>
      )}

      {loading && (
        <div className="text-zinc-500 text-sm">Cargando logs...</div>
      )}

      {!loading && filteredLogs.length === 0 && (
        <div className="text-zinc-600 text-sm">No hay eventos{categoryFilter !== "ALL" ? " en esta categorÃ­a" : " aÃºn"}.</div>
      )}

      <div className="space-y-3">
        {filteredLogs.map((log) => (
          <div key={log.id} className="border border-zinc-800 bg-zinc-900/50 rounded-xl p-4">
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="text-sm font-bold text-white">{log.event_type}</div>
                <div className="text-xs text-zinc-500">
                  {new Date(log.created_at || log.timestamp).toLocaleString()} Â·{" "}
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
                title={!isReversible(log) ? "No reversible" : "Revertir acciÃ³n"}
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
