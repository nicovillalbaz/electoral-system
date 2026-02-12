"use client";

import { Trash2 } from "lucide-react";
import { ROLE_ICONS, ROLE_COLORS } from "../../components/teamRoleStyles";
import { useState } from "react";
import TeamMemberModal from "./TeamMemberModal";

interface TeamTabProps {
  stationId: string;
  collaborators: any[];
  users?: any[];
  onRefresh: () => void;
}

export default function TeamTab({ stationId, collaborators, users = [], onRefresh }: TeamTabProps) {
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

      <div className="mt-8">
        <h4 className="text-sm font-bold text-zinc-400 uppercase mb-3">Usuarios Asignados al PC</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u) => (
            <div
              key={u.id}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <div className="font-bold text-zinc-200">{u.full_name}</div>
                <div className="text-xs text-zinc-500 font-mono">
                  {u.role}{u.operational_role ? ` · ${u.operational_role}` : ""}
                </div>
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <div className="col-span-full py-8 text-center border border-zinc-800 rounded-xl text-zinc-600">
              Sin usuarios asignados.
            </div>
          )}
        </div>
      </div>

      <TeamMemberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleAdd}
      />
    </div>
  );
}
