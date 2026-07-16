import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Package,
  Search,
  AlertTriangle,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  Plus,
  X,
  Edit3,
  ClipboardList,
  Warehouse,
  ChevronDown,
  MapPin,
  Loader2,
} from "lucide-react";
import { API_BASE } from "../config";

type Tab = "inventory" | "alerts" | "movements" | "warehouses";

interface InventoryItem {
  id: number;
  product_id: number;
  warehouse_id: number;
  product_name: string;
  product_image?: string;
  warehouse_name: string;
  quantity: number;
  reserved: number;
  available: number;
  reorder_point: number;
  reorder_quantity: number;
  bin_location: string;
}

interface AlertItem {
  id: number;
  product_id: number;
  product_name: string;
  product_image?: string;
  warehouse_name: string;
  quantity: number;
  reserved: number;
  available: number;
  reorder_point: number;
  reorder_quantity: number;
  bin_location: string;
}

interface Movement {
  id: number;
  product_id: number;
  product_name: string;
  warehouse_id: number;
  warehouse_name: string;
  movement_type: string;
  quantity: number;
  notes: string;
  created_at: string;
}

interface WarehouseItem {
  id: number;
  name: string;
  location: string;
  capacity?: number;
  item_count?: number;
}

interface Product {
  id: number;
  name: string;
  image?: string;
}

const MOVEMENT_TYPES = ["inbound", "outbound", "transfer", "adjustment", "return"] as const;

const MOVEMENT_TYPE_COLORS: Record<string, string> = {
  inbound: "bg-emerald-400/15 text-emerald-400",
  outbound: "bg-amber-400/15 text-amber-400",
  transfer: "bg-blue-400/15 text-blue-400",
  adjustment: "bg-purple-400/15 text-purple-400",
  return: "bg-cyan-400/15 text-cyan-400",
};

const MOVEMENT_TYPE_ICONS: Record<string, typeof ArrowDown> = {
  inbound: ArrowDown,
  outbound: ArrowUp,
  transfer: ArrowUpDown,
  adjustment: RefreshCw,
  return: RefreshCw,
};

