"use client";
import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import api from "../../../../lib/api";
import { getApiErrorMessage } from "../../../../lib/api-error";
import { toast } from "sonner";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  taskToEdit?: any; // <--- ADDED
}

export default function TaskModal({ isOpen, onClose, onSuccess, taskToEdit }: TaskModalProps) {
  const [loading, setLoading] = useState(false);
  const [availableAddresses, setAvailableAddresses] = useState<string[]>([]);
  const isEditing = !!taskToEdit;

  useEffect(() => {
      if(isOpen) {
          api.get("/persons/addresses").then(res => setAvailableAddresses(res.data)).catch(() => {});
          
          if (taskToEdit) {
              setFormData({
                  title: taskToEdit.title,
                  description: taskToEdit.description || "",
                  priority: taskToEdit.priority || "MEDIUM",
                  taskType: taskToEdit.task_type || "VISIT", // Note: backend uses task_type (snake), frontend formData camelCase? let's stick to state
                  dueDate: taskToEdit.due_date ? new Date(taskToEdit.due_date).toISOString().slice(0, 16) : "", // datetime-local format
                  locationText: taskToEdit.location_text || ""
              });
          } else {
              setFormData({
                  title: "",
                  description: "",
                  priority: "MEDIUM",
                  taskType: "VISIT",
                  dueDate: "",
                  locationText: ""
              });
          }
      }
  }, [isOpen, taskToEdit]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    taskType: "VISIT",
    dueDate: "",
    locationText: ""
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!formData.title) {
        toast.error("Título requerido");
        return;
      }
      
      const payload = {
        ...formData,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null
      };

      if (isEditing) {
          await api.patch(`/tasks/${taskToEdit.id}`, payload);
          toast.success("Tarea actualizada.");
      } else {
          await api.post("/tasks", payload);
          toast.success("Tarea creada.");
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Error al guardar tarea"));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-md rounded-xl shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-zinc-800">
           <h2 className="text-lg font-bold text-white">{isEditing ? "Editar Tarea" : "Nueva Tarea"}</h2>
           <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSave} className="p-4 space-y-4">
            <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">TÍTULO</label>
                <input className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white outline-none focus:border-blue-500" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} autoFocus />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">TIPO</label>
                    <select className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white outline-none" value={formData.taskType} onChange={e => setFormData({...formData, taskType: e.target.value})}>
                        <option value="VISIT">Visita</option>
                        <option value="CALL">Llamada</option>
                        <option value="EVENT">Evento</option>
                        <option value="LOGISTICS">Logística</option>
                        <option value="FINANCIAL">Viático/Financiero</option>
                        <option value="TRANSPORT">Transporte</option>
                        <option value="FOOD">Alimentación</option>
                        <option value="OTHER">Otro</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">PRIORIDAD</label>
                    <select className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white outline-none" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                        <option value="LOW">Baja</option>
                        <option value="MEDIUM">Media</option>
                        <option value="HIGH">Alta</option>
                        <option value="URGENT">Urgente</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                     <label className="block text-xs font-bold text-zinc-500 mb-1">FECHA LÍMITE</label>
                     <input type="datetime-local" className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white outline-none" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
                </div>
                <div>
                     <label className="block text-xs font-bold text-zinc-500 mb-1">UBICACIÓN</label>
                     <input list="task-address-options" className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white outline-none" placeholder="Seleccionar..." value={formData.locationText} onChange={e => setFormData({...formData, locationText: e.target.value})} />
                     <datalist id="task-address-options">
                        {availableAddresses.map((addr) => <option key={addr} value={addr} />)}
                     </datalist>
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">DESCRIPCIÓN</label>
                <textarea className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white h-20 resize-none outline-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-white text-black font-bold py-2 rounded hover:bg-zinc-200 flex justify-center items-center gap-2">
                {loading ? "Guardando..." : <><Save size={16} /> GUARDAR TAREA</>}
            </button>
        </form>
      </div>
    </div>
  );
}
