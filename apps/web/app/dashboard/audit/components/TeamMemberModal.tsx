"use client";

import { useState, useEffect } from "react";
import { Loader2, UserPlus, X, AlertCircle, CheckCircle } from "lucide-react";
import { getApiErrorMessage } from "../../../../lib/api-error";
import { toast } from "sonner";
import api from "../../../../lib/api";

interface TeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (personId: string | null, role: string, citizenData?: any) => Promise<void>;
}

const ROLES = ["JEFE", "LOGISTICA", "CHOFER", "SEGURIDAD", "CAJA", "OTRO"];

export default function TeamMemberModal({ isOpen, onClose, onConfirm }: TeamMemberModalProps) {
  const [documentId, setDocumentId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isFound, setIsFound] = useState(false);
  const [canEditName, setCanEditName] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [selectedRole, setSelectedRole] = useState("CHOFER");
  const [customRole, setCustomRole] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (documentId.length < 4) {
      setIsFound(false);
      setCanEditName(true);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const res = await api.get(`/voting/grid?query=${encodeURIComponent(documentId)}&limit=5`);
        const data = Array.isArray(res.data) ? res.data : [];

        if (data.length > 0) {
          const exact = data.find((row: any) => row.document_id === documentId);
          if (exact) {
            setIsFound(true);

            const dbFirst = exact.first_name || "";
            const dbLast = exact.last_name || "";
            const isComplete =
              dbFirst.trim().length > 1 &&
              dbLast.trim().length > 1 &&
              dbFirst !== "NN" &&
              dbLast !== "NN";

            setFirstName(dbFirst);
            setLastName(dbLast);
            setCanEditName(!isComplete);
          } else {
            setIsFound(false);
            setCanEditName(true);
          }
        } else {
          setIsFound(false);
          setCanEditName(true);
        }
      } catch (e) {
        console.error(e);
        setCanEditName(true);
      } finally {
        setLoadingSearch(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [documentId]);

  const handleSubmit = async () => {
    if (!documentId || !firstName || !lastName) return;

    setSubmitting(true);
    try {
      const finalRole = selectedRole === "OTRO" ? customRole.toUpperCase() : selectedRole;

      await onConfirm(null, finalRole, {
        documentId,
        firstName: firstName.toUpperCase(),
        lastName: lastName.toUpperCase()
      });

      handleClose();
    } catch (e) {
      console.error(e);
      toast.error(getApiErrorMessage(e, "Error al guardar colaborador"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setDocumentId("");
    setFirstName("");
    setLastName("");
    setIsFound(false);
    setCanEditName(true);
    setSelectedRole("CHOFER");
    setCustomRole("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-500" />
            Datos del Colaborador
          </h2>
          <button onClick={handleClose} className="text-zinc-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Cedula de Identidad</label>
            <div className="relative">
              <input
                type="text"
                className={`w-full bg-zinc-950 border rounded-lg p-3 text-lg font-mono text-white focus:outline-none focus:ring-1 transition-all uppercase
                  ${isFound ? 'border-green-500/50 focus:border-green-500 focus:ring-green-500' : 'border-zinc-700 focus:border-blue-500 focus:ring-blue-500'}
                `}
                placeholder="INGRESAR CI..."
                value={documentId}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  setDocumentId(val);
                  if (!val) {
                    setFirstName("");
                    setLastName("");
                    setCanEditName(true);
                  }
                }}
                autoFocus
              />
              {loadingSearch && (
                <div className="absolute right-3 top-3.5">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                </div>
              )}
              {!loadingSearch && isFound && (
                <div className="absolute right-3 top-3.5">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
              )}
            </div>

            {isFound && !canEditName && (
              <p className="text-xs text-green-400 flex items-center gap-1 animate-in slide-in-from-top-1">
                <CheckCircle className="w-3 h-3" />
                Persona encontrada. Datos oficiales cargados.
              </p>
            )}
            {isFound && canEditName && (
              <p className="text-xs text-yellow-500 flex items-center gap-1 animate-in slide-in-from-top-1">
                <AlertCircle className="w-3 h-3" />
                Registro incompleto. Por favor actualice el Nombre y Apellido.
              </p>
            )}
            {!isFound && documentId.length > 3 && !loadingSearch && (
              <p className="text-xs text-zinc-500 flex items-center gap-1 animate-in slide-in-from-top-1">
                <UserPlus className="w-3 h-3" />
                Nuevo registro. Ingrese los datos manualmente.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Nombre</label>
              <input
                type="text"
                className={`w-full bg-zinc-950 border rounded-lg p-3 text-white focus:outline-none uppercase transition-colors
                  ${!canEditName
                    ? 'border-green-900/50 text-green-100 bg-green-950/20 cursor-not-allowed'
                    : 'border-zinc-700 focus:border-blue-500'
                  }
                `}
                placeholder="NOMBRE"
                value={firstName}
                onChange={(e) => canEditName && setFirstName(e.target.value)}
                readOnly={!canEditName}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Apellido</label>
              <input
                type="text"
                className={`w-full bg-zinc-950 border rounded-lg p-3 text-white focus:outline-none uppercase transition-colors
                  ${!canEditName
                    ? 'border-green-900/50 text-green-100 bg-green-950/20 cursor-not-allowed'
                    : 'border-zinc-700 focus:border-blue-500'
                  }
                `}
                placeholder="APELLIDO"
                value={lastName}
                onChange={(e) => canEditName && setLastName(e.target.value)}
                readOnly={!canEditName}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Rol Asignado</label>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map((role) => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`p-2 rounded-lg text-xs font-bold border transition-all ${
                    selectedRole === role
                      ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {selectedRole === "OTRO" && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Especifique el rol</label>
              <input
                type="text"
                className="w-full bg-zinc-950 border border-blue-500/50 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 uppercase"
                placeholder="EJ: LIMPIEZA / LOGISTICA..."
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
              />
            </div>
          )}

          <div className="pt-4">
            <button
              onClick={handleSubmit}
              disabled={!documentId || !firstName || !lastName || submitting || (selectedRole === "OTRO" && !customRole)}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/20 active:translate-y-0.5"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Guardando...
                </span>
              ) : (
                "Guardar Colaborador"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
