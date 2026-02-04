"use client";

import { Calendar, CheckSquare, Clock, MapPin, Phone, User } from "lucide-react";
import { useState } from "react";
import api from "../../../lib/api";

type Task = {
  id: string;
  title: string;
  description?: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  task_type: "VISIT" | "CALL" | "EVENT" | "LOGISTICS";
  due_date?: string;
  assigned_user_name?: string;
  person_first_name?: string;
  person_last_name?: string;
  list_name?: string;
  completed_at?: string;
};

export default function TaskCard({ task, onUpdate }: { task: Task; onUpdate: () => void }) {
  const [loading, setLoading] = useState(false);

  const toggleComplete = async () => {
    setLoading(true);
    try {
      await api.patch(`/tasks/${task.id}`, {
        completed: !task.completed_at,
      });
      onUpdate();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const priorityColors = {
    LOW: "bg-gray-100 text-gray-700 border-gray-200",
    MEDIUM: "bg-blue-50 text-blue-700 border-blue-200",
    HIGH: "bg-orange-50 text-orange-700 border-orange-200",
    URGENT: "bg-red-50 text-red-700 border-red-200",
  };

  const typeIcons = {
    VISIT: <MapPin className="w-3 h-3" />,
    CALL: <Phone className="w-3 h-3" />,
    EVENT: <Calendar className="w-3 h-3" />,
    LOGISTICS: <Clock className="w-3 h-3" />,
  };

  return (
    <div className={`p-3 bg-white border rounded-lg shadow-sm hover:shadow-md transition-all ${task.completed_at ? 'opacity-50' : ''}`}>
      <div className="flex justify-between items-start mb-2">
        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>
        {task.task_type && (
            <span className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
                {typeIcons[task.task_type]} {task.task_type}
            </span>
        )}
      </div>

      <h4 className="font-semibold text-gray-900 text-sm leading-tight mb-1">
        {task.title}
      </h4>

      {(task.person_first_name || task.list_name) && (
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
          {task.person_first_name ? (
             <span className="text-blue-600 font-medium">@{task.person_first_name} {task.person_last_name}</span>
          ) : (
             <span className="text-purple-600 font-medium">#{task.list_name}</span>
          )}
        </div>
      )}

      {task.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-2">
        <div className="flex items-center gap-1 text-xs text-gray-400">
           <User className="w-3 h-3" />
           <span>{task.assigned_user_name || 'Sin asignar'}</span>
        </div>
        
        <button 
           onClick={toggleComplete}
           disabled={loading}
           className={`p-1.5 rounded-md transition-colors ${task.completed_at ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-600'}`}
        >
          <CheckSquare className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