export default function InventoryPage() {
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("inventory");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [lowStockFilter, setLowStockFilter] = useState(false);

  const [movementFilters, setMovementFilters] = useState({ product: "", warehouse: "", type: "" });

  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editForm, setEditForm] = useState({ quantity: "", reserved: "", reorder_point: "", reorder_quantity: "", bin_location: "" });

  const [showMovementForm, setShowMovementForm] = useState(false);
  const [movementForm, setMovementForm] = useState({ product_id: "", warehouse_id: "", movement_type: "inbound", quantity: "", notes: "" });

  const [showWarehouseForm, setShowWarehouseForm] = useState(false);
  const [warehouseForm, setWarehouseForm] = useState({ name: "", location: "" });

  const [countMode, setCountMode] = useState(false);
  const [countWarehouse, setCountWarehouse] = useState("");
  const [countItems, setCountItems] = useState<Record<number, string>>({});
  const [countSaving, setCountSaving] = useState(false);

  const [saving, setSaving] = useState(false);

  const headers = token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };

  const fetchInventory = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (warehouseFilter) params.set("warehouse_id", warehouseFilter);
      if (searchQuery) params.set("search", searchQuery);
      if (lowStockFilter) params.set("low_stock", "1");
      const res = await fetch(`${API_BASE}/api/inventory?${params.toString()}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setInventory(Array.isArray(data) ? data : data.inventory || data.items || []);
      }
    } catch {}
  }, [warehouseFilter, searchQuery, lowStockFilter, token]);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/inventory/alerts`, { headers });
      if (res.ok) {
        const data = await res.json();
        setAlerts(Array.isArray(data) ? data : data.alerts || data.items || []);
      }
    } catch {}
  }, [token]);

  const fetchMovements = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (movementFilters.product) params.set("product_id", movementFilters.product);
      if (movementFilters.warehouse) params.set("warehouse_id", movementFilters.warehouse);
      if (movementFilters.type) params.set("movement_type", movementFilters.type);
      const res = await fetch(`${API_BASE}/api/inventory/movements?${params.toString()}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setMovements(Array.isArray(data) ? data : data.movements || data.items || []);
      }
    } catch {}
  }, [movementFilters, token]);

  const fetchWarehouses = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/warehouses`, { headers });
      if (res.ok) {
        const data = await res.json();
        setWarehouses(Array.isArray(data) ? data : data.warehouses || data.items || []);
      }
    } catch {}
  }, [token]);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/products`, { headers });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.products || [];
        setProducts(list.map((p: any) => ({ id: p.id, name: p.name, image: p.image })));
      }
    } catch {}
  }, [token]);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    Promise.all([fetchInventory(), fetchAlerts(), fetchMovements(), fetchWarehouses(), fetchProducts()])
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { if (token) fetchInventory(); }, [warehouseFilter, searchQuery, lowStockFilter]);
  useEffect(() => { if (token && activeTab === "alerts") fetchAlerts(); }, [activeTab]);
  useEffect(() => { if (token && activeTab === "movements") fetchMovements(); }, [activeTab, movementFilters]);
  useEffect(() => { if (token && activeTab === "warehouses") fetchWarehouses(); }, [activeTab]);

  const getStockStatus = (item: { quantity: number; reserved: number; reorder_point: number }) => {
    const avail = item.quantity - item.reserved;
    if (avail <= 0) return { label: "Out of Stock", color: "bg-red-400/15 text-red-400", dot: "bg-red-400" };
    if (avail <= item.reorder_point) return { label: "Low Stock", color: "bg-amber-400/15 text-amber-400", dot: "bg-amber-400" };
    return { label: "In Stock", color: "bg-emerald-400/15 text-emerald-400", dot: "bg-emerald-400" };
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/inventory/${editingItem.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          quantity: Number(editForm.quantity),
          reserved: Number(editForm.reserved),
          reorder_point: Number(editForm.reorder_point),
          reorder_quantity: Number(editForm.reorder_quantity),
          bin_location: editForm.bin_location,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setInventory((prev) => prev.map((i) => (i.id === editingItem.id ? { ...i, ...updated } : i)));
        setEditingItem(null);
      }
    } catch {}
    setSaving(false);
  };

  const handleRecordMovement = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/inventory/movements`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          product_id: Number(movementForm.product_id),
          warehouse_id: Number(movementForm.warehouse_id),
          movement_type: movementForm.movement_type,
          quantity: Number(movementForm.quantity),
          notes: movementForm.notes,
        }),
      });
      if (res.ok) {
        setShowMovementForm(false);
        setMovementForm({ product_id: "", warehouse_id: "", movement_type: "inbound", quantity: "", notes: "" });
        fetchInventory();
        fetchMovements();
      }
    } catch {}
    setSaving(false);
  };

  const handleCreateWarehouse = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/warehouses`, {
        method: "POST",
        headers,
        body: JSON.stringify(warehouseForm),
      });
      if (res.ok) {
        const created = await res.json();
        setWarehouses((prev) => [...prev, created]);
        setShowWarehouseForm(false);
        setWarehouseForm({ name: "", location: "" });
      }
    } catch {}
    setSaving(false);
  };

  const handleSubmitCount = async () => {
    if (!countWarehouse || Object.keys(countItems).length === 0) return;
    setCountSaving(true);
    try {
      const counts = Object.entries(countItems)
        .filter(([, qty]) => qty !== "")
        .map(([product_id, counted_quantity]) => ({ product_id: Number(product_id), counted_quantity: Number(counted_quantity) }));
      const res = await fetch(`${API_BASE}/api/inventory/count`, {
        method: "POST",
        headers,
        body: JSON.stringify({ warehouse_id: Number(countWarehouse), counts }),
      });
      if (res.ok) {
        setCountMode(false);
        setCountItems({});
        setCountWarehouse("");
        fetchInventory();
      }
    } catch {}
    setCountSaving(false);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setEditForm({
      quantity: String(item.quantity),
      reserved: String(item.reserved),
      reorder_point: String(item.reorder_point),
      reorder_quantity: String(item.reorder_quantity || 0),
      bin_location: item.bin_location || "",
    });
  };

  const filteredMovements = movements.filter((m) => {
    if (movementFilters.product && !m.product_name.toLowerCase().includes(movementFilters.product.toLowerCase())) return false;
    if (movementFilters.warehouse && String(m.warehouse_id) !== movementFilters.warehouse) return false;
    if (movementFilters.type && m.movement_type !== movementFilters.type) return false;
    return true;
  });

  const tabs: { id: Tab; label: string; icon: typeof Package; badge?: number }[] = [
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "alerts", label: "Low Stock", icon: AlertTriangle, badge: alerts.length },
    { id: "movements", label: "Movements", icon: ArrowUpDown },
    { id: "warehouses", label: "Warehouses", icon: Warehouse },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="text-white/25 text-sm">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] antialiased">
      <div className="border-b border-white/[0.06] bg-[#050505]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-display text-lg tracking-[0.35em] text-white font-light">NOVA</span>
            <span className="text-[10px] tracking-[0.25em] text-white/25 border border-white/[0.08] px-2.5 py-1 rounded-full">INVENTORY</span>
          </div>
          <div className="flex items-center gap-3">
            {countMode && (
              <button
                onClick={() => { setCountMode(false); setCountItems({}); setCountWarehouse(""); }}
                className="flex items-center gap-2 px-4 py-2 bg-white/[0.06] border border-white/[0.08] text-white/70 text-[13px] rounded-full hover:bg-white/[0.1] transition-colors"
              >
                <X size={13} /> Cancel Count
              </button>
            )}
            {!countMode && (
              <>
                <button
                  onClick={() => { setShowMovementForm(true); fetchProducts(); }}
                  className="flex items-center gap-2 px-4 py-2 bg-white/[0.06] border border-white/[0.08] text-white/70 text-[13px] rounded-full hover:bg-white/[0.1] transition-colors"
                >
                  <ArrowUpDown size={13} /> Log Movement
                </button>
                <button
                  onClick={() => { setCountMode(true); fetchWarehouses(); fetchProducts(); fetchInventory(); }}
                  className="flex items-center gap-2 px-4 py-2 bg-white/[0.06] border border-white/[0.08] text-white/70 text-[13px] rounded-full hover:bg-white/[0.1] transition-colors"
                >
                  <ClipboardList size={13} /> Cycle Count
                </button>
              </>
            )}
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
                    onClick={() => { setActiveTab(tab.id); setSearchQuery(""); }}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] transition-all whitespace-nowrap ${
                      activeTab === tab.id
                        ? "bg-white/[0.08] text-white border border-white/[0.1]"
                        : "text-white/40 hover:text-white/70 hover:bg-white/[0.03] border border-transparent"
                    }`}
                  >
                    <Icon size={16} />
                    {tab.label}
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="ml-auto px-1.5 py-0.5 bg-red-400/20 text-red-400 text-[10px] rounded-full font-medium">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="flex-1 min-w-0">
            {activeTab === "inventory" && !countMode && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-display text-3xl text-white mb-1">Inventory</h1>
                  <p className="text-white/35 text-[13px]">{inventory.length} items across all warehouses</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                    <input
                      type="text"
                      placeholder="Search by product name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/[0.05] border border-white/[0.08] text-white placeholder:text-white/20 rounded-xl pl-11 pr-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                    />
                  </div>
                  <div className="relative">
                    <select
                      value={warehouseFilter}
                      onChange={(e) => setWarehouseFilter(e.target.value)}
                      className="appearance-none bg-white/[0.05] border border-white/[0.08] text-white rounded-xl pl-4 pr-9 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors cursor-pointer"
                    >
                      <option value="" className="bg-[#0d0d0d]">All Warehouses</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id} className="bg-[#0d0d0d]">{w.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                  </div>
                  <button
                    onClick={() => setLowStockFilter((f) => !f)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] border transition-all whitespace-nowrap ${
                      lowStockFilter
                        ? "bg-amber-400/10 border-amber-400/30 text-amber-400"
                        : "bg-white/[0.05] border-white/[0.08] text-white/50 hover:text-white/70"
                    }`}
                  >
                    <AlertTriangle size={13} />
                    Low Stock
                  </button>
                </div>

                <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/[0.05]">
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">PRODUCT</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">WAREHOUSE</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">QTY</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">RESERVED</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">AVAILABLE</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">REORDER</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">BIN</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">STATUS</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventory.map((item) => {
                          const status = getStockStatus(item);
                          return (
                            <tr key={item.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                              <td className="px-6 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/[0.04] border border-white/[0.06] flex-shrink-0">
                                    {item.product_image ? (
                                      <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center"><Package size={14} className="text-white/20" /></div>
                                    )}
                                  </div>
                                  <span className="text-[13px] text-white/80 font-medium">{item.product_name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-3 text-[12px] text-white/40">{item.warehouse_name}</td>
                              <td className="px-6 py-3 text-[13px] text-white/70 font-medium">{item.quantity}</td>
                              <td className="px-6 py-3 text-[13px] text-white/50">{item.reserved}</td>
                              <td className="px-6 py-3">
                                <span className={`text-[13px] font-medium ${(item.quantity - item.reserved) <= 0 ? "text-red-400" : "text-white/80"}`}>
                                  {item.quantity - item.reserved}
                                </span>
                              </td>
                              <td className="px-6 py-3 text-[12px] text-white/40">{item.reorder_point}</td>
                              <td className="px-6 py-3 text-[12px] text-white/35 font-mono">{item.bin_location || "—"}</td>
                              <td className="px-6 py-3">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide ${status.color}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                                  {status.label}
                                </span>
                              </td>
                              <td className="px-6 py-3">
                                <button
                                  onClick={() => openEditModal(item)}
                                  className="w-8 h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
                                >
                                  <Edit3 size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {inventory.length === 0 && (
                          <tr>
                            <td colSpan={9} className="px-6 py-16 text-center text-white/25 text-[13px]">No inventory items found</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "inventory" && countMode && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-display text-3xl text-white mb-1">Cycle Count</h1>
                  <p className="text-white/35 text-[13px]">Update quantities for multiple items at once</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative">
                    <select
                      value={countWarehouse}
                      onChange={(e) => { setCountWarehouse(e.target.value); setCountItems({}); }}
                      className="appearance-none bg-white/[0.05] border border-white/[0.08] text-white rounded-xl pl-4 pr-9 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors cursor-pointer"
                    >
                      <option value="" className="bg-[#0d0d0d]">Select warehouse</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id} className="bg-[#0d0d0d]">{w.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                  </div>
                </div>

                {countWarehouse && (
                  <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-white/[0.05]">
                            <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">PRODUCT</th>
                            <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">CURRENT QTY</th>
                            <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">COUNTED</th>
                            <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">DIFFERENCE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inventory.filter((i) => String(i.warehouse_id) === countWarehouse).map((item) => {
                            const counted = countItems[item.product_id];
                            const diff = counted !== undefined && counted !== "" ? Number(counted) - item.quantity : null;
                            return (
                              <tr key={item.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                                <td className="px-6 py-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/[0.04] border border-white/[0.06] flex-shrink-0">
                                      {item.product_image ? (
                                        <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center"><Package size={12} className="text-white/20" /></div>
                                      )}
                                    </div>
                                    <span className="text-[13px] text-white/80 font-medium">{item.product_name}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-3 text-[13px] text-white/50">{item.quantity}</td>
                                <td className="px-6 py-3">
                                  <input
                                    type="number"
                                    min="0"
                                    value={countItems[item.product_id] || ""}
                                    onChange={(e) => setCountItems((prev) => ({ ...prev, [item.product_id]: e.target.value }))}
                                    placeholder="—"
                                    className="w-24 bg-white/[0.05] border border-white/[0.08] text-white rounded-lg px-3 py-1.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                                  />
                                </td>
                                <td className="px-6 py-3">
                                  {diff !== null ? (
                                    <span className={`text-[13px] font-medium ${diff === 0 ? "text-white/30" : diff > 0 ? "text-emerald-400" : "text-red-400"}`}>
                                      {diff > 0 ? `+${diff}` : diff}
                                    </span>
                                  ) : (
                                    <span className="text-[13px] text-white/20">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {inventory.filter((i) => String(i.warehouse_id) === countWarehouse).length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-6 py-12 text-center text-white/25 text-[13px]">No items in this warehouse</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {countWarehouse && Object.keys(countItems).some((k) => countItems[Number(k)] !== "") && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleSubmitCount}
                      disabled={countSaving}
                      className="flex items-center gap-2 px-6 py-2.5 bg-white text-black text-[13px] font-medium rounded-full hover:bg-white/90 transition-colors disabled:opacity-50"
                    >
                      {countSaving && <Loader2 size={14} className="animate-spin" />}
                      Submit Count
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "alerts" && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-display text-3xl text-white mb-1">Low Stock Alerts</h1>
                  <p className="text-white/35 text-[13px]">{alerts.length} items at or below reorder point</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {alerts.map((item) => {
                    const status = getStockStatus(item);
                    return (
                      <div
                        key={item.id}
                        onClick={() => openEditModal(item)}
                        className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-5 hover:border-white/[0.13] transition-all cursor-pointer group"
                      >
                        <div className="flex items-start gap-3 mb-4">
                          <div className="w-11 h-11 rounded-xl overflow-hidden bg-white/[0.04] border border-white/[0.06] flex-shrink-0">
                            {item.product_image ? (
                              <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><Package size={16} className="text-white/20" /></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] text-white/80 font-medium truncate">{item.product_name}</p>
                            <p className="text-[11px] text-white/30">{item.warehouse_name}</p>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide ${status.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                            {status.label}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div>
                            <p className="text-[10px] text-white/25 tracking-wide mb-1">QTY</p>
                            <p className="text-[15px] text-white/80 font-medium">{item.quantity}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-white/25 tracking-wide mb-1">RESERVED</p>
                            <p className="text-[15px] text-white/50 font-medium">{item.reserved}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-white/25 tracking-wide mb-1">REORDER AT</p>
                            <p className="text-[15px] text-amber-400/80 font-medium">{item.reorder_point}</p>
                          </div>
                        </div>

                        {item.bin_location && (
                          <div className="flex items-center gap-1.5 text-white/25 text-[11px]">
                            <MapPin size={11} />
                            {item.bin_location}
                          </div>
                        )}

                        <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center justify-between">
                          <span className="text-[11px] text-white/20">Reorder {item.reorder_quantity} units</span>
                          <span className="text-[11px] text-white/20 group-hover:text-white/40 transition-colors">Edit →</span>
                        </div>
                      </div>
                    );
                  })}
                  {alerts.length === 0 && (
                    <div className="col-span-full py-20 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center mx-auto mb-4">
                        <Package size={22} className="text-emerald-400/60" />
                      </div>
                      <p className="text-white/40 text-[15px]">All stocked up</p>
                      <p className="text-white/20 text-[13px] mt-1">No items below reorder point</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "movements" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="font-display text-3xl text-white mb-1">Movements</h1>
                    <p className="text-white/35 text-[13px]">{filteredMovements.length} recent movements</p>
                  </div>
                  <button
                    onClick={() => { setShowMovementForm(true); fetchProducts(); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-black text-[13px] font-medium rounded-full hover:bg-white/90 transition-colors"
                  >
                    <Plus size={14} />
                    Log Movement
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                    <input
                      type="text"
                      placeholder="Filter by product..."
                      value={movementFilters.product}
                      onChange={(e) => setMovementFilters((f) => ({ ...f, product: e.target.value }))}
                      className="w-full bg-white/[0.05] border border-white/[0.08] text-white placeholder:text-white/20 rounded-xl pl-11 pr-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                    />
                  </div>
                  <div className="relative">
                    <select
                      value={movementFilters.warehouse}
                      onChange={(e) => setMovementFilters((f) => ({ ...f, warehouse: e.target.value }))}
                      className="appearance-none bg-white/[0.05] border border-white/[0.08] text-white rounded-xl pl-4 pr-9 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors cursor-pointer"
                    >
                      <option value="" className="bg-[#0d0d0d]">All Warehouses</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id} className="bg-[#0d0d0d]">{w.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                  </div>
                  <div className="relative">
                    <select
                      value={movementFilters.type}
                      onChange={(e) => setMovementFilters((f) => ({ ...f, type: e.target.value }))}
                      className="appearance-none bg-white/[0.05] border border-white/[0.08] text-white rounded-xl pl-4 pr-9 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors cursor-pointer"
                    >
                      <option value="" className="bg-[#0d0d0d]">All Types</option>
                      {MOVEMENT_TYPES.map((t) => (
                        <option key={t} value={t} className="bg-[#0d0d0d]">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                  </div>
                </div>

                <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/[0.05]">
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">PRODUCT</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">WAREHOUSE</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">TYPE</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">QTY</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">NOTES</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">DATE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMovements.map((m) => {
                          const TypeIcon = MOVEMENT_TYPE_ICONS[m.movement_type] || ArrowUpDown;
                          return (
                            <tr key={m.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                              <td className="px-6 py-3.5 text-[13px] text-white/80 font-medium">{m.product_name}</td>
                              <td className="px-6 py-3.5 text-[12px] text-white/40">{m.warehouse_name}</td>
                              <td className="px-6 py-3.5">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide ${MOVEMENT_TYPE_COLORS[m.movement_type] || "bg-white/10 text-white/50"}`}>
                                  <TypeIcon size={10} />
                                  {m.movement_type.charAt(0).toUpperCase() + m.movement_type.slice(1)}
                                </span>
                              </td>
                              <td className="px-6 py-3.5">
                                <span className={`text-[13px] font-medium ${m.movement_type === "outbound" ? "text-amber-400" : m.movement_type === "inbound" ? "text-emerald-400" : "text-white/70"}`}>
                                  {m.movement_type === "outbound" ? "−" : m.movement_type === "inbound" ? "+" : ""}{m.quantity}
                                </span>
                              </td>
                              <td className="px-6 py-3.5 text-[12px] text-white/30 max-w-[200px] truncate">{m.notes || "—"}</td>
                              <td className="px-6 py-3.5 text-[12px] text-white/35">
                                {new Date(m.created_at).toLocaleDateString()} {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </td>
                            </tr>
                          );
                        })}
                        {filteredMovements.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-6 py-16 text-center text-white/25 text-[13px]">No movements recorded</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "warehouses" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="font-display text-3xl text-white mb-1">Warehouses</h1>
                    <p className="text-white/35 text-[13px]">{warehouses.length} warehouse{warehouses.length !== 1 ? "s" : ""}</p>
                  </div>
                  <button
                    onClick={() => setShowWarehouseForm(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-black text-[13px] font-medium rounded-full hover:bg-white/90 transition-colors"
                  >
                    <Plus size={14} />
                    Add Warehouse
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {warehouses.map((w) => (
                    <div key={w.id} className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-5 hover:border-white/[0.13] transition-all">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-11 h-11 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                          <Warehouse size={18} className="text-white/40" />
                        </div>
                        <div>
                          <p className="text-[14px] text-white/80 font-medium">{w.name}</p>
                          <p className="text-[11px] text-white/30 mt-0.5">{w.location}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3">
                          <p className="text-[10px] text-white/25 tracking-wide mb-1">ITEMS</p>
                          <p className="text-[18px] text-white/80 font-medium">{w.item_count ?? 0}</p>
                        </div>
                        <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3">
                          <p className="text-[10px] text-white/25 tracking-wide mb-1">CAPACITY</p>
                          <p className="text-[18px] text-white/80 font-medium">{w.capacity?.toLocaleString() ?? "—"}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {warehouses.length === 0 && (
                    <div className="col-span-full py-20 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4">
                        <Warehouse size={22} className="text-white/20" />
                      </div>
                      <p className="text-white/40 text-[15px]">No warehouses yet</p>
                      <p className="text-white/20 text-[13px] mt-1">Create your first warehouse to get started</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditingItem(null)} />
          <div className="relative w-full max-w-lg bg-[#0d0d0d] border border-white/[0.08] rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <h3 className="text-[15px] font-medium text-white">Adjust Stock</h3>
              <button onClick={() => setEditingItem(null)} className="w-8 h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-white/80 transition-all">
                <X size={14} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/[0.04] border border-white/[0.06]">
                  {editingItem.product_image ? (
                    <img src={editingItem.product_image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Package size={14} className="text-white/20" /></div>
                  )}
                </div>
                <div>
                  <p className="text-[13px] text-white/80 font-medium">{editingItem.product_name}</p>
                  <p className="text-[11px] text-white/30">{editingItem.warehouse_name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Quantity</label>
                  <input type="number" min="0" value={editForm.quantity} onChange={(e) => setEditForm((f) => ({ ...f, quantity: e.target.value }))} className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors" />
                </div>
                <div>
                  <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Reserved</label>
                  <input type="number" min="0" value={editForm.reserved} onChange={(e) => setEditForm((f) => ({ ...f, reserved: e.target.value }))} className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Reorder Point</label>
                  <input type="number" min="0" value={editForm.reorder_point} onChange={(e) => setEditForm((f) => ({ ...f, reorder_point: e.target.value }))} className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors" />
                </div>
                <div>
                  <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Reorder Quantity</label>
                  <input type="number" min="0" value={editForm.reorder_quantity} onChange={(e) => setEditForm((f) => ({ ...f, reorder_quantity: e.target.value }))} className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Bin Location</label>
                <input type="text" value={editForm.bin_location} onChange={(e) => setEditForm((f) => ({ ...f, bin_location: e.target.value }))} placeholder="e.g. A-03-12" className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors placeholder:text-white/15" />
              </div>
              <div className="pt-2">
                <button onClick={handleUpdateItem} disabled={saving} className="w-full bg-white text-black font-medium rounded-full py-3 text-[13px] hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMovementForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowMovementForm(false)} />
          <div className="relative w-full max-w-lg bg-[#0d0d0d] border border-white/[0.08] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <h3 className="text-[15px] font-medium text-white">Record Movement</h3>
              <button onClick={() => setShowMovementForm(false)} className="w-8 h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-white/80 transition-all">
                <X size={14} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Product</label>
                <div className="relative">
                  <select value={movementForm.product_id} onChange={(e) => setMovementForm((f) => ({ ...f, product_id: e.target.value }))} className="w-full appearance-none bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors cursor-pointer">
                    <option value="" className="bg-[#0d0d0d]">Select product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id} className="bg-[#0d0d0d]">{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Warehouse</label>
                <div className="relative">
                  <select value={movementForm.warehouse_id} onChange={(e) => setMovementForm((f) => ({ ...f, warehouse_id: e.target.value }))} className="w-full appearance-none bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors cursor-pointer">
                    <option value="" className="bg-[#0d0d0d]">Select warehouse</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id} className="bg-[#0d0d0d]">{w.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Movement Type</label>
                <div className="grid grid-cols-5 gap-2">
                  {MOVEMENT_TYPES.map((t) => {
                    const TypeIcon = MOVEMENT_TYPE_ICONS[t];
                    return (
                      <button
                        key={t}
                        onClick={() => setMovementForm((f) => ({ ...f, movement_type: t }))}
                        className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-[10px] border transition-all ${
                          movementForm.movement_type === t
                            ? "bg-white/[0.08] border-white/[0.15] text-white"
                            : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/60"
                        }`}
                      >
                        <TypeIcon size={14} />
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Quantity</label>
                <input type="number" min="1" value={movementForm.quantity} onChange={(e) => setMovementForm((f) => ({ ...f, quantity: e.target.value }))} className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors" placeholder="0" />
              </div>
              <div>
                <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Notes</label>
                <input type="text" value={movementForm.notes} onChange={(e) => setMovementForm((f) => ({ ...f, notes: e.target.value }))} className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors placeholder:text-white/15" placeholder="Optional notes" />
              </div>
              <div className="pt-2">
                <button onClick={handleRecordMovement} disabled={saving || !movementForm.product_id || !movementForm.warehouse_id || !movementForm.quantity} className="w-full bg-white text-black font-medium rounded-full py-3 text-[13px] hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  Record Movement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showWarehouseForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowWarehouseForm(false)} />
          <div className="relative w-full max-w-md bg-[#0d0d0d] border border-white/[0.08] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <h3 className="text-[15px] font-medium text-white">Add Warehouse</h3>
              <button onClick={() => setShowWarehouseForm(false)} className="w-8 h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-white/80 transition-all">
                <X size={14} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Name</label>
                <input type="text" value={warehouseForm.name} onChange={(e) => setWarehouseForm((f) => ({ ...f, name: e.target.value }))} className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors" placeholder="Warehouse name" />
              </div>
              <div>
                <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Location</label>
                <input type="text" value={warehouseForm.location} onChange={(e) => setWarehouseForm((f) => ({ ...f, location: e.target.value }))} className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors" placeholder="City, State" />
              </div>
              <div className="pt-2">
                <button onClick={handleCreateWarehouse} disabled={saving || !warehouseForm.name || !warehouseForm.location} className="w-full bg-white text-black font-medium rounded-full py-3 text-[13px] hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  Create Warehouse
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
