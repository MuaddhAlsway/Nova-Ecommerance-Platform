import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  ClipboardList,
  ListChecks,
  Truck,
  RotateCcw,
  Search,
  RefreshCw,
  Plus,
  Package,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  X,
  ChevronDown,
  MapPin,
} from "lucide-react";
import { API_BASE } from "../config";

type Tab = "dashboard" | "tasks" | "pickLists" | "shipping" | "returns";

const TASK_STATUSES = ["pending", "picking", "packing", "ready_to_ship", "shipped"] as const;
const RETURN_STATUSES = ["pending", "approved", "received", "refunded", "rejected"] as const;

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-white/10 text-white/50",
  picking: "bg-blue-500/10 text-blue-400",
  packing: "bg-amber-500/10 text-amber-400",
  ready_to_ship: "bg-emerald-500/10 text-emerald-400",
  shipped: "bg-purple-500/10 text-purple-400",
  delivered: "bg-green-500/10 text-green-400",
  exception: "bg-red-500/10 text-red-400",
  approved: "bg-blue-500/10 text-blue-400",
  received: "bg-amber-500/10 text-amber-400",
  refunded: "bg-green-500/10 text-green-400",
  rejected: "bg-red-500/10 text-red-400",
};

interface FulfillmentStats {
  pending: number;
  picking: number;
  packing: number;
  ready_to_ship: number;
  shipped: number;
  exceptions: number;
}

interface FulfillmentTask {
  id: number;
  order_id: number;
  order_number?: string;
  customer_name: string;
  items: { product_name: string; quantity: number }[];
  status: string;
  warehouse_name?: string;
  warehouse_id?: number;
  created_at: string;
  updated_at: string;
}

interface PickList {
  id: number;
  warehouse_name?: string;
  warehouse_id?: number;
  status: string;
  created_at: string;
  items: PickListItem[];
}

interface PickListItem {
  id: number;
  product_name: string;
  bin_location?: string;
  quantity: number;
  picked_quantity: number;
  status: string;
}

interface Shipment {
  id?: number;
  tracking_number?: string;
  label_url?: string;
  carrier?: string;
  service?: string;
  rate_id?: string;
  status?: string;
}

interface Return {
  id: number;
  order_id: number;
  customer_name: string;
  reason: string;
  status: string;
  items: { product_name: string; quantity: number; reason?: string }[];
  created_at: string;
}

const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "tasks", label: "Tasks", icon: ClipboardList },
  { id: "pickLists", label: "Pick Lists", icon: ListChecks },
  { id: "shipping", label: "Ship Station", icon: Truck },
  { id: "returns", label: "Returns", icon: RotateCcw },
];

