"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDebounce } from "use-debounce";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Eye,
  Filter,
  Edit,
  MapPin,
  Search,
  Flag,
  User,
  Trash2,
  Pen,
  Save,
  X,
} from "lucide-react";
import api from "../../../../lib/api";
import { getApiErrorMessage } from "../../../../lib/api-error";
import { toast } from "sonner";
import PersonModal from "../../persons/components/PersonModal";
import FilterModal from "../../persons/components/FilterModal";
import BulkUpdateModal from "../../persons/components/BulkUpdateModal";

type SortDirection = "ASC" | "DESC";

const columnLabels = {
  document: "Cedula",
  name: "Nombre",
  order: "Orden",
  table: "Mesa",
  place: "Local",
  district: "Distrito",
  department: "Departamento",
  address: "Direccion",
  exactAddress: "Direccion exacta",
  phone: "Telefono",
  whatsapp: "WhatsApp",
  party: "Partido",
  affiliationDate: "Fecha afiliacion",
  birthdate: "Nacimiento",
  sex: "Sexo",
  intent: "Intencion",
  status: "Voto",
  campaign: "Estado visita",
  isVisited: "Visitado",
  transport: "Transporte",
  transportStatus: "Estado transporte",
  dayDStatus: "Estado Dia D",
  checkin: "Check-in",
  requests: "Pedidos",
  financial: "Aporte",
  financialFulfilled: "Aporte entregado",
  financialAmount: "Monto aporte",
  assignedStation: "Puesto",
  assignedUser: "Responsable",
  notes: "Notas",
  actions: "Acciones",
} as const;

type SmartListColumnKey = keyof typeof columnLabels;
type SmartListColumns = Record<SmartListColumnKey, boolean>;

const createDefaultColumns = (): SmartListColumns => ({
  document: true,
  name: true,
  order: true,
  table: true,
  place: false,
  district: false,
  department: false,
  address: true,
  exactAddress: false,
  phone: true,
  whatsapp: false,
  party: true,
  affiliationDate: false,
  birthdate: false,
  sex: false,
  intent: true,
  status: true,
  campaign: true,
  isVisited: false,
  transport: true,
  transportStatus: false,
  dayDStatus: false,
  checkin: false,
  requests: false,
  financial: false,
  financialFulfilled: false,
  financialAmount: false,
  assignedStation: false,
  assignedUser: false,
  notes: false,
  actions: true,
});

const sortableColumns: Partial<Record<SmartListColumnKey, string>> = {
  document: "document_id",
  name: "last_name",
  order: "voting_order_number",
  table: "voting_table_number",
  place: "location_place",
  district: "location_district",
  department: "location_department",
  address: "address",
  phone: "phone_number",
  whatsapp: "whatsapp_number",
  party: "party_affiliation",
  affiliationDate: "party_affiliation_date",
  birthdate: "birthdate",
  sex: "sex",
  intent: "current_vote_intent",
  status: "has_voted",
  campaign: "campaign_status",
  isVisited: "is_visited",
  transport: "needs_transport",
  transportStatus: "transport_status",
  dayDStatus: "status_day_d",
  checkin: "station_checkin_at",
  financial: "has_financial_needs",
  financialFulfilled: "financial_needs_fulfilled",
  financialAmount: "financial_amount",
  assignedStation: "assigned_station_id",
  assignedUser: "assigned_user_id",
};

const columnStoragePrefix = "smart-list-columns:";

const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
};

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

const getRequestsCount = (value: any) => {
  if (!value) return 0;
  if (Array.isArray(value)) return value.length;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
};

