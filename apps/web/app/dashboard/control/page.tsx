"use client";

import { useEffect, useState, useRef } from "react";
import { Search, Loader2 } from "lucide-react";

export default function DayDControlPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus omnibar on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 3) {
        search();
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const search = async () => {
    setLoading(true);
    try {
      // Calls the grid endpoint which is optimized for this
      const res = await fetch(`/api/voting/grid?query=${encodeURIComponent(query)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 relative overflow-hidden">
        {/* Background Ambient Effect */}
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10 flex flex-col gap-8 pt-20">
            
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                    CENTRAL TÁCTICA DÍA D
                </h1>
                <p className="text-zinc-500">Busca por Cédula, Nombre o Apellido</p>
            </div>

            {/* OMNIBAR */}
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                <div className="relative bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl flex items-center p-4 gap-4">
                    <Search className={`w-8 h-8 ${loading ? 'text-blue-500 animate-pulse' : 'text-zinc-500'}`} />
                    <input
                        ref={inputRef}
                        type="text"
                        className="w-full bg-transparent text-3xl font-bold text-white placeholder-zinc-700 outline-none uppercase"
                        placeholder="ESCRIBE AQUÍ..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoComplete="off"
                    />
                    {loading && <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />}
                </div>
            </div>

            {/* RESULTS LIST */}
            <div className="space-y-2">
                {results.map((person) => (
                    <div
                        key={person.id}
                        className="w-full text-left bg-zinc-900/50 border border-zinc-800/50 p-4 rounded-xl flex items-center justify-between"
                    >
                        <div>
                            <div className="text-xl font-bold text-zinc-200">
                                {person.first_name} {person.last_name}
                            </div>
                            <div className="text-sm font-mono text-zinc-500">
                                CI: {person.document_id} • MESA: {person.voting_table_number || '--'}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {person.has_voted && (
                                <span className="px-2 py-1 rounded bg-green-500/20 text-green-500 text-xs font-bold border border-green-500/20">
                                    VOTÓ
                                </span>
                            )}
                            {person.needs_transport && (
                                <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-500 text-xs font-bold border border-blue-500/20">
                                    TRANSPORTE
                                </span>
                            )}
                             {person.has_financial_needs && (
                                <span className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-500 text-xs font-bold border border-yellow-500/20">
                                    VIÁTICO
                                </span>
                            )}
                        </div>
                    </div>
                ))}
                
                {query.length >= 3 && results.length === 0 && !loading && (
                    <div className="text-center p-8 text-zinc-600">
                        No se encontraron resultados para "{query}"
                    </div>
                )}
            </div>

        </div>

    </div>
  );
}
