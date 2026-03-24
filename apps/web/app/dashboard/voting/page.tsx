"use client";

import { useEffect, useState, useCallback } from "react";
import safeApi from "../../../lib/api";
import { Search, Siren } from "lucide-react";
import VoterRow from "./components/VoterRow";
import { useDebounce } from "use-debounce";

export default function DayDPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 500);
  const [voters, setVoters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 50;
  const [collisionAlert, setCollisionAlert] = useState<string | null>(null);

  const [stations, setStations] = useState<any[]>([]);
  useEffect(() => {
    safeApi.get("/stations").then((res) => setStations(res.data)).catch(() => {});
  }, []);

  const loadGrid = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * limit;
      const { data } = await safeApi.get(`/voting/grid?limit=${limit}&offset=${offset}&query=${debouncedQuery}`);
      setVoters(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, page]);

  useEffect(() => {
    loadGrid();
  }, [loadGrid]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  useEffect(() => {
    if (query.length < 3) {
      setVoters([]);
    }
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.length >= 6) {
      const found = voters.find(
        (v) => v.document_id === debouncedQuery || v.document_id.includes(debouncedQuery),
      );

      if (found) {
        if (found.status_day_d === "VOTED") {
          setCollisionAlert(`ALERTA: La cedula ${found.document_id} ya voto.`);
        } else if (found.status_day_d === "CHECKED_IN") {
          setCollisionAlert(`Precaucion: ${found.document_id} ya fue registrado en un Puesto de Comando.`);
        } else if (found.status_day_d === "ON_TRANSIT") {
          setCollisionAlert(`Precaucion: ${found.document_id} ya esta EN TRANSITO.`);
        } else {
          setCollisionAlert(null);
          if (found.citizen_id) {
            checkCrossCollision(found.citizen_id);
          }
        }
      }
    } else {
      setCollisionAlert(null);
    }
  }, [debouncedQuery, voters]);

  const checkCrossCollision = async (citizenId: string) => {
    try {
      const { data } = await safeApi.get(`/voting/check-collision/${citizenId}`);
      if (data.active) {
        const by = data.details.operator_name ? ` por ${data.details.operator_name}` : "";
        const status = data.details.status ? ` (${data.details.status})` : "";
        setCollisionAlert(`CONFLICTO GLOBAL: Esta cedula ya tiene actividad${by}${status}.`);
      }
    } catch {
      // Silent fail
    }
  };

  return (
    <div className="h-screen flex flex-col bg-zinc-950 overflow-hidden">
      <div
        className={`p-4 border-b border-white/5 transition-colors ${collisionAlert ? "bg-red-900/50" : "bg-zinc-900/50"} text-white shrink-0`}
      >
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-black tracking-tighter flex items-center gap-2">
            <Siren className={collisionAlert ? "animate-bounce" : "text-emerald-500"} />
            CONTROL DIA D
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-xs font-mono opacity-70">
              {voters.length} registros | Pagina {page}
            </div>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 text-zinc-500 w-5 h-5" />
          <input
            autoFocus
            placeholder="ESCANEAR CEDULA O BUSCAR APELLIDO..."
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

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-zinc-950 p-4">
          <div className="max-w-4xl mx-auto space-y-4">
            {voters.length > 0 && (
              <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Resultados ({voters.length})
              </h3>
            )}

            {voters.map((v) => (
              <div key={v.id}>
                <VoterRow
                  voter={v}
                  onUpdate={(updated) => {
                    if (updated) {
                      setVoters((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
                    }
                  }}
                  stations={stations}
                />
              </div>
            ))}

            {voters.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center p-20 text-zinc-800 opacity-50">
                <Search size={64} className="mb-4 text-zinc-900" />
                <p className="text-xl font-black">INGRESA CEDULA O APELLIDO</p>
                <p className="text-sm">Usa los botones de la derecha para acciones rapidas</p>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="px-3 py-1.5 text-xs rounded border border-zinc-700 text-zinc-300 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={loading || voters.length < limit}
                className="px-3 py-1.5 text-xs rounded border border-zinc-700 text-zinc-300 disabled:opacity-40"
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