export default function SmartListPage() {
  const params = useParams();
  const router = useRouter();
  const listId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [listData, setListData] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [query] = useDebounce(search, 500);

  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState("");

  const [personToEdit, setPersonToEdit] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [sorting, setSorting] = useState<{ field: string; dir: SortDirection } | null>(null);

  const [columns, setColumns] = useState<SmartListColumns>(createDefaultColumns);

  const [availableAddresses, setAvailableAddresses] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [availableStations, setAvailableStations] = useState<any[]>([]);

  const visibleColumnCount = Math.max(1, Object.values(columns).filter(Boolean).length);

  const usersById = useMemo(() => {
    return new Map(
      availableUsers.map((u) => [u.id, u.full_name || u.name || u.email || u.id])
    );
  }, [availableUsers]);

  const stationsById = useMemo(() => {
    return new Map(availableStations.map((s) => [s.id, s.name || s.id]));
  }, [availableStations]);

  const getUserName = (userId?: string) => {
    if (!userId) return "-";
    return usersById.get(userId) || userId;
  };

  const getStationName = (stationId?: string) => {
    if (!stationId) return "-";
    return stationsById.get(stationId) || stationId;
  };

  const getPartyColor = (party?: string) => {
    if (!party) return "text-zinc-500";
    if (party.includes("ANR")) return "text-red-500 font-bold";
    if (party.includes("PLRA")) return "text-blue-500 font-bold";
    return "text-zinc-300";
  };

  const getCampaignStatusLabel = (status?: string) => {
    if (!status || status === "NOT_VISITED") return "SIN VISITAR";
    return status;
  };

  useEffect(() => {
    if (!listId) return;
    fetchListMembers();
  }, [listId, query, sorting]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const results = await Promise.allSettled([
          api.get("/persons/addresses"),
          api.get("/tags"),
          api.get("/users"),
          api.get("/stations"),
        ]);
        const [resAddr, resTags, resUsers, resStations] = results;

        if (resAddr.status === "fulfilled") setAvailableAddresses(resAddr.value.data);
        if (resTags.status === "fulfilled") setAvailableTags(resTags.value.data);
        if (resUsers.status === "fulfilled") setAvailableUsers(resUsers.value.data);
        if (resStations.status === "fulfilled") setAvailableStations(resStations.value.data);
      } catch {
        // silently ignore
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!listId) return;
    setColumns(createDefaultColumns());
    if (typeof window === "undefined") return;

    try {
      const stored = window.localStorage.getItem(`${columnStoragePrefix}${listId}`);
      if (!stored) return;

      const parsed = JSON.parse(stored);
      const nextColumns = createDefaultColumns();
      for (const key of Object.keys(nextColumns) as SmartListColumnKey[]) {
        if (typeof parsed?.[key] === "boolean") {
          nextColumns[key] = parsed[key];
        }
      }
      if (!Object.values(nextColumns).some(Boolean)) {
        nextColumns.actions = true;
      }
      setColumns(nextColumns);
    } catch {
      // silently ignore
    }
  }, [listId]);

  useEffect(() => {
    if (!listId || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        `${columnStoragePrefix}${listId}`,
        JSON.stringify(columns)
      );
    } catch {
      // silently ignore
    }
  }, [columns, listId]);

  const fetchListMembers = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (query.trim()) params.q = query.trim();
      if (sorting) {
        params.sortBy = sorting.field;
        params.sortDir = sorting.dir;
      }
      const res = await api.get(`/lists/${listId}/members`, { params });
      const data = res.data;
      setListData({ ...data, filters: data.filtersApplied || data.filters });
      setMembers(data.members || []);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async () => {
    if (!newName.trim()) return;
    try {
      await api.patch(`/lists/${listId}`, { name: newName });
      setListData((prev: any) => ({ ...prev, listName: newName }));
      setIsRenaming(false);
      toast.success("Lista renombrada.");
    } catch {
      toast.error("Error al renombrar");
    }
  };

  const handleDeleteList = async () => {
    if (!confirm("Estas seguro de ELIMINAR esta lista para siempre?")) return;
    try {
      await api.delete(`/lists/${listId}`);
      toast.success("Lista eliminada.");
      router.push("/dashboard/lists");
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Error al eliminar"));
    }
  };

  const handleUpdateListFilters = async (newFilters: any) => {
    try {
      await api.patch(`/lists/${listId}`, { filters: newFilters });
      setShowFilters(false);
      await fetchListMembers();
      toast.success("Criterios actualizados.");
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Error actualizando la lista"));
    }
  };

  const toggleColumn = (column: keyof SmartListColumns) => {
    const visibleCount = Object.values(columns).filter(Boolean).length;
    if (columns[column] && visibleCount === 1) return;
    setColumns((prev) => ({ ...prev, [column]: !prev[column] }));
  };

  const handleSort = (column: SmartListColumnKey) => {
    const sortField = sortableColumns[column];
    if (!sortField) return;

    setSorting((prev) => {
      if (!prev || prev.field !== sortField) return { field: sortField, dir: "ASC" };
      return { field: sortField, dir: prev.dir === "ASC" ? "DESC" : "ASC" };
    });
  };

  const SortIcon = ({ column }: { column: SmartListColumnKey }) => {
    const sortField = sortableColumns[column];
    if (!sortField) return null;
    if (!sorting || sorting.field !== sortField) return <div className="w-4" />;
    return sorting.dir === "ASC" ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const renderHeader = (
    column: SmartListColumnKey,
    className = "p-4",
    label = columnLabels[column]
  ) => {
    if (!columns[column]) return null;
    const sortable = !!sortableColumns[column];
    return (
      <th
        className={`${className} ${sortable ? "cursor-pointer hover:text-white" : ""}`}
        onClick={sortable ? () => handleSort(column) : undefined}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          {sortable ? <SortIcon column={column} /> : null}
        </span>
      </th>
    );
  };

  return (
    <div className="p-6 h-full flex flex-col relative z-0">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            {loading ? (
              <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse" />
            ) : (
              <div className="flex items-center gap-3">
                {isRenaming ? (
                  <div className="flex items-center gap-2">
                    <input
                      className="bg-black border border-zinc-700 rounded px-2 py-1 text-xl font-bold text-white outline-none focus:border-blue-500"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      autoFocus
                    />
                    <button onClick={handleRename} className="p-1 bg-green-900/50 text-green-400 rounded hover:bg-green-900">
                      <Save size={18} />
                    </button>
                    <button onClick={() => setIsRenaming(false)} className="p-1 bg-red-900/50 text-red-400 rounded hover:bg-red-900">
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <h1 className="text-2xl font-black text-white flex items-center gap-2 group relative">
                    {listData?.listName}
                    <span className="text-xs font-normal bg-blue-900/30 text-blue-400 px-2 py-1 rounded-full border border-blue-800">
                      Lista Inteligente
                    </span>
                    <button
                      onClick={() => {
                        setIsRenaming(true);
                        setNewName(listData?.listName || "");
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-white transition-opacity"
                    >
                      <Pen size={14} />
                    </button>
                  </h1>
                )}
              </div>
            )}
            <p className="text-zinc-500 text-sm mt-1">
              {loading ? "Cargando..." : `${listData?.total || 0} personas buscan este criterio`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          <div className="relative">
            <button
              onClick={() => setShowColumnMenu((prev) => !prev)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${
                showColumnMenu
                  ? "bg-zinc-800 border-zinc-600 text-white"
                  : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-600"
              }`}
            >
              <Eye size={16} /> Vistas
            </button>
            {showColumnMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowColumnMenu(false)}></div>
                <div className="absolute right-0 top-12 bg-zinc-900 border border-zinc-700 p-3 rounded-xl shadow-xl z-20 w-56 max-h-96 overflow-y-auto space-y-2">
                  <p className="text-xs font-bold text-zinc-500 uppercase mb-2">Mostrar Columnas</p>
                  {(Object.keys(columns) as Array<keyof SmartListColumns>).map((columnKey) => (
                    <label
                      key={columnKey}
                      className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer hover:bg-zinc-800 p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={columns[columnKey]}
                        onChange={() => toggleColumn(columnKey)}
                        className="rounded bg-black border-zinc-600 text-white focus:ring-0"
                      />
                      <span>{columnLabels[columnKey]}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setShowFilters(true)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors text-sm font-bold"
          >
            <Filter size={16} /> Criterios
          </button>

          <button
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-yellow-500 hover:text-yellow-400 hover:border-yellow-600 transition-colors text-sm font-bold"
            title="Edicion Masiva"
          >
            <Edit size={16} /> Masivo
          </button>

          <div className="h-8 w-[1px] bg-zinc-800 mx-2"></div>

          <button
            onClick={handleDeleteList}
            className="flex items-center gap-2 px-4 py-2 bg-red-950/20 border border-red-900/30 rounded-lg text-red-400 hover:bg-red-900/40 hover:text-red-200 transition-colors text-sm font-bold"
          >
            <Trash2 size={16} /> Eliminar Lista
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-3.5 text-zinc-500" size={20} />
          <input
            type="text"
            placeholder="Buscar por Cedula, Nombre, Apellido..."
            className="w-full bg-zinc-900 border border-zinc-800 text-white pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-white focus:outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm relative z-0">
        <div className="overflow-x-auto h-full">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-black text-zinc-500 uppercase text-xs font-bold tracking-wider border-b border-zinc-800 sticky top-0 z-10">
              <tr>
                {renderHeader("document")}
                {renderHeader("name")}
                {renderHeader("order", "p-4 text-center")}
                {renderHeader("table", "p-4 text-center")}
                {renderHeader("place")}
                {renderHeader("district")}
                {renderHeader("department")}
                {renderHeader("address")}
                {renderHeader("exactAddress")}
                {renderHeader("phone")}
                {renderHeader("whatsapp")}
                {renderHeader("party")}
                {renderHeader("affiliationDate")}
                {renderHeader("birthdate")}
                {renderHeader("sex")}
                {renderHeader("intent")}
                {renderHeader("status")}
                {renderHeader("campaign")}
                {renderHeader("isVisited")}
                {renderHeader("transport")}
                {renderHeader("transportStatus")}
                {renderHeader("dayDStatus")}
                {renderHeader("checkin")}
                {renderHeader("requests", "p-4 text-center")}
                {renderHeader("financial")}
                {renderHeader("financialFulfilled")}
                {renderHeader("financialAmount", "p-4 text-right")}
                {renderHeader("assignedStation")}
                {renderHeader("assignedUser")}
                {renderHeader("notes")}
                {columns.actions && <th className="p-4 text-right">#</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={visibleColumnCount} className="p-4">
                      <div className="h-6 bg-zinc-800/50 rounded w-full animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : members.length > 0 ? (
                members.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-800/40 transition-colors group">
                    {columns.document && <td className="p-4 font-mono text-white">{p.document_id}</td>}
                    {columns.name && <td className="p-4 font-bold text-zinc-200">{p.last_name}, {p.first_name}</td>}
                    {columns.order && <td className="p-4 text-center font-mono text-zinc-500 bg-black/20">{p.voting_order_number ?? "-"}</td>}
                    {columns.table && <td className="p-4 text-center font-mono text-zinc-500">{p.voting_table_number ?? "-"}</td>}
                    {columns.place && <td className="p-4 text-xs text-zinc-300">{p.location_place || "-"}</td>}
                    {columns.district && <td className="p-4 text-xs text-zinc-300">{p.location_district || "-"}</td>}
                    {columns.department && <td className="p-4 text-xs text-zinc-300">{p.location_department || "-"}</td>}
                    {columns.address && (
                      <td className="p-4">
                        <div className="flex items-center gap-2" title={p.address}>
                          <MapPin size={14} className="text-zinc-600" />
                          <span className="truncate max-w-[150px]">{p.address || "-"}</span>
                        </div>
                      </td>
                    )}
                    {columns.exactAddress && (
                      <td className="p-4">
                        <div className="max-w-[220px] truncate text-xs" title={p.exact_address}>
                          {p.exact_address || "-"}
                        </div>
                      </td>
                    )}
                    {columns.phone && <td className="p-4 text-xs font-mono text-zinc-400">{p.phone_number || "-"}</td>}
                    {columns.whatsapp && <td className="p-4 text-xs font-mono text-zinc-400">{p.whatsapp_number || "-"}</td>}
                    {columns.party && (
                      <td className="p-4">
                        <span className={`text-xs flex items-center gap-1 ${getPartyColor(p.party_affiliation)}`}>
                          {p.party_affiliation ? <Flag size={12} fill="currentColor" /> : null}
                          {p.party_affiliation || "-"}
                        </span>
                      </td>
                    )}
                    {columns.affiliationDate && <td className="p-4 text-xs">{formatDate(p.party_affiliation_date)}</td>}
                    {columns.birthdate && <td className="p-4 text-xs">{formatDate(p.birthdate)}</td>}
                    {columns.sex && <td className="p-4 text-xs">{p.sex || "-"}</td>}
                    {columns.intent && (
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.current_vote_intent === "SURE" ? "bg-emerald-900 text-emerald-300" : "bg-zinc-800"}`}>
                          {p.current_vote_intent || "-"}
                        </span>
                      </td>
                    )}
                    {columns.status && (
                      <td className="p-4">
                        {p.has_voted ? (
                          <span className="text-emerald-500 font-bold text-xs">VOTO</span>
                        ) : (
                          <span className="text-zinc-600 text-xs">Pendiente</span>
                        )}
                      </td>
                    )}
                    {columns.campaign && (
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                            p.campaign_status === "VISITED"
                              ? "bg-emerald-900/50 text-emerald-400 border border-emerald-900"
                              : p.campaign_status === "CONTACTED"
                                ? "bg-blue-900/50 text-blue-400 border border-blue-900"
                                : p.campaign_status === "TO_VISIT"
                                  ? "bg-amber-900/50 text-amber-400 border border-amber-900"
                                  : "bg-zinc-800 text-zinc-500"
                          }`}
                        >
                          {getCampaignStatusLabel(p.campaign_status)}
                        </span>
                      </td>
                    )}
                    {columns.isVisited && <td className="p-4 text-xs">{p.is_visited ? "Si" : "No"}</td>}
                    {columns.transport && (
                      <td className="p-4">
                        {p.needs_transport ? (
                          <span className="text-xs flex items-center gap-1 text-purple-400 font-bold">
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                            {p.transport_status || "PENDIENTE"}
                          </span>
                        ) : (
                          <span className="text-zinc-700 text-xs">-</span>
                        )}
                      </td>
                    )}
                    {columns.transportStatus && <td className="p-4 text-xs">{p.transport_status || "-"}</td>}
                    {columns.dayDStatus && <td className="p-4 text-xs">{p.status_day_d || "-"}</td>}
                    {columns.checkin && <td className="p-4 text-xs">{formatDateTime(p.station_checkin_at)}</td>}
                    {columns.requests && (
                      <td className="p-4 text-center text-xs">
                        <span className="bg-zinc-800 px-2 py-0.5 rounded">{getRequestsCount(p.requests)}</span>
                      </td>
                    )}
                    {columns.financial && <td className="p-4 text-xs">{p.has_financial_needs ? "Si" : "No"}</td>}
                    {columns.financialFulfilled && <td className="p-4 text-xs">{p.financial_needs_fulfilled ? "Si" : "No"}</td>}
                    {columns.financialAmount && (
                      <td className="p-4 text-right text-xs font-mono">
                        {p.financial_amount !== null && p.financial_amount !== undefined
                          ? Number(p.financial_amount).toLocaleString()
                          : "-"}
                      </td>
                    )}
                    {columns.assignedStation && <td className="p-4 text-xs">{getStationName(p.assigned_station_id)}</td>}
                    {columns.assignedUser && <td className="p-4 text-xs">{getUserName(p.assigned_user_id)}</td>}
                    {columns.notes && (
                      <td className="p-4">
                        <div className="max-w-[240px] truncate text-xs" title={p.notes}>
                          {p.notes || "-"}
                        </div>
                      </td>
                    )}
                    {columns.actions && (
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setPersonToEdit(p)}
                          className="p-2 hover:bg-zinc-700 rounded-full text-zinc-400 hover:text-white transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={visibleColumnCount} className="p-10 text-center text-zinc-500">
                    <div className="flex flex-col items-center gap-2">
                      <User size={32} className="opacity-20" />
                      <p>Nadie cumple con estos criterios actualmente.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PersonModal
        isOpen={!!personToEdit}
        onClose={() => setPersonToEdit(null)}
        onSuccess={() => {
          setPersonToEdit(null);
          fetchListMembers();
        }}
        personToEdit={personToEdit}
        availableAddresses={availableAddresses}
        availableTags={availableTags}
      />

      <FilterModal
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={handleUpdateListFilters}
        initialValues={listData?.filtersApplied || listData?.filters}
        availableAddresses={availableAddresses}
        availableTags={availableTags}
        availableUsers={availableUsers}
      />

      <BulkUpdateModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onSuccess={() => {
          fetchListMembers();
          toast.success("Actualización completada.");
        }}
        activeFilters={listData?.filtersApplied || listData?.filters || {}}
      />
    </div>
  );
}
