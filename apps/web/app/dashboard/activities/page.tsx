"use client";

import { useEffect, useState } from "react";
import api from "../../../lib/api";
import TaskCard from "../components/TaskCard"; // Absolute path might rely on tsconfig, but relative is safer for now if we are in dashboard/activities. Wait, this file is in dashboard/activities/page.tsx, components is in dashboard/components. So ../components/TaskCard.
import { Plus, LayoutGrid, List } from "lucide-react";
import { format, isToday, isTomorrow, isPast, isFuture, parseISO, addDays } from "date-fns";
import { es } from "date-fns/locale";

type ViewMode = "BOARD" | "LIST";

export default function ActivitiesPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [view, setView] = useState<ViewMode>("BOARD");
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const { data } = await api.get("/tasks?limit=100&status=ALL");
      setTasks(data.data); // Assuming response structure { data: [], total: N } based on repo
    } catch (error) {
      console.error("Error fetching tasks", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Board Columns Logic
  const overdue = tasks.filter(t => !t.completed_at && t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)));
  const today = tasks.filter(t => !t.completed_at && (
      (t.due_date && isToday(parseISO(t.due_date))) || !t.due_date
  ));
  const tomorrow = tasks.filter(t => !t.completed_at && t.due_date && isTomorrow(parseISO(t.due_date)));
  const future = tasks.filter(t => !t.completed_at && t.due_date && isFuture(parseISO(t.due_date)) && !isTomorrow(parseISO(t.due_date)));

  if (loading) return <div className="p-8">Cargando actividades...</div>;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Actividades y Agenda</h1>
          <p className="text-muted-foreground text-sm">Gestiona el trabajo de campo y logística.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-white border rounded-lg p-1 flex">
             <button 
                onClick={() => setView("BOARD")}
                className={`p-1.5 rounded ${view === 'BOARD' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}
             >
                <LayoutGrid className="w-4 h-4" />
             </button>
             <button 
                onClick={() => setView("LIST")}
                className={`p-1.5 rounded ${view === 'LIST' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}
             >
                <List className="w-4 h-4" />
             </button>
          </div>

          <button className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-800 transition-colors">
            <Plus className="w-4 h-4" />
            Nueva Actividad
          </button>
        </div>
      </div>

      {/* Board View */}
      {view === "BOARD" && (
        <div className="flex gap-4 overflow-x-auto pb-4 h-full">
            <BoardColumn title="Vencidas" count={overdue.length} tasks={overdue} color="border-red-500" onUpdate={fetchTasks} />
            <BoardColumn title="Para Hoy" count={today.length} tasks={today} color="border-blue-500" onUpdate={fetchTasks} />
            <BoardColumn title="Mañana" count={tomorrow.length} subtitle={format(addDays(new Date(), 1), 'EEEE d', { locale: es })} tasks={tomorrow} color="border-orange-500" onUpdate={fetchTasks} />
            <BoardColumn title="Próximos días" count={future.length} tasks={future} color="border-gray-300" onUpdate={fetchTasks} />
        </div>
      )}

      {/* List View Placeholder */}
      {view === "LIST" && (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
             Vista de lista en construcción. Usa el tablero por ahora.
        </div>
      )}
    </div>
  );
}

function BoardColumn({ title, subtitle, count, tasks, color, onUpdate }: any) {
    return (
        <div className="min-w-[300px] w-[300px] flex flex-col bg-gray-50/50 rounded-xl border border-gray-100 h-full">
            <div className={`p-4 border-b bg-white rounded-t-xl border-t-4 ${color}`}>
                <div className="flex justify-between items-center mb-1">
                    <h3 className="font-semibold text-gray-900">{title}</h3>
                    <span className="text-xs font-bold bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">{count}</span>
                </div>
                {subtitle && <p className="text-xs text-gray-500 capitalize">{subtitle}</p>}
            </div>
            
            <div className="p-3 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
                {tasks.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-xs italic">
                        Sin actividades
                    </div>
                ) : (
                    tasks.map((t: any) => (
                        <TaskCard key={t.id} task={t} onUpdate={onUpdate} />
                    ))
                )}
            </div>
        </div>
    )
}
