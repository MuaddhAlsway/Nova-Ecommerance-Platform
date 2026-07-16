import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  BarChart3,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Package,
  Truck,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  Clock,
  CheckCircle2,
  Box,
  RotateCcw,
  Layers,
  Calendar,
} from "lucide-react";
import { API_BASE } from "../config";

interface DashboardData {
  totalOrders: number;
  totalRevenue: number;
  ordersThisMonth: number;
  revenueThisMonth: number;
  avgOrderValue: number;
  dailyOrders: { date: string; orders: number; revenue: number }[];
  pipeline: { status: string; count: number }[];
  lowStock: { id: number; name: string; stock: number; reorderPoint: number }[];
  recentOrders: {
    id: number;
    customer: string;
    total: number;
    status: string;
    date: string;
    items: number;
  }[];
  returns: {
    total: number;
    refunded: number;
    totalRefunded: number;
  };
}

interface CarrierData {
  carrier: string;
  shipments: number;
  totalCost: number;
  avgCost: number;
  deliveryRate: number;
}

interface InventoryData {
  warehouse: string;
  products: number;
  totalUnits: number;
  reserved: number;
  available: number;
}

const PERIOD_OPTIONS = ["7d", "30d", "90d"] as const;

const PIPELINE_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  pending: { bg: "bg-amber-400/10", text: "text-amber-400", bar: "bg-amber-400" },
  picking: { bg: "bg-blue-400/10", text: "text-blue-400", bar: "bg-blue-400" },
  packing: { bg: "bg-purple-400/10", text: "text-purple-400", bar: "bg-purple-400" },
  ready_to_ship: { bg: "bg-cyan-400/10", text: "text-cyan-400", bar: "bg-cyan-400" },
  shipped: { bg: "bg-emerald-400/10", text: "text-emerald-400", bar: "bg-emerald-400" },
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-400/15 text-amber-400",
  confirmed: "bg-blue-400/15 text-blue-400",
  shipped: "bg-purple-400/15 text-purple-400",
  delivered: "bg-emerald-400/15 text-emerald-400",
  cancelled: "bg-red-400/15 text-red-400",
  processing: "bg-cyan-400/15 text-cyan-400",
};

