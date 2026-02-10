"use client";

import { Check, X, AlertCircle } from "lucide-react";

interface MonitorTabProps {
  voters: any[];
  total: number;
}

export default function MonitorTab({ voters, total }: MonitorTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-white">Monitor en Vivo</h3>
          <p className="text-zinc-500 text-sm">
            Mostrando {voters.length} de {total} asignados
          </p>
        </div>
      </div>

      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900/80 text-zinc-400 uppercase text-xs font-bold border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3">Votante</th>
                <th className="px-4 py-3 text-center">Estado Voto</th>
                <th className="px-4 py-3 text-center">Pasó por PC</th>
                <th className="px-4 py-3">Incentivos (Auditoría)</th>
                <th className="px-4 py-3">Responsable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {voters.map((v) => (
                <tr key={v.id} className="hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="font-bold text-zinc-200">{v.first_name} {v.last_name}</div>
                    <div className="text-xs text-zinc-500 font-mono">{v.document_id}</div>
                  </td>
                  
                  {/* VOTE STATUS */}
                  <td className="px-4 py-3 text-center">
                    {(v.status_day_d === 'VOTED' || v.has_voted) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/20 text-xs font-bold">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            VOTÓ
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/10 text-xs font-bold">
                            NO VOTÓ
                        </span>
                    )}
                  </td>

                  {/* PC ATTENDANCE */}
                  <td className="px-4 py-3 text-center">
                    {v.visited_pc ? (
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            <Check className="w-5 h-5" />
                        </div>
                    ) : (
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800 text-zinc-600 border border-zinc-700">
                             <X className="w-4 h-4" />
                        </div>
                    )}
                  </td>

                  {/* INCENTIVES AUDIT */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                        {/* Financial */}
                        {v.financial?.has_needs ? (
                             <div className="flex items-center gap-2 text-yellow-500">
                                <span className="font-mono font-bold">
                                    {v.financial.amount > 0 ? `${v.financial.amount.toLocaleString('es-PY')} Gs` : 'Solicitado'}
                                </span>
                                {v.financial.fulfilled ? (
                                    <Check className="w-3 h-3 text-green-500" />
                                ) : (
                                    <AlertCircle className="w-3 h-3 text-yellow-500" />
                                )}
                             </div>
                        ) : (
                            <span className="text-zinc-700 text-xs">-</span>
                        )}

                        {/* Logistics Icons */}
                        {v.logistics?.has_needs && (
                            <div className="flex gap-1 mt-1">
                                {v.logistics.has_fuel && <span title="Combustible">⛽</span>}
                                {v.logistics.has_transport && <span title="Transporte">🚌</span>}
                                {v.logistics.has_snack && <span title="Comida">🍔</span>}
                            </div>
                        )}
                    </div>
                  </td>

                  {/* RESPONSIBLE */}
                  <td className="px-4 py-3 text-zinc-400 text-sm">
                    {v.logistics?.responsible || <span className="text-zinc-700 text-xs italic">--</span>}
                  </td>
                </tr>
              ))}
              
              {voters.length === 0 && (
                <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-600">
                        No hay personas asignadas a este PC.
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
