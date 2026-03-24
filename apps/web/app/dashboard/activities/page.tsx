"use client";

import { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon, 
  List as ListIcon, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  MapPin
} from "lucide-react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO
} from "date-fns";
import { es } from "date-fns/locale";
import api from "../../../lib/api";
import { getApiErrorMessage } from "../../../lib/api-error";
import clsx from "clsx";
import { useDebounce } from "use-debounce";
import { toast } from "sonner";
import TaskModal from "./components/TaskModal";
import FinancialClosingModal from "./components/FinancialClosingModal";

// --- TYPES ---
interface Task {
  id: string;
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  task_type: "VISIT" | "CALL" | "EVENT" | "LOGISTICS" | "FINANCIAL";
  due_date: string;
  completed_at: string | null;
  location_text: string | null;
  assigned_user_id: string;
  assigned_user_name?: string; // If returned by backend join
}

export default function ActivitiesPage() {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [page, setPage] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);
  const limit = 50;
  
  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "COMPLETED">("PENDING");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [onlyMine, setOnlyMine] = useState(false); // <--- New State
  const [currentUser, setCurrentUser] = useState<any>(null); // <--- User State

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
        try { setCurrentUser(JSON.parse(userStr)); } catch(e){}
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [debouncedSearch, statusFilter, typeFilter, view, currentDate, onlyMine, currentUser, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, typeFilter, view, currentDate, onlyMine, currentUser?.id]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params: any = { 
        q: debouncedSearch,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        assignedUserId: onlyMine && currentUser?.id ? currentUser.id : undefined // <--- Filter Logic
      };

      if (typeFilter) params.taskType = typeFilter;

      // If calendar view, fetch range
      if (view === "calendar") {
         params.startDate = startOfMonth(currentDate).toISOString();
         params.endDate = endOfMonth(currentDate).toISOString();
         // In calendar we want ALL status usually, but let's respect the filter if explicit
         params.page = 1;
         params.limit = 500;
      } else {
         params.page = page;
         params.limit = limit;
      }

      const res = await api.get("/tasks", { params });
      setTasks(res.data.data || []);
      setTotalTasks(typeof res.data.total === "number" ? res.data.total : (res.data.data || []).length);
    } catch (e) {
      // silently ignore load errors
    } finally {
      setLoading(false);
    }
  };

  const [financialTaskToClose, setFinancialTaskToClose] = useState<Task | null>(null);

  const toggleTaskCompletion = async (taskId: string, currentStatus: boolean, taskType: string) => {
    // Intercept Financial Tasks
    if (taskType === 'FINANCIAL' && !currentStatus) {
        // If it's NOT completed and we want to complete it -> Open Modal
        const t = tasks.find(x => x.id === taskId);
        if (t) setFinancialTaskToClose(t);
        return;
    }
    if (taskType === 'FINANCIAL' && currentStatus) {
        return; // Completed financial tasks cannot be unmarked
    }

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed_at: currentStatus ? null : new Date().toISOString() } : t));
    
    try {
      await api.patch(`/tasks/${taskId}`, { completed: !currentStatus });
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Error al actualizar tarea"));
      fetchTasks(); // Revert
    }
  };

  // --- RENDER HELPERS ---
  const getPriorityColor = (p: string) => {
    switch(p) {
        case "URGENT": return "text-red-500 bg-red-950/30 border-red-900 animate-pulse";
        case "HIGH": return "text-orange-500 bg-orange-950/30 border-orange-900";
        case "MEDIUM": return "text-yellow-500 bg-yellow-950/30 border-yellow-900";
        case "LOW": return "text-blue-500 bg-blue-950/30 border-blue-900";
        default: return "text-zinc-500 bg-zinc-900 border-zinc-800";
    }
  };

  const getTypeIcon = (t: string) => {
      switch(t) {
          case "VISIT": return "🏠";
          case "CALL": return "📞";
          case "EVENT": return "🎉";
          case "LOGISTICS": return "🚚";
          case "FINANCIAL": return "💰";
          case "TRANSPORT": return "🚗";
          case "FOOD": return "🍽️";
          case "OTHER": return "📋";
          default: return "📌";
      }
  };

  // --- CALENDAR LOGIC ---
  const renderCalendar = () => {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(monthStart);
      const startDate = startOfWeek(monthStart, { locale: es });
      const endDate = endOfWeek(monthEnd, { locale: es });
      const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

      const weekDays = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];

      return (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden animate-in fade-in">
              <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-950/50">
                  <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1 hover:text-white text-zinc-500">&lt; Anterior</button>
                  <h3 className="text-lg font-bold text-white capitalize">{format(currentDate, "MMMM yyyy", { locale: es })}</h3>
                  <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1 hover:text-white text-zinc-500">Siguiente &gt;</button>
              </div>
              <div className="grid grid-cols-7 border-b border-zinc-800 bg-zinc-950">
                  {weekDays.map(d => (
                      <div key={d} className="p-3 text-center text-xs font-bold text-zinc-500">{d}</div>
                  ))}
              </div>
              <div className="grid grid-cols-7 bg-zinc-900">
                  {dateRange.map((day, idx) => {
                      const isCurrentMonth = isSameMonth(day, monthStart);
                      const dayTasks = tasks.filter(t => t.due_date && isSameDay(parseISO(t.due_date), day));
                      const isToday = isSameDay(day, new Date());

                      return (
                          <div key={day.toString()} className={clsx(
                              "min-h-[100px] border-r border-b border-zinc-800 p-2 transition-colors hover:bg-zinc-800/50 relative",
                              !isCurrentMonth && "bg-zinc-950/50 opacity-40",
                              idx % 7 === 6 && "border-r-0" // Remove right border for last col
                          )}>
                              <div className={clsx("text-sm font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full", isToday ? "bg-blue-600 text-white" : "text-zinc-400")}>
                                  {format(day, "d")}
                              </div>
                              <div className="space-y-1">
                                  {dayTasks.map(task => (
                                      <div key={task.id} className="text-[10px] truncate bg-zinc-800 rounded px-1 py-0.5 border border-zinc-700 text-zinc-300 flex items-center gap-1">
                                          <span className={clsx("w-1.5 h-1.5 rounded-full", task.completed_at ? "bg-emerald-500" : "bg-blue-500")}></span>
                                          {task.title}
                                      </div>
                                  ))}
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  };

  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [showModal, setShowModal] = useState(false);
  const totalPages = Math.max(1, Math.ceil(totalTasks / limit));

  const openCreate = () => {
      setTaskToEdit(null);
      setShowModal(true);
  };

  const openEdit = (task: Task) => {
      setTaskToEdit(task);
      setShowModal(true);
  };

  const handleDelete = async (task: Task) => {
      // 1. If it's Financial AND Pending, force them to "Close" (register expense) first.
      if (task.task_type === 'FINANCIAL' && !task.completed_at) {
          if (confirm("Las tareas financieras (viáticos/logística) pendientes no se pueden eliminar directamente.\n¿Desea CERRAR la tarea registrando el gasto ahora?")) {
             setFinancialTaskToClose(task);
          }
          return;
      }

      // 2. If it's standard or a Completed Financial task, allow deletion.
      if(!confirm("¿Estás seguro de eliminar esta actividad?")) return;
      try {
          await api.delete(`/tasks/${task.id}`);
          setTasks(prev => prev.filter(t => t.id !== task.id));
          toast.success("Actividad eliminada.");
      } catch(e) {
          toast.error(getApiErrorMessage(e, "Error al eliminar"));
      }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-2xl font-black text-white tracking-tight">Agenda & Actividades</h1>
           <p className="text-zinc-400 text-sm">Gestiona visitas, llamadas y eventos de campaña.</p>
        </div>
        <button onClick={openCreate} className="bg-white hover:bg-zinc-200 text-black px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all">
            <Plus size={18} /> Nueva Tarea
        </button>
      </div>

      <TaskModal isOpen={showModal} onClose={() => setShowModal(false)} onSuccess={fetchTasks} taskToEdit={taskToEdit} />
      
      {financialTaskToClose && (
          <FinancialClosingModal 
            isOpen={!!financialTaskToClose} 
            onClose={() => setFinancialTaskToClose(null)} 
            onSuccess={fetchTasks} 
            task={financialTaskToClose} 
          />
      )}

      {/* CONTROLS */}
      <div className="flex flex-col md:flex-row gap-4 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
        <div className="relative flex-1">
           <Search className="absolute left-3 top-3 text-zinc-500" size={16} />
           <input 
             className="w-full bg-black border border-zinc-800 rounded-lg pl-10 p-2.5 text-sm text-white focus:border-zinc-600 outline-none" 
             placeholder="Buscar tarea..." 
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <button 
                onClick={() => setOnlyMine(!onlyMine)}
                className={clsx(
                    "px-3 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 border transition-all whitespace-nowrap",
                    onlyMine 
                        ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]" 
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600"
                )}
            >
                <CheckCircle2 size={16} className={onlyMine ? "text-white" : "text-zinc-600"} />
                Mis Actividades
            </button>

            <select 
                className="bg-black border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-300 outline-none focus:border-zinc-600 min-w-[120px]"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
            >
                <option value="">Todo Tipo</option>
                <option value="VISIT">🏠 Visita</option>
                <option value="CALL">📞 Llamada</option>
                <option value="EVENT">🎉 Evento</option>
                <option value="LOGISTICS">🚚 Logística</option>
                <option value="FINANCIAL">💰 Viático/Logística</option>
                <option value="TRANSPORT">🚗 Transporte</option>
                <option value="FOOD">🍽️ Alimentación</option>
                <option value="OTHER">📋 Otro</option>
            </select>

            <div className="bg-black border border-zinc-800 rounded-lg p-1 flex">
                <button onClick={() => setView("list")} className={clsx("p-2 rounded-md transition-all", view === "list" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300")}>
                    <ListIcon size={18} />
                </button>
                <button onClick={() => setView("calendar")} className={clsx("p-2 rounded-md transition-all", view === "calendar" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300")}>
                    <CalendarIcon size={18} />
                </button>
            </div>
        </div>
      </div>

      {/* VIEW CONTENT */}
      {view === "list" ? (
         <div className="space-y-4">
            
            {/* TABS STATUS */}
            <div className="flex gap-6 border-b border-zinc-800">
                {["PENDING", "COMPLETED", "ALL"].map((st) => (
                    <button 
                        key={st} 
                        onClick={() => setStatusFilter(st as any)}
                        className={clsx("pb-3 text-sm font-bold border-b-2 transition-colors", statusFilter === st ? "border-white text-white" : "border-transparent text-zinc-500 hover:text-zinc-300")}
                    >
                        {st === "PENDING" ? "PENDIENTES" : st === "COMPLETED" ? "COMPLETADAS" : "TODAS"}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="text-center py-20 text-zinc-600 animate-pulse">Cargando tareas...</div>
            ) : tasks.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-zinc-800 rounded-xl">
                    <div className="bg-zinc-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-600"><CalendarIcon size={32} /></div>
                    <p className="text-zinc-500 font-medium">No hay tareas encontradas.</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {tasks.map(task => {
                        const isLockedFinancial = task.task_type === 'FINANCIAL' && !!task.completed_at;
                        return (
                        <div key={task.id} className="group bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center gap-4 transition-all hover:border-zinc-700 hover:shadow-lg">
                            <button 
                                onClick={() => !isLockedFinancial && toggleTaskCompletion(task.id, !!task.completed_at, task.task_type)}
                                disabled={isLockedFinancial}
                                className={clsx(
                                    "w-6 h-6 rounded-full border flex items-center justify-center transition-colors",
                                    task.completed_at ? "bg-emerald-500 border-emerald-500 text-white" : "border-zinc-600 text-transparent hover:border-emerald-500 group-hover:bg-zinc-800",
                                    isLockedFinancial && "opacity-60 cursor-not-allowed"
                                )}
                            >
                                <CheckCircle2 size={14} />
                            </button>
                            
                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(task)}>
                                <h3 className={clsx("font-bold text-base truncate", task.completed_at ? "text-zinc-500 line-through" : "text-white")}>{task.title}</h3>
                                <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                                    <span className="flex items-center gap-1">{getTypeIcon(task.task_type)} {task.task_type}</span>
                                    {task.due_date && <span className={clsx("flex items-center gap-1", !task.completed_at && new Date(task.due_date) < new Date() ? "text-red-400" : "")}><Clock size={12} /> {format(parseISO(task.due_date), "dd MMM HH:mm", { locale: es })}</span>}
                                    {task.location_text && <span className="flex items-center gap-1 truncate"><MapPin size={12} /> {task.location_text}</span>}
                                </div>
                            </div>
                            
                            {/* ACTIONS */}
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEdit(task)} className="text-zinc-500 hover:text-white p-2 hover:bg-zinc-800 rounded-full text-xs font-bold">EDITAR</button>
                                <button onClick={() => handleDelete(task)} className="text-red-500/50 hover:text-red-500 p-2 hover:bg-red-950/30 rounded-full text-xs font-bold">ELIMINAR</button>
                            </div>

                            <span className={clsx("text-[10px] font-black px-2 py-1 rounded border", getPriorityColor(task.priority))}>
                                {task.priority}
                            </span>
                        </div>
                        );
                    })}
                </div>
            )}

            {view === "list" && (
              <div className="pt-4 flex items-center justify-between text-xs text-zinc-500">
                <span>
                  Pagina <span className="text-white font-bold">{page}</span> de{" "}
                  <span className="text-white font-bold">{totalPages}</span>
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || loading}
                    className="px-3 py-1.5 rounded border border-zinc-700 text-zinc-300 disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || loading}
                    className="px-3 py-1.5 rounded border border-zinc-700 text-zinc-300 disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
         </div>
      ) : (
         renderCalendar()
      )}

    </div>
  );
}