export default function AnalyticsPage() {
  const { token, user, loading: authLoading } = useAuth();

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [carriers, setCarriers] = useState<CarrierData[]>([]);
  const [inventory, setInventory] = useState<InventoryData[]>([]);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const [loading, setLoading] = useState(true);

  const authHeaders = token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };

  useEffect(() => {
    if (!token || !user) { setLoading(false); return; }
    setLoading(true);

    fetch(`${API_BASE}/api/analytics/dashboard`, { headers: authHeaders })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setDashboard(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, user]);

  useEffect(() => {
    if (!token || !user) return;

    fetch(`${API_BASE}/api/analytics/shipping?period=${period}`, { headers: authHeaders })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setCarriers(Array.isArray(data) ? data : data.carriers || []);
      })
      .catch(() => {});
  }, [token, user, period]);

  useEffect(() => {
    if (!token || !user) return;

    fetch(`${API_BASE}/api/analytics/inventory`, { headers: authHeaders })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setInventory(Array.isArray(data) ? data : data.warehouses || []);
      })
      .catch(() => {});
  }, [token, user]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="text-white/25 text-sm">Loading analytics...</div>
      </div>
    );
  }

  if (!token || !user) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
        <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-10 text-center max-w-md w-full">
          <BarChart3 size={28} className="text-white/20 mx-auto mb-4" />
          <h2 className="font-display text-xl text-white mb-2">Access Denied</h2>
          <p className="text-white/35 text-[13px]">Sign in to view analytics</p>
        </div>
      </div>
    );
  }

  const maxDailyRevenue = dashboard?.dailyOrders
    ? Math.max(...dashboard.dailyOrders.map((d) => d.revenue), 1)
    : 1;

  const maxDailyOrders = dashboard?.dailyOrders
    ? Math.max(...dashboard.dailyOrders.map((d) => d.orders), 1)
    : 1;

  const maxPipeline = dashboard?.pipeline
    ? Math.max(...dashboard.pipeline.map((p) => p.count), 1)
    : 1;

  const overviewStats = [
    {
      label: "Total Orders",
      value: dashboard?.totalOrders ?? 0,
      icon: ShoppingCart,
      color: "from-blue-500/10 to-blue-500/5",
    },
    {
      label: "Total Revenue",
      value: `$${(dashboard?.totalRevenue ?? 0).toLocaleString()}`,
      icon: DollarSign,
      color: "from-emerald-500/10 to-emerald-500/5",
    },
    {
      label: "Orders This Month",
      value: dashboard?.ordersThisMonth ?? 0,
      icon: Calendar,
      color: "from-purple-500/10 to-purple-500/5",
    },
    {
      label: "Revenue This Month",
      value: `$${(dashboard?.revenueThisMonth ?? 0).toLocaleString()}`,
      icon: TrendingUp,
      color: "from-amber-500/10 to-amber-500/5",
    },
    {
      label: "Avg Order Value",
      value: `$${(dashboard?.avgOrderValue ?? 0).toFixed(2)}`,
      icon: BarChart3,
      color: "from-cyan-500/10 to-cyan-500/5",
    },
  ];

  const pipelineStages = ["pending", "picking", "packing", "ready_to_ship", "shipped"];

  return (
    <div className="min-h-screen bg-[#080808] antialiased">
      <div className="border-b border-white/[0.06] bg-[#050505]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-display text-lg tracking-[0.35em] text-white font-light">NOVA</span>
            <span className="text-[10px] tracking-[0.25em] text-white/25 border border-white/[0.08] px-2.5 py-1 rounded-full">
              ANALYTICS
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[13px] text-white/40">{user.name}</span>
            <div className="w-8 h-8 rounded-full bg-white/[0.08] border border-white/[0.1] flex items-center justify-center">
              <span className="text-[11px] text-white/60 font-medium">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="font-display text-3xl text-white mb-1">Analytics</h1>
          <p className="text-white/35 text-[13px]">Shipping & business intelligence</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {overviewStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} border border-white/[0.08] flex items-center justify-center`}>
                    <Icon size={18} className="text-white/60" />
                  </div>
                  <TrendingUp size={14} className="text-emerald-400/50" />
                </div>
                <p className="font-display text-2xl text-white mb-0.5">{stat.value}</p>
                <p className="text-[11px] text-white/30 tracking-wide">{stat.label}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 size={16} className="text-white/40" />
              <h2 className="text-[14px] font-medium text-white">Revenue — Last 30 Days</h2>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-white/30">
              <div className="w-2 h-2 rounded-full bg-white/20" />
              Orders
              <div className="w-2 h-2 rounded-full bg-emerald-400/40 ml-3" />
              Revenue
            </div>
          </div>
          <div className="p-6">
            {dashboard?.dailyOrders && dashboard.dailyOrders.length > 0 ? (
              <div className="flex items-end gap-[3px] h-48">
                {dashboard.dailyOrders.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end">
                    <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                      <div className="bg-[#1a1a1a] border border-white/[0.1] rounded-lg px-3 py-2 text-[11px] whitespace-nowrap">
                        <p className="text-white/60">{new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                        <p className="text-white font-medium">{day.orders} orders · ${day.revenue.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="w-full flex gap-[1px] items-end" style={{ height: "100%" }}>
                      <div
                        className="flex-1 bg-white/10 rounded-t-sm hover:bg-white/20 transition-colors"
                        style={{ height: `${(day.orders / maxDailyOrders) * 100}%`, minHeight: "2px" }}
                      />
                      <div
                        className="flex-1 bg-emerald-400/30 rounded-t-sm hover:bg-emerald-400/50 transition-colors"
                        style={{ height: `${(day.revenue / maxDailyRevenue) * 100}%`, minHeight: "2px" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-white/20 text-[13px]">
                No data available
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Truck size={16} className="text-white/40" />
              <h2 className="text-[14px] font-medium text-white">Carrier Performance</h2>
            </div>
            <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] rounded-lg p-0.5">
              {PERIOD_OPTIONS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                    period === p
                      ? "bg-white/[0.1] text-white border border-white/[0.1]"
                      : "text-white/35 hover:text-white/60 border border-transparent"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">CARRIER</th>
                  <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">SHIPMENTS</th>
                  <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">TOTAL COST</th>
                  <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">AVG COST</th>
                  <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">DELIVERY RATE</th>
                </tr>
              </thead>
              <tbody>
                {carriers.map((c) => (
                  <tr key={c.carrier} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
                          <Truck size={14} className="text-white/40" />
                        </div>
                        <span className="text-[13px] text-white/80 font-medium">{c.carrier}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-[13px] text-white/70">{c.shipments.toLocaleString()}</td>
                    <td className="px-6 py-3.5 text-[13px] text-white/70">${c.totalCost.toLocaleString()}</td>
                    <td className="px-6 py-3.5 text-[13px] text-white/50">${c.avgCost.toFixed(2)}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 max-w-[120px] h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-400/60"
                            style={{ width: `${Math.min(c.deliveryRate, 100)}%` }}
                          />
                        </div>
                        <span className="text-[12px] text-white/50 w-10 text-right">{c.deliveryRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {carriers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-white/25 text-[13px]">No carrier data for this period</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
            <Layers size={16} className="text-white/40" />
            <h2 className="text-[14px] font-medium text-white">Fulfillment Pipeline</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              {pipelineStages.map((stage) => {
                const pipelineItem = dashboard?.pipeline?.find((p) => p.status === stage);
                const count = pipelineItem?.count ?? 0;
                const colors = PIPELINE_COLORS[stage] || { bg: "bg-white/10", text: "text-white/50", bar: "bg-white/40" };
                const label = stage.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

                return (
                  <div key={stage} className={`${colors.bg} border border-white/[0.06] rounded-xl p-4`}>
                    <p className={`text-[11px] tracking-wide ${colors.text} mb-3 font-medium`}>{label}</p>
                    <p className="font-display text-3xl text-white mb-3">{count}</p>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colors.bar} transition-all duration-500`}
                        style={{ width: `${(count / maxPipeline) * 100}%`, minWidth: count > 0 ? "4px" : "0" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2 mt-5 text-[11px] text-white/25">
              <ArrowRight size={12} />
              <span>Pending → Picking → Packing → Ready to Ship → Shipped</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
              <Box size={16} className="text-white/40" />
              <h2 className="text-[14px] font-medium text-white">Inventory Summary</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">WAREHOUSE</th>
                    <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">PRODUCTS</th>
                    <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">TOTAL</th>
                    <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">RESERVED</th>
                    <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">AVAILABLE</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((inv) => (
                    <tr key={inv.warehouse} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-3.5 text-[13px] text-white/80 font-medium">{inv.warehouse}</td>
                      <td className="px-6 py-3.5 text-[13px] text-white/60">{inv.products}</td>
                      <td className="px-6 py-3.5 text-[13px] text-white/60">{inv.totalUnits.toLocaleString()}</td>
                      <td className="px-6 py-3.5 text-[13px] text-amber-400/70">{inv.reserved.toLocaleString()}</td>
                      <td className="px-6 py-3.5 text-[13px] text-emerald-400/70">{inv.available.toLocaleString()}</td>
                    </tr>
                  ))}
                  {inventory.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-white/25 text-[13px]">No inventory data</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
              <AlertTriangle size={16} className="text-amber-400/60" />
              <h2 className="text-[14px] font-medium text-white">Low Stock Items</h2>
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {dashboard?.lowStock && dashboard.lowStock.length > 0 ? (
                <div className="divide-y divide-white/[0.04]">
                  {dashboard.lowStock.map((item) => (
                    <div key={item.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
                          <AlertTriangle size={13} className="text-amber-400/60" />
                        </div>
                        <div>
                          <p className="text-[13px] text-white/80">{item.name}</p>
                          <p className="text-[11px] text-white/30">Reorder at {item.reorderPoint}</p>
                        </div>
                      </div>
                      <span className={`text-[13px] font-medium ${item.stock === 0 ? "text-red-400" : "text-amber-400"}`}>
                        {item.stock} left
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-12 text-center text-white/25 text-[13px]">All items well stocked</div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
              <RotateCcw size={16} className="text-white/40" />
              <h2 className="text-[14px] font-medium text-white">Returns Summary</h2>
            </div>
            <div className="p-6 grid grid-cols-3 gap-4">
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-center">
                <p className="font-display text-2xl text-white mb-1">{dashboard?.returns?.total ?? 0}</p>
                <p className="text-[11px] text-white/30 tracking-wide">Total Returns</p>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-center">
                <p className="font-display text-2xl text-white mb-1">{dashboard?.returns?.refunded ?? 0}</p>
                <p className="text-[11px] text-white/30 tracking-wide">Refunded</p>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-center">
                <p className="font-display text-2xl text-amber-400/80 mb-1">${(dashboard?.returns?.totalRefunded ?? 0).toLocaleString()}</p>
                <p className="text-[11px] text-white/30 tracking-wide">Amount Refunded</p>
              </div>
            </div>
          </div>

          <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
              <Clock size={16} className="text-white/40" />
              <h2 className="text-[14px] font-medium text-white">Recent Orders</h2>
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {dashboard?.recentOrders && dashboard.recentOrders.length > 0 ? (
                <div className="divide-y divide-white/[0.04]">
                  {dashboard.recentOrders.map((order) => (
                    <div key={order.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
                          <ShoppingCart size={13} className="text-white/40" />
                        </div>
                        <div>
                          <p className="text-[13px] text-white/80 font-medium">#{order.id}</p>
                          <p className="text-[11px] text-white/30">{order.customer} · {order.items} items</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] text-white/80">${order.total.toLocaleString()}</p>
                        <div className="flex items-center gap-2 justify-end mt-0.5">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-medium tracking-wide ${STATUS_COLORS[order.status] || "bg-white/10 text-white/50"}`}>
                            {order.status}
                          </span>
                          <span className="text-[10px] text-white/25">{new Date(order.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-12 text-center text-white/25 text-[13px]">No recent orders</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
