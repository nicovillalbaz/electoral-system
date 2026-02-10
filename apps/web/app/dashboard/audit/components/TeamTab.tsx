"use client";

import { Trash2, User, Shield, Truck, Briefcase, DollarSign } from "lucide-react";
import { useState } from "react";
import TeamMemberModal from "./TeamMemberModal";

const ROLE_ICONS: Record<string, any> = {
  JEFE: Briefcase,
  SEGURIDAD: Shield,
  CHOFER: Truck,
  CAJA: DollarSign,
  DEFAULT: User
};

const ROLE_COLORS: Record<string, string> = {
  JEFE: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  SEGURIDAD: "text-red-400 bg-red-400/10 border-red-400/20",
  CHOFER: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  CAJA: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  DEFAULT: "text-zinc-400 bg-zinc-800 border-zinc-700"
};

interface TeamTabProps {
  stationId: string;
  collaborators: any[];
  onRefresh: () => void;
}

export default function TeamTab({ stationId, collaborators, onRefresh }: TeamTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async (personId: string | null, role: string, citizenData?: any) => {
    const res = await fetch(`/api/stations/${stationId}/collaborators`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId, role, ...citizenData }),
    });
    if (res.ok) {
      onRefresh();
    } else {
        alert("Error al agregar colaborador");
    }
  };

  const handleRemove = async (personId: string) => {
    if (!confirm("¿Seguro que deseas remover a este colaborador?")) return;
    
    setDeletingId(personId);
    try {
        const res = await fetch(`/api/stations/${stationId}/collaborators/${personId}`, {
            method: "DELETE",
        });
        if (res.ok) {
            onRefresh();
        }
    } catch(e) {
        console.error(e);
    } finally {
        setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-white">Equipo del PC</h3>
          <p className="text-zinc-500 text-sm">Gestiona quiénes son responsables en este lugar.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-lg shadow-blue-900/20"
        >
          + Agregar Miembro
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {collaborators.map((member) => {
          const RoleIcon = ROLE_ICONS[member.role] || ROLE_ICONS.DEFAULT;
          const colorClass = ROLE_COLORS[member.role] || ROLE_COLORS.DEFAULT;

          return (
            <div
              key={member.id}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center justify-between group hover:border-zinc-700 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center border ${colorClass}`}>
                  <RoleIcon className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-zinc-200">{member.first_name} {member.last_name}</div>
                  <div className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block mt-1 border ${colorClass}`}>
                    {member.role}
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => handleRemove(member.person_id)}
                disabled={deletingId === member.person_id}
                className="text-zinc-600 hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          );
        })}

        {collaborators.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-zinc-800 rounded-xl text-zinc-600">
            No hay colaboradores asignados aún.
          </div>
        )}
      </div>

      <TeamMemberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleAdd}
      />
    </div>
  );
}
