"use client";
import { useState, useEffect, useRef } from "react"; // <--- Agregamos useRef
import {
  X,
  Save,
  User,
  Plus,
  MapPin,
  Phone,
  History,
  Tag,
  Trash2,
  Clock,
  Car,
} from "lucide-react";
import api from "../../../../lib/api";

interface PersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  personToEdit?: any;
  availableAddresses?: string[];
  availableTags?: any[];
}

export default function PersonModal({
  isOpen,
  onClose,
  onSuccess,
  personToEdit,
  availableAddresses = [],
  availableTags = [],
}: PersonModalProps) {
  const isEditing = !!personToEdit;
  const [activeTab, setActiveTab] = useState<"details" | "history">("details");

  // ESTADOS
  const [localTags, setLocalTags] = useState<any[]>(availableTags);
  const [newTagInput, setNewTagInput] = useState("");
  const [assignedTags, setAssignedTags] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // REFERENCIA PARA EVITAR BUCLE INFINITO
  const prevTagsRef = useRef<string>("");

  const [formData, setFormData] = useState({
    phoneNumber: "",
    address: "",
    currentVoteIntent: "UNDECIDED",
    campaignStatus: "NOT_VISITED",
    notes: "",
    needsTransport: false,
    transportStatus: "PENDING",
  });

  // --- SOLUCIÓN DEL BUCLE INFINITO ---
  // Solo actualizamos localTags si el CONTENIDO del array cambió realmente.
  useEffect(() => {
    const tagsString = JSON.stringify(availableTags);
    if (prevTagsRef.current !== tagsString) {
      setLocalTags(availableTags);
      prevTagsRef.current = tagsString;
    }
  }, [availableTags]);

  // CARGAR DATOS AL ABRIR
  useEffect(() => {
    if (isOpen) {
      setActiveTab("details");

      // Limpiamos o cargamos según corresponda
      if (personToEdit) {
        setFormData({
          phoneNumber: personToEdit.phone_number || "",
          address: personToEdit.address || "",
          currentVoteIntent: personToEdit.current_vote_intent || "UNDECIDED",
          campaignStatus: personToEdit.campaign_status || "NOT_VISITED",
          notes: personToEdit.notes || "",
          needsTransport: personToEdit.needs_transport || false,
          transportStatus: personToEdit.transport_status || "PENDING",
        });

        // Fetchs internos
        fetchTags(personToEdit.id);
        fetchHistory(personToEdit.id);
      } else {
        // Reset para nuevo
        setFormData({
          phoneNumber: "",
          address: "",
          currentVoteIntent: "UNDECIDED",
          campaignStatus: "NOT_VISITED",
          notes: "",
          needsTransport: false,
          transportStatus: "PENDING",
        });
        setAssignedTags([]);
        setHistory([]);
      }
    }
  }, [isOpen, personToEdit]); // React controla bien estas dependencias simples

  // --- API CALLS ---
  const fetchTags = async (personId: string) => {
    try {
      const res = await api.get(`/tags/person/${personId}`);
      setAssignedTags(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHistory = async (personId: string) => {
    setLoadingHistory(true);
    try {
      const res = await api.get(`/events?personId=${personId}&limit=50`);
      setHistory(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  // --- HANDLERS ---
  const handleAssignTag = async (tagId: string) => {
    if (!tagId || !personToEdit) return;
    try {
      await api.post("/tags/assign", { personId: personToEdit.id, tagId });
      fetchTags(personToEdit.id);
      setTimeout(() => fetchHistory(personToEdit.id), 500);
    } catch (e) {
      alert("Error al asignar");
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!personToEdit) return;
    try {
      await api.post("/tags/remove", { personId: personToEdit.id, tagId });
      fetchTags(personToEdit.id);
    } catch (e) {
      alert("Error al quitar");
    }
  };

  const handleCreateTag = async () => {
    if (!newTagInput.trim()) return;
    try {
      const res = await api.post("/tags", {
        name: newTagInput.trim(),
        color: "#3b82f6",
      });
      const newTag = res.data;

      // Actualizamos localmente sin esperar al prop del padre
      setLocalTags((prev) => [...prev, newTag]);

      if (personToEdit) handleAssignTag(newTag.id);
      setNewTagInput("");
    } catch (e) {
      alert("Error al crear etiqueta");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing) await api.patch(`/persons/${personToEdit.id}`, formData);
      else await api.post("/persons", formData);

      onSuccess();
      onClose();
    } catch (error) {
      alert("Error al guardar.");
    }
  };

  // --- HELPERS ---
  const getStatusColor = (status: string) => {
    switch (status) {
      case "VISITED":
        return "bg-emerald-600 border-emerald-500 text-white";
      case "VISITED_PC":
        return "bg-purple-600 border-purple-500 text-white";
      case "CONTACTED":
        return "bg-blue-600 border-blue-500 text-white";
      case "TO_VISIT":
        return "bg-amber-600 border-amber-500 text-white";
      default:
        return "bg-zinc-800 border-zinc-700 text-zinc-400";
    }
  };

  const formatEvent = (event: any) => {
    const date = new Date(event.created_at).toLocaleString("es-PY", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    let text = event.event_type;
    let icon = <div className="w-2 h-2 rounded-full bg-zinc-500" />;

    if (event.event_type === "TAG_ASSIGNED") {
      const tagName =
        localTags.find((t) => t.id === event.payload?.tagId)?.name ||
        "Etiqueta";
      text = `Asignó: "${tagName}"`;
      icon = <Tag size={14} className="text-blue-500" />;
    } else if (event.event_type === "PERSON_UPDATED") {
      text = event.payload?.details || "Datos actualizados";
      icon = <Save size={14} className="text-orange-500" />;
    }

    return (
      <div
        key={event.id}
        className="flex gap-3 items-start pb-3 border-b border-zinc-800/50 mb-3 last:border-0"
      >
        <div className="mt-1">{icon}</div>
        <div className="text-sm">
          <p className="text-zinc-300 font-medium leading-tight">{text}</p>
          <span className="text-[10px] text-zinc-500">
            {date} • {event.actor_name}
          </span>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* CABECERA */}
        <div className="border-b border-zinc-800 bg-zinc-900/50 rounded-t-2xl">
          <div className="p-6 flex justify-between items-center pb-2">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {isEditing ? (
                  <>
                    <User size={20} /> Perfil 360°
                  </>
                ) : (
                  <>
                    <Plus size={20} /> Nueva Persona
                  </>
                )}
              </h2>
              {isEditing && (
                <p className="text-zinc-400 text-xs mt-1 font-mono">
                  CI: {personToEdit.document_id}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-white bg-zinc-800 p-2 rounded-full"
            >
              <X size={18} />
            </button>
          </div>

          {isEditing && (
            <div className="flex px-6 gap-6">
              <button
                onClick={() => setActiveTab("details")}
                className={`pb-3 text-sm font-bold border-b-2 ${activeTab === "details" ? "border-white text-white" : "border-transparent text-zinc-500"}`}
              >
                FICHA
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 ${activeTab === "history" ? "border-white text-white" : "border-transparent text-zinc-500"}`}
              >
                <History size={14} /> BITÁCORA
              </button>
            </div>
          )}
        </div>

        {/* CONTENIDO */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1">
          {activeTab === "details" ? (
            <form id="person-form" onSubmit={handleSave} className="space-y-6">
              {/* ETIQUETAS */}
              {isEditing && (
                <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-black text-zinc-400 uppercase flex items-center gap-2">
                      <Tag size={12} /> Etiquetas
                    </h3>
                    <div className="flex gap-2">
                      <select
                        className="bg-black border border-zinc-700 text-xs text-white rounded px-2 outline-none"
                        onChange={(e) => {
                          handleAssignTag(e.target.value);
                          e.target.value = "";
                        }}
                      >
                        <option value="">+ Asignar</option>
                        {localTags.map((tag) => (
                          <option key={tag.id} value={tag.id}>
                            {tag.name}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1">
                        <input
                          className="bg-black border border-zinc-700 text-xs text-white rounded px-2 py-1 w-24 outline-none"
                          placeholder="Nueva..."
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={handleCreateTag}
                          className="bg-blue-600 text-white p-1 rounded"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {assignedTags.length > 0 ? (
                      assignedTags.map((tag) => (
                        <span
                          key={tag.id}
                          className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-300 flex items-center gap-2"
                        >
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: tag.color || "#fff" }}
                          ></div>
                          {tag.name}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag.id)}
                            className="hover:text-red-500"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-zinc-600 italic">
                        Sin etiquetas.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* ESTADOS */}
              <div className="space-y-4">
                {/* BOTONERA DE ESTADO */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex flex-wrap items-center gap-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase w-full">
                    ESTADO ACTUAL:
                  </label>
                  {[
                    { id: "NOT_VISITED", label: "❌ NO VISITADO" },
                    { id: "TO_VISIT", label: "⏳ POR VISITAR" },
                    { id: "CONTACTED", label: "📞 CONTACTADO" },
                    { id: "VISITED", label: "✅ VISITADO" },
                    { id: "VISITED_PC", label: "🏢 PASÓ POR PC" },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, campaignStatus: st.id })
                      }
                      className={`px-3 py-1.5 rounded-md text-[10px] font-bold border transition-all ${formData.campaignStatus === st.id ? getStatusColor(st.id) : "bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-700"}`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">
                      TELÉFONO
                    </label>
                    <div className="relative">
                      <Phone
                        className="absolute left-3 top-2.5 text-zinc-600"
                        size={14}
                      />
                      <input
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 p-2.5 text-sm text-white focus:border-emerald-500 outline-none"
                        placeholder="09xx..."
                        value={formData.phoneNumber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            phoneNumber: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">
                      BARRIO REAL
                    </label>
                    <div className="relative">
                      <MapPin
                        className="absolute left-3 top-2.5 text-zinc-600"
                        size={16}
                      />
                      <input
                        list="address-options"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-10 p-2.5 text-white focus:border-emerald-500 outline-none"
                        value={formData.address}
                        onChange={(e) =>
                          setFormData({ ...formData, address: e.target.value })
                        }
                        placeholder="Seleccione..."
                      />
                      <datalist id="address-options">
                        {availableAddresses.map((addr) => (
                          <option key={addr} value={addr} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                </div>
              </div>

              {/* LOGÍSTICA DÍA D */}
              <div className="bg-blue-900/10 border border-blue-900/30 p-4 rounded-xl">
                <h3 className="text-xs font-black text-blue-400 uppercase mb-3 flex items-center gap-2">
                  <Car size={14} /> Logística Día D
                </h3>
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 accent-blue-500"
                    checked={formData.needsTransport}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        needsTransport: e.target.checked,
                      })
                    }
                  />
                  <span className="text-sm font-bold text-white">
                    ¿Necesita transporte?
                  </span>
                </label>

                {formData.needsTransport && (
                  <div className="grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-top-2">
                    {[
                      { id: "PENDING", label: "⚠️ PENDIENTE" },
                      { id: "ASSIGNED", label: "🚙 ASIGNADO" },
                      { id: "COMPLETED", label: "🏁 LISTO" },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, transportStatus: st.id })
                        }
                        className={`py-2 rounded-lg text-[10px] font-bold border ${formData.transportStatus === st.id ? "bg-blue-600 border-blue-500 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-500"}`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* NOTAS */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">
                    INTENCIÓN DE VOTO
                  </label>
                </div>
                <select
                  className={`w-full p-2 mb-4 rounded-lg text-sm font-bold outline-none border ${formData.currentVoteIntent === "SURE" ? "bg-emerald-950/30 border-emerald-900 text-emerald-400" : formData.currentVoteIntent === "OPPOSITION" ? "bg-red-950/30 border-red-900 text-red-400" : "bg-zinc-900 border-zinc-800 text-white"}`}
                  value={formData.currentVoteIntent}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      currentVoteIntent: e.target.value,
                    })
                  }
                >
                  <option value="SURE">🟢 VOTO SEGURO</option>
                  <option value="PROBABLE">🟡 PROBABLE</option>
                  <option value="UNDECIDED">⚪ INDECISO</option>
                  <option value="OPPOSITION">🔴 OPOSICIÓN</option>
                </select>

                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">
                  NOTAS
                </label>
                <textarea
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white h-24 focus:border-purple-500 outline-none resize-none"
                  placeholder="Escribe aquí..."
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {loadingHistory ? (
                <p className="text-zinc-500 text-center py-10 animate-pulse">
                  Cargando...
                </p>
              ) : history.length > 0 ? (
                history.map(formatEvent)
              ) : (
                <div className="text-center py-10 text-zinc-600">
                  <History size={40} className="mx-auto mb-2 opacity-20" />
                  <p>Sin historial.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 rounded-b-2xl flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 font-bold text-zinc-400 hover:text-white transition-colors"
          >
            CANCELAR
          </button>
          {activeTab === "details" && (
            <button
              form="person-form"
              type="submit"
              className="flex-1 bg-white text-black py-3 rounded-xl font-black hover:bg-zinc-200 flex items-center justify-center gap-2"
            >
              <Save size={18} /> {isEditing ? "GUARDAR" : "REGISTRAR"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
