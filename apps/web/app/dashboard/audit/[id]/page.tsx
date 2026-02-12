"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Users, MonitorPlay } from "lucide-react";
import TeamTab from "../components/TeamTab";
import MonitorTab from "../components/MonitorTab";
import LogsTab from "../components/LogsTab";

export default function StationDashboardPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"TEAM" | "MONITOR" | "LOGS">("TEAM");

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stations/${id}/dashboard?limit=100`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 p-6 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => router.back()}
                    className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-zinc-400" />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight">PC CONTROL</h1>
                    <div className="flex gap-4 text-sm text-zinc-500">
                        <span>Meta: {data.stats.total_assigned}</span>
                        <span className="text-green-500">Votos: {data.stats.total_voted}</span>
                        <span className="text-blue-500">Visitas: {data.stats.total_visited_pc}</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                <button
                    onClick={() => setActiveTab("TEAM")}
                    className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${
                        activeTab === "TEAM" 
                        ? "bg-zinc-800 text-white shadow-lg" 
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                >
                    <Users className="w-4 h-4" />
                    EQUIPO
                </button>
                <button
                    onClick={() => setActiveTab("MONITOR")}
                    className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${
                        activeTab === "MONITOR" 
                        ? "bg-blue-900/30 text-blue-400 border border-blue-500/20 shadow-lg" 
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                >
                    <MonitorPlay className="w-4 h-4" />
                    MONITOR
                </button>
                <button
                    onClick={() => setActiveTab("LOGS")}
                    className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${
                        activeTab === "LOGS" 
                        ? "bg-purple-900/30 text-purple-400 border border-purple-500/20 shadow-lg" 
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                >
                    LOGS
                </button>
            </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {activeTab === "TEAM" && (
            <TeamTab 
                stationId={id as string} 
                collaborators={data.collaborators} 
                users={data.users}
                onRefresh={fetchData} 
            />
        )}
        
        {activeTab === "MONITOR" && (
            <MonitorTab 
                voters={data.voters.data}
                total={data.voters.total} 
            />
        )}

        {activeTab === "LOGS" && (
            <LogsTab stationId={id as string} />
        )}
      </div>
    </div>
  );
}