export default function FulfillmentPage() {
  const { user, token, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<FulfillmentStats | null>(null);
  const [tasks, setTasks] = useState<FulfillmentTask[]>([]);
  const [taskFilter, setTaskFilter] = useState<string>("all");
  const [pickLists, setPickLists] = useState<PickList[]>([]);
  const [readyTasks, setReadyTasks] = useState<FulfillmentTask[]>([]);
  const [returns, setReturns] = useState<Return[]>([]);
  const [returnFilter, setReturnFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [showShipModal, setShowShipModal] = useState(false);
  const [shipTask, setShipTask] = useState<FulfillmentTask | null>(null);
  const [shipRateId, setShipRateId] = useState("");
  const [shipFromName, setShipFromName] = useState("");
  const [shipFromAddress, setShipFromAddress] = useState("");
  const [shipFromCity, setShipFromCity] = useState("");
  const [shipFromState, setShipFromState] = useState("");
  const [shipFromZip, setShipFromZip] = useState("");
  const [shipToName, setShipToName] = useState("");
  const [shipToAddress, setShipToAddress] = useState("");
  const [shipToCity, setShipToCity] = useState("");
  const [shipToState, setShipToState] = useState("");
  const [shipToZip, setShipToZip] = useState("");
  const [purchasingLabel, setPurchasingLabel] = useState(false);
  const [shipmentResult, setShipmentResult] = useState<Shipment | null>(null);

  const [showPickModal, setShowPickModal] = useState(false);
  const [pickWarehouseId, setPickWarehouseId] = useState("");
  const [creatingPickList, setCreatingPickList] = useState(false);

  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const authHeaders = useCallback(
    () => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    [token]
  );

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/fulfillment/stats`, { headers: authHeaders() });
      if (res.ok) setStats(await res.json());
    } catch {}
  };

  const fetchTasks = async () => {
    try {
      const params = taskFilter !== "all" ? `?status=${taskFilter}` : "";
      const res = await fetch(`${API_BASE}/api/fulfillment/tasks${params}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTasks(Array.isArray(data) ? data : data.tasks || []);
      }
    } catch {}
  };

  const fetchPickLists = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/fulfillment/pick-lists`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPickLists(Array.isArray(data) ? data : data.pick_lists || []);
      }
    } catch {}
  };

  const fetchReadyTasks = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/fulfillment/tasks?status=ready_to_ship`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setReadyTasks(Array.isArray(data) ? data : data.tasks || []);
      }
    } catch {}
  };

  const fetchReturns = async () => {
    try {
      const params = returnFilter !== "all" ? `?status=${returnFilter}` : "";
      const res = await fetch(`${API_BASE}/api/returns${params}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setReturns(Array.isArray(data) ? data : data.returns || []);
      }
    } catch {}
  };

  useEffect(() => {
    if (!token || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([fetchStats(), fetchTasks(), fetchPickLists(), fetchReadyTasks(), fetchReturns()]).finally(() =>
      setLoading(false)
    );
  }, [token, user]);

  useEffect(() => {
    if (token && user && activeTab === "tasks") fetchTasks();
  }, [taskFilter]);

  useEffect(() => {
    if (token && user && activeTab === "returns") fetchReturns();
  }, [returnFilter]);

  useEffect(() => {
    if (token && user && activeTab === "shipping") fetchReadyTasks();
  }, [activeTab]);

  useEffect(() => {
    if (token && user && activeTab === "pickLists") fetchPickLists();
  }, [activeTab]);

  const updateTaskStatus = async (taskId: number, status: string) => {
    setActionLoading(taskId);
    try {
      const res = await fetch(`${API_BASE}/api/fulfillment/tasks/${taskId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
        fetchStats();
      }
    } catch {}
    setActionLoading(null);
  };

  const autoCreateTasks = async () => {
    setActionLoading(-1);
    try {
      const res = await fetch(`${API_BASE}/api/fulfillment/tasks/auto-create`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (res.ok) {
        fetchTasks();
        fetchStats();
      }
    } catch {}
    setActionLoading(null);
  };

  const createPickList = async () => {
    if (!pickWarehouseId) return;
    setCreatingPickList(true);
    try {
      const res = await fetch(`${API_BASE}/api/fulfillment/pick-lists`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ warehouse_id: Number(pickWarehouseId) }),
      });
      if (res.ok) {
        setShowPickModal(false);
        setPickWarehouseId("");
        fetchPickLists();
      }
    } catch {}
    setCreatingPickList(false);
  };

  const markItemPicked = async (listId: number, itemId: number, quantity: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/fulfillment/pick-lists/${listId}/items/${itemId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ picked_quantity: quantity, status: "picked" }),
      });
      if (res.ok) {
        setPickLists((prev) =>
          prev.map((pl) =>
            pl.id === listId
              ? {
                  ...pl,
                  items: pl.items.map((it) =>
                    it.id === itemId ? { ...it, picked_quantity: quantity, status: "picked" } : it
                  ),
                }
              : pl
          )
        );
      }
    } catch {}
  };

  const openShipModal = (task: FulfillmentTask) => {
    setShipTask(task);
    setShipmentResult(null);
    setShipRateId("");
    setShowShipModal(true);
  };

  const purchaseLabel = async () => {
    if (!shipTask || !shipRateId) return;
    setPurchasingLabel(true);
    try {
      const res = await fetch(`${API_BASE}/api/shipping/shipment`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          rate_id: shipRateId,
          from: { name: shipFromName, address: shipFromAddress, city: shipFromCity, state: shipFromState, zip: shipFromZip },
          to: { name: shipToName, address: shipToAddress, city: shipToCity, state: shipToState, zip: shipToZip },
          task_id: shipTask.id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setShipmentResult(data);
        fetchReadyTasks();
        fetchStats();
      }
    } catch {}
    setPurchasingLabel(false);
  };

  const updateReturnStatus = async (returnId: number, status: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/returns/${returnId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setReturns((prev) => prev.map((r) => (r.id === returnId ? { ...r, status } : r)));
        fetchStats();
      }
    } catch {}
  };

  const filteredTasks = tasks.filter(
    (t) =>
      t.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(t.order_id).includes(searchQuery) ||
      (t.order_number || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredReturns = returns.filter(
    (r) =>
      r.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(r.order_id).includes(searchQuery)
  );

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="text-white/25 text-sm">Loading fulfillment dashboard...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="text-white/25 text-sm">Please sign in to access fulfillment.</div>
      </div>
    );
  }

  const statCards = [
    { label: "Pending Tasks", value: stats?.pending ?? 0, color: "from-white/10 to-white/5", icon: ClipboardList },
    { label: "Picking", value: stats?.picking ?? 0, color: "from-blue-500/10 to-blue-500/5", icon: Search },
    { label: "Packing", value: stats?.packing ?? 0, color: "from-amber-500/10 to-amber-500/5", icon: Package },
    { label: "Ready to Ship", value: stats?.ready_to_ship ?? 0, color: "from-emerald-500/10 to-emerald-500/5", icon: CheckCircle2 },
    { label: "Shipped", value: stats?.shipped ?? 0, color: "from-purple-500/10 to-purple-500/5", icon: Truck },
    { label: "Exceptions", value: stats?.exceptions ?? 0, color: "from-red-500/10 to-red-500/5", icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen bg-[#080808] antialiased">
      <div className="border-b border-white/[0.06] bg-[#050505]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-display text-lg tracking-[0.35em] text-white font-light">NOVA</span>
            <span className="text-[10px] tracking-[0.25em] text-white/25 border border-white/[0.08] px-2.5 py-1 rounded-full">
              FULFILLMENT
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[13px] text-white/40">{user.name}</span>
            <div className="w-8 h-8 rounded-full bg-white/[0.08] border border-white/[0.1] flex items-center justify-center">
              <span className="text-[11px] text-white/60 font-medium">{user.name.charAt(0).toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-56 flex-shrink-0">
            <nav className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSearchQuery("");
                    }}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] transition-all whitespace-nowrap ${
                      activeTab === tab.id
                        ? "bg-white/[0.08] text-white border border-white/[0.1]"
                        : "text-white/40 hover:text-white/70 hover:bg-white/[0.03] border border-transparent"
                    }`}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="flex-1 min-w-0">
            {activeTab === "dashboard" && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="font-display text-3xl text-white mb-1">Fulfillment Overview</h1>
                    <p className="text-white/35 text-[13px]">Warehouse operations at a glance</p>
                  </div>
                  <button
                    onClick={() => {
                      setLoading(true);
                      Promise.all([fetchStats(), fetchTasks(), fetchPickLists(), fetchReadyTasks(), fetchReturns()]).finally(() =>
                        setLoading(false)
                      );
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-[13px] text-white/50 hover:text-white/80 hover:bg-white/[0.08] transition-all"
                  >
                    <RefreshCw size={14} />
                    Refresh
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {statCards.map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.label} className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div
                            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} border border-white/[0.08] flex items-center justify-center`}
                          >
                            <Icon size={18} className="text-white/60" />
                          </div>
                        </div>
                        <p className="font-display text-2xl text-white mb-0.5">{stat.value}</p>
                        <p className="text-[11px] text-white/30 tracking-wide">{stat.label}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/[0.06]">
                    <h2 className="text-[14px] font-medium text-white">Recent Tasks</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/[0.05]">
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">ORDER</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">CUSTOMER</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">ITEMS</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">STATUS</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">WAREHOUSE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tasks.slice(0, 5).map((task) => (
                          <tr key={task.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-3.5 text-[13px] text-white/60 font-mono">#{task.order_id}</td>
                            <td className="px-6 py-3.5 text-[13px] text-white/80">{task.customer_name}</td>
                            <td className="px-6 py-3.5 text-[13px] text-white/50">
                              {task.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0}
                            </td>
                            <td className="px-6 py-3.5">
                              <span
                                className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide ${
                                  STATUS_COLORS[task.status] || "bg-white/10 text-white/50"
                                }`}
                              >
                                {task.status.replace(/_/g, " ")}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 text-[12px] text-white/35">{task.warehouse_name || "—"}</td>
                          </tr>
                        ))}
                        {tasks.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-white/25 text-[13px]">
                              No tasks yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "tasks" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h1 className="font-display text-3xl text-white mb-1">Fulfillment Tasks</h1>
                    <p className="text-white/35 text-[13px]">{tasks.length} tasks total</p>
                  </div>
                  <button
                    onClick={autoCreateTasks}
                    disabled={actionLoading === -1}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-black text-[13px] font-medium rounded-full hover:bg-white/90 transition-colors disabled:opacity-50"
                  >
                    <Plus size={14} />
                    {actionLoading === -1 ? "Creating..." : "Auto-Create Tasks"}
                  </button>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                    <input
                      type="text"
                      placeholder="Search by order, customer..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/[0.05] border border-white/[0.08] text-white placeholder:text-white/20 rounded-xl pl-11 pr-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                    />
                  </div>
                  <div className="relative">
                    <select
                      value={taskFilter}
                      onChange={(e) => setTaskFilter(e.target.value)}
                      className="appearance-none pl-4 pr-9 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-[13px] text-white/70 outline-none cursor-pointer hover:border-white/[0.15] transition-colors"
                    >
                      <option value="all" className="bg-[#0d0d0d]">All Status</option>
                      {TASK_STATUSES.map((s) => (
                        <option key={s} value={s} className="bg-[#0d0d0d]">
                          {s.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                  </div>
                </div>

                <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/[0.05]">
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">ORDER</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">CUSTOMER</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">ITEMS</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">STATUS</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">WAREHOUSE</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTasks.map((task) => (
                          <tr key={task.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-3.5 text-[13px] text-white/60 font-mono">
                              #{task.order_number || task.order_id}
                            </td>
                            <td className="px-6 py-3.5 text-[13px] text-white/80">{task.customer_name}</td>
                            <td className="px-6 py-3.5 text-[13px] text-white/50">
                              {task.items?.map((i) => `${i.product_name} x${i.quantity}`).join(", ") || "—"}
                            </td>
                            <td className="px-6 py-3.5">
                              <span
                                className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide ${
                                  STATUS_COLORS[task.status] || "bg-white/10 text-white/50"
                                }`}
                              >
                                {task.status.replace(/_/g, " ")}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 text-[12px] text-white/35">{task.warehouse_name || "—"}</td>
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-2">
                                {task.status === "pending" && (
                                  <button
                                    onClick={() => updateTaskStatus(task.id, "picking")}
                                    disabled={actionLoading === task.id}
                                    className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-[11px] font-medium hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                                  >
                                    Start Picking
                                  </button>
                                )}
                                {task.status === "picking" && (
                                  <button
                                    onClick={() => updateTaskStatus(task.id, "packing")}
                                    disabled={actionLoading === task.id}
                                    className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 text-[11px] font-medium hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                                  >
                                    Start Packing
                                  </button>
                                )}
                                {task.status === "packing" && (
                                  <button
                                    onClick={() => updateTaskStatus(task.id, "ready_to_ship")}
                                    disabled={actionLoading === task.id}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[11px] font-medium hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                                  >
                                    Mark Ready
                                  </button>
                                )}
                                {task.status === "ready_to_ship" && (
                                  <button
                                    onClick={() => updateTaskStatus(task.id, "shipped")}
                                    disabled={actionLoading === task.id}
                                    className="px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 text-[11px] font-medium hover:bg-purple-500/20 transition-colors disabled:opacity-50"
                                  >
                                    Ship
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredTasks.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-white/25 text-[13px]">
                              No tasks found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "pickLists" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="font-display text-3xl text-white mb-1">Pick Lists</h1>
                    <p className="text-white/35 text-[13px]">{pickLists.length} pick lists</p>
                  </div>
                  <button
                    onClick={() => setShowPickModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-black text-[13px] font-medium rounded-full hover:bg-white/90 transition-colors"
                  >
                    <Plus size={14} />
                    New Pick List
                  </button>
                </div>

                <div className="space-y-4">
                  {pickLists.map((pl) => (
                    <div key={pl.id} className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl overflow-hidden">
                      <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <h3 className="text-[14px] font-medium text-white">Pick List #{pl.id}</h3>
                          <span className="text-[11px] text-white/30">{pl.warehouse_name || `Warehouse ${pl.warehouse_id}`}</span>
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide ${
                              pl.status === "completed" ? "bg-emerald-500/10 text-emerald-400" : "bg-white/10 text-white/50"
                            }`}
                          >
                            {pl.status}
                          </span>
                        </div>
                        <span className="text-[11px] text-white/30">{new Date(pl.created_at).toLocaleDateString()}</span>
                      </div>
                      {pl.items && pl.items.length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-white/[0.05]">
                                <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">BIN</th>
                                <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">PRODUCT</th>
                                <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">QTY</th>
                                <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">PICKED</th>
                                <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">STATUS</th>
                                <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">ACTION</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pl.items.map((item) => (
                                <tr key={item.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                                  <td className="px-6 py-3.5 text-[12px] text-white/50 font-mono">
                                    <div className="flex items-center gap-1.5">
                                      <MapPin size={12} className="text-white/25" />
                                      {item.bin_location || "—"}
                                    </div>
                                  </td>
                                  <td className="px-6 py-3.5 text-[13px] text-white/80">{item.product_name}</td>
                                  <td className="px-6 py-3.5 text-[13px] text-white/60">{item.quantity}</td>
                                  <td className="px-6 py-3.5 text-[13px] text-white/60">{item.picked_quantity}</td>
                                  <td className="px-6 py-3.5">
                                    <span
                                      className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide ${
                                        item.status === "picked"
                                          ? "bg-emerald-500/10 text-emerald-400"
                                          : "bg-white/10 text-white/50"
                                      }`}
                                    >
                                      {item.status}
                                    </span>
                                  </td>
                                  <td className="px-6 py-3.5">
                                    {item.status !== "picked" && (
                                      <button
                                        onClick={() => markItemPicked(pl.id, item.id, item.quantity)}
                                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[11px] font-medium hover:bg-emerald-500/20 transition-colors"
                                      >
                                        Mark Picked
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {(!pl.items || pl.items.length === 0) && (
                        <div className="px-6 py-8 text-center text-white/25 text-[13px]">No items in this pick list</div>
                      )}
                    </div>
                  ))}
                  {pickLists.length === 0 && (
                    <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-12 text-center">
                      <ListChecks size={40} className="mx-auto text-white/20 mb-4" />
                      <p className="text-white/45 text-[13px]">No pick lists created yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "shipping" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="font-display text-3xl text-white mb-1">Ship Station</h1>
                    <p className="text-white/35 text-[13px]">{readyTasks.length} orders ready to ship</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {readyTasks.map((task) => (
                    <div key={task.id} className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-[13px] text-white/80 font-medium">
                            Order #{task.order_number || task.order_id}
                          </p>
                          <p className="text-[12px] text-white/40 mt-1">{task.customer_name}</p>
                        </div>
                        <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide bg-emerald-500/10 text-emerald-400">
                          ready to ship
                        </span>
                      </div>

                      <div className="mb-4 space-y-1">
                        {task.items?.map((item, idx) => (
                          <p key={idx} className="text-[12px] text-white/40">
                            {item.product_name} x{item.quantity}
                          </p>
                        ))}
                      </div>

                      <button
                        onClick={() => openShipModal(task)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-black text-[13px] font-medium rounded-full hover:bg-white/90 transition-colors"
                      >
                        <Truck size={14} />
                        Purchase Label
                      </button>
                    </div>
                  ))}
                  {readyTasks.length === 0 && (
                    <div className="col-span-full bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-12 text-center">
                      <Truck size={40} className="mx-auto text-white/20 mb-4" />
                      <p className="text-white/45 text-[13px]">No orders ready to ship</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "returns" && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-display text-3xl text-white mb-1">Returns</h1>
                  <p className="text-white/35 text-[13px]">{returns.length} returns total</p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                    <input
                      type="text"
                      placeholder="Search by customer, order..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/[0.05] border border-white/[0.08] text-white placeholder:text-white/20 rounded-xl pl-11 pr-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                    />
                  </div>
                  <div className="relative">
                    <select
                      value={returnFilter}
                      onChange={(e) => setReturnFilter(e.target.value)}
                      className="appearance-none pl-4 pr-9 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-[13px] text-white/70 outline-none cursor-pointer hover:border-white/[0.15] transition-colors"
                    >
                      <option value="all" className="bg-[#0d0d0d]">All Status</option>
                      {RETURN_STATUSES.map((s) => (
                        <option key={s} value={s} className="bg-[#0d0d0d]">
                          {s}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-4">
                  {filteredReturns.map((ret) => (
                    <div key={ret.id} className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl overflow-hidden">
                      <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-4">
                          <h3 className="text-[14px] font-medium text-white">Return #{ret.id}</h3>
                          <span className="text-[12px] text-white/40">Order #{ret.order_id}</span>
                          <span className="text-[12px] text-white/40">{ret.customer_name}</span>
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide ${
                              STATUS_COLORS[ret.status] || "bg-white/10 text-white/50"
                            }`}
                          >
                            {ret.status}
                          </span>
                        </div>
                        <span className="text-[11px] text-white/30">{new Date(ret.created_at).toLocaleDateString()}</span>
                      </div>

                      <div className="px-6 py-4 space-y-3">
                        <div className="bg-white/[0.03] rounded-xl px-4 py-3">
                          <p className="text-[10px] text-white/25 tracking-wider mb-1">REASON</p>
                          <p className="text-[13px] text-white/60">{ret.reason || "No reason provided"}</p>
                        </div>

                        {ret.items && ret.items.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[10px] text-white/25 tracking-wider">ITEMS</p>
                            {ret.items.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-white/[0.02] rounded-xl px-4 py-3">
                                <div>
                                  <p className="text-[13px] text-white/70">{item.product_name}</p>
                                  {item.reason && <p className="text-[11px] text-white/30 mt-0.5">{item.reason}</p>}
                                </div>
                                <span className="text-[12px] text-white/40">x{item.quantity}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-2">
                          {ret.status === "pending" && (
                            <>
                              <button
                                onClick={() => updateReturnStatus(ret.id, "approved")}
                                className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-[12px] font-medium hover:bg-emerald-500/20 transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => updateReturnStatus(ret.id, "rejected")}
                                className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 text-[12px] font-medium hover:bg-red-500/20 transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {ret.status === "approved" && (
                            <button
                              onClick={() => updateReturnStatus(ret.id, "received")}
                              className="px-4 py-2 rounded-xl bg-amber-500/10 text-amber-400 text-[12px] font-medium hover:bg-amber-500/20 transition-colors"
                            >
                              Mark Received
                            </button>
                          )}
                          {ret.status === "received" && (
                            <button
                              onClick={() => updateReturnStatus(ret.id, "refunded")}
                              className="px-4 py-2 rounded-xl bg-blue-500/10 text-blue-400 text-[12px] font-medium hover:bg-blue-500/20 transition-colors"
                            >
                              Refund
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredReturns.length === 0 && (
                    <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-12 text-center">
                      <RotateCcw size={40} className="mx-auto text-white/20 mb-4" />
                      <p className="text-white/45 text-[13px]">No returns found</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {showShipModal && shipTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowShipModal(false)} />
          <div className="relative w-full max-w-lg bg-[#0d0d0d] border border-white/[0.08] rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <h3 className="text-[15px] font-medium text-white">Purchase Shipping Label</h3>
              <button
                onClick={() => setShowShipModal(false)}
                className="w-8 h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-white/80 transition-all"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {shipmentResult ? (
                <div className="space-y-4">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-2.5">
                    <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                    <p className="text-emerald-400 text-[13px]">Label purchased successfully</p>
                  </div>

                  {shipmentResult.tracking_number && (
                    <div className="bg-white/[0.03] rounded-xl px-4 py-3">
                      <p className="text-[10px] text-white/25 tracking-wider mb-1">TRACKING NUMBER</p>
                      <p className="text-[14px] text-white/80 font-mono">{shipmentResult.tracking_number}</p>
                    </div>
                  )}

                  {shipmentResult.carrier && (
                    <div className="bg-white/[0.03] rounded-xl px-4 py-3">
                      <p className="text-[10px] text-white/25 tracking-wider mb-1">CARRIER</p>
                      <p className="text-[13px] text-white/70 capitalize">{shipmentResult.carrier}</p>
                    </div>
                  )}

                  {shipmentResult.label_url && (
                    <a
                      href={shipmentResult.label_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-black text-[13px] font-medium rounded-full hover:bg-white/90 transition-colors"
                    >
                      <ExternalLink size={14} />
                      View Label
                    </a>
                  )}
                </div>
              ) : (
                <>
                  <div className="bg-white/[0.03] rounded-xl px-4 py-3">
                    <p className="text-[10px] text-white/25 tracking-wider mb-1">ORDER</p>
                    <p className="text-[13px] text-white/70">
                      #{shipTask.order_number || shipTask.order_id} — {shipTask.customer_name}
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Rate ID</label>
                    <input
                      type="text"
                      value={shipRateId}
                      onChange={(e) => setShipRateId(e.target.value)}
                      className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                      placeholder="Enter rate ID"
                    />
                  </div>

                  <p className="text-[11px] text-white/25 tracking-wider">FROM</p>

                  <div>
                    <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Name</label>
                    <input
                      type="text"
                      value={shipFromName}
                      onChange={(e) => setShipFromName(e.target.value)}
                      className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                      placeholder="Warehouse name"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Address</label>
                    <input
                      type="text"
                      value={shipFromAddress}
                      onChange={(e) => setShipFromAddress(e.target.value)}
                      className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                      placeholder="Street address"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">City</label>
                      <input
                        type="text"
                        value={shipFromCity}
                        onChange={(e) => setShipFromCity(e.target.value)}
                        className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">State</label>
                      <input
                        type="text"
                        value={shipFromState}
                        onChange={(e) => setShipFromState(e.target.value)}
                        className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Zip</label>
                      <input
                        type="text"
                        value={shipFromZip}
                        onChange={(e) => setShipFromZip(e.target.value)}
                        className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-white/25 tracking-wider">TO</p>

                  <div>
                    <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Name</label>
                    <input
                      type="text"
                      value={shipToName}
                      onChange={(e) => setShipToName(e.target.value)}
                      className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                      placeholder="Customer name"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Address</label>
                    <input
                      type="text"
                      value={shipToAddress}
                      onChange={(e) => setShipToAddress(e.target.value)}
                      className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                      placeholder="Street address"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">City</label>
                      <input
                        type="text"
                        value={shipToCity}
                        onChange={(e) => setShipToCity(e.target.value)}
                        className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">State</label>
                      <input
                        type="text"
                        value={shipToState}
                        onChange={(e) => setShipToState(e.target.value)}
                        className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Zip</label>
                      <input
                        type="text"
                        value={shipToZip}
                        onChange={(e) => setShipToZip(e.target.value)}
                        className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    onClick={purchaseLabel}
                    disabled={purchasingLabel || !shipRateId}
                    className="w-full bg-white text-black font-medium rounded-full py-3 text-[13px] hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                  >
                    {purchasingLabel ? "Purchasing..." : "Purchase Label"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showPickModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowPickModal(false)} />
          <div className="relative w-full max-w-md bg-[#0d0d0d] border border-white/[0.08] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <h3 className="text-[15px] font-medium text-white">Create Pick List</h3>
              <button
                onClick={() => setShowPickModal(false)}
                className="w-8 h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-white/80 transition-all"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Warehouse ID</label>
                <input
                  type="number"
                  value={pickWarehouseId}
                  onChange={(e) => setPickWarehouseId(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                  placeholder="Enter warehouse ID"
                />
              </div>

              <button
                onClick={createPickList}
                disabled={creatingPickList || !pickWarehouseId}
                className="w-full bg-white text-black font-medium rounded-full py-3 text-[13px] hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingPickList ? "Creating..." : "Create Pick List"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
