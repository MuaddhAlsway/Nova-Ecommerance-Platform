import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Truck,
  Plus,
  X,
  Search,
  Edit,
  Trash2,
  ChevronDown,
  Eye,
  Package,
  FileText,
  Star,
  MapPin,
  Mail,
  Phone,
  Calendar,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { API_BASE } from "../config";

type Tab = "suppliers" | "purchase-orders";

const PO_STATUS_OPTIONS = ["draft", "sent", "confirmed", "partially_received", "received", "cancelled"] as const;

const PO_STATUS_COLORS: Record<string, string> = {
  draft: "bg-white/10 text-white/50",
  sent: "bg-blue-500/10 text-blue-400",
  confirmed: "bg-amber-500/10 text-amber-400",
  partially_received: "bg-orange-500/10 text-orange-400",
  received: "bg-green-500/10 text-green-400",
  cancelled: "bg-red-500/10 text-red-400",
};

interface Supplier {
  id: number;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  payment_terms: string;
  lead_time_days: number;
  product_count: number;
  rating: number;
}

interface SupplierProduct {
  id: number;
  product_id: number;
  product_name: string;
  product_image?: string;
  unit_cost: number;
  min_order_qty: number;
  lead_time_days: number;
  supplier_sku: string;
  is_preferred: boolean;
}

interface PurchaseOrder {
  id: number;
  supplier_id: number;
  supplier_name: string;
  warehouse: string;
  status: string;
  expected_date: string;
  notes: string;
  total: number;
  created_at: string;
  items: POItem[];
}

interface POItem {
  id?: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_cost: number;
}

interface Warehouse {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
}

const EMPTY_SUPPLIER_FORM = {
  name: "",
  contact_name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  country: "",
  payment_terms: "",
  lead_time_days: "",
};

export default function SupplierPage() {
  const { token, user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("suppliers");
  const [loading, setLoading] = useState(true);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>([]);
  const [supplierProductsLoading, setSupplierProductsLoading] = useState(false);

  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState(EMPTY_SUPPLIER_FORM);
  const [savingSupplier, setSavingSupplier] = useState(false);

  const [showProductForm, setShowProductForm] = useState(false);
  const [productForm, setProductForm] = useState({
    product_id: "",
    unit_cost: "",
    min_order_qty: "",
    lead_time_days: "",
    supplier_sku: "",
    is_preferred: false,
  });
  const [savingProduct, setSavingProduct] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [poStatusFilter, setPoStatusFilter] = useState<string>("");
  const [viewingPO, setViewingPO] = useState<PurchaseOrder | null>(null);
  const [viewPOLoading, setViewPOLoading] = useState(false);

  const [showPOForm, setShowPOForm] = useState(false);
  const [poForm, setPoForm] = useState({
    supplier_id: "",
    warehouse_id: "",
    expected_date: "",
    notes: "",
  });
  const [poItems, setPoItems] = useState<{ product_id: string; quantity: string; unit_cost: string }[]>([]);
  const [savingPO, setSavingPO] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  const authHeaders = token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };

  useEffect(() => {
    if (!token || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);

    Promise.all([
      fetch(`${API_BASE}/api/suppliers`, { headers: authHeaders }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API_BASE}/api/products`, { headers: authHeaders }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API_BASE}/api/warehouses`, { headers: authHeaders }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([suppliersData, productsData, warehousesData]) => {
        setSuppliers(Array.isArray(suppliersData) ? suppliersData : suppliersData.suppliers || []);
        const prods = Array.isArray(productsData) ? productsData : productsData.products || [];
        setProducts(prods.map((p: any) => ({ id: p.id, name: p.name })));
        setWarehouses(Array.isArray(warehousesData) ? warehousesData : warehousesData.warehouses || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, user]);

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/suppliers`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setSuppliers(Array.isArray(data) ? data : data.suppliers || []);
      }
    } catch {}
  }, [token]);

  const fetchPurchaseOrders = useCallback(async () => {
    try {
      const url = poStatusFilter
        ? `${API_BASE}/api/suppliers/purchase-orders?status=${poStatusFilter}`
        : `${API_BASE}/api/suppliers/purchase-orders`;
      const res = await fetch(url, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setPurchaseOrders(Array.isArray(data) ? data : data.purchase_orders || []);
      }
    } catch {}
  }, [token, poStatusFilter]);

  useEffect(() => {
    if (activeTab === "purchase-orders") fetchPurchaseOrders();
  }, [activeTab, fetchPurchaseOrders]);

  const handleSaveSupplier = async () => {
    setSavingSupplier(true);
    try {
      const body = {
        name: supplierForm.name,
        contact_name: supplierForm.contact_name,
        email: supplierForm.email,
        phone: supplierForm.phone,
        address: supplierForm.address,
        city: supplierForm.city,
        country: supplierForm.country,
        payment_terms: supplierForm.payment_terms,
        lead_time_days: supplierForm.lead_time_days ? Number(supplierForm.lead_time_days) : undefined,
      };

      if (editingSupplier) {
        const res = await fetch(`${API_BASE}/api/suppliers/${editingSupplier.id}`, {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const updated = await res.json();
          setSuppliers((prev) => prev.map((s) => (s.id === editingSupplier.id ? { ...s, ...updated } : s)));
        }
      } else {
        const res = await fetch(`${API_BASE}/api/suppliers`, {
          headers: authHeaders,
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const created = await res.json();
          setSuppliers((prev) => [...prev, created]);
        }
      }
      setShowSupplierForm(false);
      setEditingSupplier(null);
      setSupplierForm(EMPTY_SUPPLIER_FORM);
    } catch {}
    setSavingSupplier(false);
  };

  const handleDeleteSupplier = async (id: number) => {
    if (!confirm("Delete this supplier?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/suppliers/${id}`, { method: "DELETE", headers: authHeaders });
      if (res.ok) {
        setSuppliers((prev) => prev.filter((s) => s.id !== id));
        if (selectedSupplier?.id === id) {
          setSelectedSupplier(null);
          setSupplierProducts([]);
        }
      }
    } catch {}
  };

  const handleViewSupplierProducts = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setSupplierProductsLoading(true);
    setSupplierProducts([]);
    try {
      const res = await fetch(`${API_BASE}/api/suppliers/${supplier.id}/products`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setSupplierProducts(Array.isArray(data) ? data : data.products || []);
      }
    } catch {}
    setSupplierProductsLoading(false);
  };

  const handleAddSupplierProduct = async () => {
    if (!selectedSupplier) return;
    setSavingProduct(true);
    try {
      const body = {
        product_id: Number(productForm.product_id),
        unit_cost: Number(productForm.unit_cost),
        min_order_qty: Number(productForm.min_order_qty) || 1,
        lead_time_days: Number(productForm.lead_time_days) || 0,
        supplier_sku: productForm.supplier_sku,
        is_preferred: productForm.is_preferred,
      };
      const res = await fetch(`${API_BASE}/api/suppliers/${selectedSupplier.id}/products`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const created = await res.json();
        setSupplierProducts((prev) => [...prev, created]);
        setShowProductForm(false);
        setProductForm({ product_id: "", unit_cost: "", min_order_qty: "", lead_time_days: "", supplier_sku: "", is_preferred: false });
      }
    } catch {}
    setSavingProduct(false);
  };

  const handleDeleteSupplierProduct = async (productId: number) => {
    if (!selectedSupplier) return;
    if (!confirm("Remove this product from supplier?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/suppliers/${selectedSupplier.id}/products/${productId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (res.ok) {
        setSupplierProducts((prev) => prev.filter((p) => p.product_id !== productId));
      }
    } catch {}
  };

  const openAddPOForm = () => {
    setPoForm({ supplier_id: "", warehouse_id: "", expected_date: "", notes: "" });
    setPoItems([{ product_id: "", quantity: "1", unit_cost: "" }]);
    setShowPOForm(true);
  };

  const handleAddPOItem = () => {
    setPoItems((prev) => [...prev, { product_id: "", quantity: "1", unit_cost: "" }]);
  };

  const handleRemovePOItem = (index: number) => {
    setPoItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePOItemChange = (index: number, field: string, value: string) => {
    setPoItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const handleCreatePO = async () => {
    setSavingPO(true);
    try {
      const body = {
        supplier_id: Number(poForm.supplier_id),
        warehouse_id: poForm.warehouse_id ? Number(poForm.warehouse_id) : undefined,
        expected_date: poForm.expected_date || undefined,
        notes: poForm.notes,
        items: poItems
          .filter((item) => item.product_id && item.unit_cost)
          .map((item) => ({
            product_id: Number(item.product_id),
            quantity: Number(item.quantity) || 1,
            unit_cost: Number(item.unit_cost),
          })),
      };
      const res = await fetch(`${API_BASE}/api/suppliers/purchase-orders`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const created = await res.json();
        setPurchaseOrders((prev) => [created, ...prev]);
        setShowPOForm(false);
        fetchPurchaseOrders();
      }
    } catch {}
    setSavingPO(false);
  };

  const handleViewPO = async (po: PurchaseOrder) => {
    setViewPOLoading(true);
    setViewingPO(null);
    try {
      const res = await fetch(`${API_BASE}/api/suppliers/purchase-orders/${po.id}`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setViewingPO(data);
      } else {
        setViewingPO(po);
      }
    } catch {
      setViewingPO(po);
    }
    setViewPOLoading(false);
  };

  const handleUpdatePOStatus = async (poId: number, newStatus: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/suppliers/purchase-orders/${poId}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setViewingPO((prev) => (prev && prev.id === poId ? { ...prev, status: newStatus } : prev));
        setPurchaseOrders((prev) => prev.map((po) => (po.id === poId ? { ...po, status: newStatus } : po)));
      }
    } catch {}
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="text-white/25 text-sm">Loading suppliers...</div>
      </div>
    );
  }

  if (!token || !user) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mx-auto mb-5">
              <Truck size={24} className="text-white/50" />
            </div>
            <h1 className="font-display text-lg tracking-[0.35em] text-white mb-4">NOVA</h1>
            <h2 className="font-display text-2xl text-white mb-2">Access Required</h2>
            <p className="text-white/40 text-[13px]">Please sign in to access supplier management</p>
          </div>
        </div>
      </div>
    );
  }

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.contact_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.city || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.country || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPOs = purchaseOrders.filter(
    (po) =>
      po.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(po.id).includes(searchQuery) ||
      (po.warehouse || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs: { id: Tab; label: string; icon: typeof Truck }[] = [
    { id: "suppliers", label: "Suppliers", icon: Truck },
    { id: "purchase-orders", label: "Purchase Orders", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-[#080808] antialiased">
      <div className="border-b border-white/[0.06] bg-[#050505]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-display text-lg tracking-[0.35em] text-white font-light">NOVA</span>
            <span className="text-[10px] tracking-[0.25em] text-white/25 border border-white/[0.08] px-2.5 py-1 rounded-full">
              SUPPLY CHAIN
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
                      setSelectedSupplier(null);
                      setViewingPO(null);
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
            {activeTab === "suppliers" && !selectedSupplier && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="font-display text-3xl text-white mb-1">Suppliers</h1>
                    <p className="text-white/35 text-[13px]">{suppliers.length} suppliers in network</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingSupplier(null);
                      setSupplierForm(EMPTY_SUPPLIER_FORM);
                      setShowSupplierForm(true);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-black text-[13px] font-medium rounded-full hover:bg-white/90 transition-colors"
                  >
                    <Plus size={14} />
                    Add Supplier
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                  <input
                    type="text"
                    placeholder="Search suppliers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/[0.08] text-white placeholder:text-white/20 rounded-xl pl-11 pr-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredSuppliers.map((supplier) => (
                    <div
                      key={supplier.id}
                      className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-5 hover:border-white/[0.12] transition-colors cursor-pointer group"
                      onClick={() => handleViewSupplierProducts(supplier)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] flex items-center justify-center">
                            <Truck size={18} className="text-white/50" />
                          </div>
                          <div>
                            <p className="text-[13px] text-white/90 font-medium group-hover:text-white transition-colors">{supplier.name}</p>
                            <p className="text-[11px] text-white/30">{supplier.contact_name || "No contact"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star size={11} className="text-amber-400/70 fill-amber-400/70" />
                          <span className="text-[11px] text-white/40">{supplier.rating?.toFixed(1) || "—"}</span>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        {supplier.email && (
                          <div className="flex items-center gap-2">
                            <Mail size={11} className="text-white/25 flex-shrink-0" />
                            <span className="text-[12px] text-white/40 truncate">{supplier.email}</span>
                          </div>
                        )}
                        {supplier.phone && (
                          <div className="flex items-center gap-2">
                            <Phone size={11} className="text-white/25 flex-shrink-0" />
                            <span className="text-[12px] text-white/40">{supplier.phone}</span>
                          </div>
                        )}
                        {(supplier.city || supplier.country) && (
                          <div className="flex items-center gap-2">
                            <MapPin size={11} className="text-white/25 flex-shrink-0" />
                            <span className="text-[12px] text-white/40">
                              {[supplier.city, supplier.country].filter(Boolean).join(", ")}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-white/[0.05]">
                        <span className="text-[11px] text-white/30">
                          {supplier.product_count ?? 0} products
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSupplier(supplier);
                              setSupplierForm({
                                name: supplier.name,
                                contact_name: supplier.contact_name || "",
                                email: supplier.email || "",
                                phone: supplier.phone || "",
                                address: supplier.address || "",
                                city: supplier.city || "",
                                country: supplier.country || "",
                                payment_terms: supplier.payment_terms || "",
                                lead_time_days: supplier.lead_time_days ? String(supplier.lead_time_days) : "",
                              });
                              setShowSupplierForm(true);
                            }}
                            className="w-7 h-7 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSupplier(supplier.id);
                            }}
                            className="w-7 h-7 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-400/[0.06] transition-all"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredSuppliers.length === 0 && (
                    <div className="col-span-full py-16 text-center text-white/25 text-[13px]">No suppliers found</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "suppliers" && selectedSupplier && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => {
                        setSelectedSupplier(null);
                        setSupplierProducts([]);
                      }}
                      className="w-9 h-9 rounded-xl border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <div>
                      <h1 className="font-display text-3xl text-white mb-1">{selectedSupplier.name}</h1>
                      <p className="text-white/35 text-[13px]">
                        {selectedSupplier.contact_name && `${selectedSupplier.contact_name} · `}
                        {selectedSupplier.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setProductForm({ product_id: "", unit_cost: "", min_order_qty: "", lead_time_days: "", supplier_sku: "", is_preferred: false });
                      setShowProductForm(true);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-black text-[13px] font-medium rounded-full hover:bg-white/90 transition-colors"
                  >
                    <Plus size={14} />
                    Add Product
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-4">
                    <p className="text-[11px] text-white/30 tracking-wide mb-1">Products</p>
                    <p className="font-display text-2xl text-white">{supplierProducts.length}</p>
                  </div>
                  <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-4">
                    <p className="text-[11px] text-white/30 tracking-wide mb-1">Lead Time</p>
                    <p className="font-display text-2xl text-white">{selectedSupplier.lead_time_days || "—"}<span className="text-sm text-white/30 ml-1">days</span></p>
                  </div>
                  <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-4">
                    <p className="text-[11px] text-white/30 tracking-wide mb-1">Payment Terms</p>
                    <p className="text-[13px] text-white/70 mt-1">{selectedSupplier.payment_terms || "—"}</p>
                  </div>
                  <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-4">
                    <p className="text-[11px] text-white/30 tracking-wide mb-1">Location</p>
                    <p className="text-[13px] text-white/70 mt-1">
                      {[selectedSupplier.city, selectedSupplier.country].filter(Boolean).join(", ") || "—"}
                    </p>
                  </div>
                </div>

                <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/[0.06]">
                    <h2 className="text-[14px] font-medium text-white">Supplier Products</h2>
                  </div>
                  {supplierProductsLoading ? (
                    <div className="px-6 py-12 text-center text-white/25 text-[13px]">Loading products...</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-white/[0.05]">
                            <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">PRODUCT</th>
                            <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">UNIT COST</th>
                            <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">MIN ORDER</th>
                            <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">LEAD TIME</th>
                            <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">SKU</th>
                            <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">PREFERRED</th>
                            <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {supplierProducts.map((sp) => (
                            <tr key={sp.id || sp.product_id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                              <td className="px-6 py-3">
                                <div className="flex items-center gap-3">
                                  {sp.product_image && (
                                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/[0.04] border border-white/[0.06] flex-shrink-0">
                                      <img src={sp.product_image} alt="" className="w-full h-full object-cover" />
                                    </div>
                                  )}
                                  <span className="text-[13px] text-white/80">{sp.product_name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-3 text-[13px] text-white/80">${sp.unit_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className="px-6 py-3 text-[12px] text-white/50">{sp.min_order_qty}</td>
                              <td className="px-6 py-3 text-[12px] text-white/50">{sp.lead_time_days}d</td>
                              <td className="px-6 py-3 text-[12px] text-white/40 font-mono">{sp.supplier_sku || "—"}</td>
                              <td className="px-6 py-3">
                                {sp.is_preferred ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-medium">
                                    <Star size={9} className="fill-current" />
                                    Preferred
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-white/25">—</span>
                                )}
                              </td>
                              <td className="px-6 py-3">
                                <button
                                  onClick={() => handleDeleteSupplierProduct(sp.product_id)}
                                  className="w-7 h-7 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-400/[0.06] transition-all"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </td>
                            </tr>
                          ))}
                          {supplierProducts.length === 0 && (
                            <tr>
                              <td colSpan={7} className="px-6 py-12 text-center text-white/25 text-[13px]">
                                No products from this supplier yet
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "purchase-orders" && !viewingPO && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="font-display text-3xl text-white mb-1">Purchase Orders</h1>
                    <p className="text-white/35 text-[13px]">{purchaseOrders.length} orders total</p>
                  </div>
                  <button
                    onClick={openAddPOForm}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-black text-[13px] font-medium rounded-full hover:bg-white/90 transition-colors"
                  >
                    <Plus size={14} />
                    Create PO
                  </button>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                    <input
                      type="text"
                      placeholder="Search orders..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/[0.05] border border-white/[0.08] text-white placeholder:text-white/20 rounded-xl pl-11 pr-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                    />
                  </div>
                  <div className="relative">
                    <select
                      value={poStatusFilter}
                      onChange={(e) => setPoStatusFilter(e.target.value)}
                      className="appearance-none bg-white/[0.05] border border-white/[0.08] text-white rounded-xl pl-4 pr-9 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors cursor-pointer"
                    >
                      <option value="" className="bg-[#0d0d0d]">All Statuses</option>
                      {PO_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s} className="bg-[#0d0d0d]">
                          {s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </option>
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
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">PO #</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">SUPPLIER</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">WAREHOUSE</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">TOTAL</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">STATUS</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">EXPECTED</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPOs.map((po) => (
                          <tr key={po.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-3.5 text-[13px] text-white/60 font-mono">#{po.id}</td>
                            <td className="px-6 py-3.5 text-[13px] text-white/80">{po.supplier_name}</td>
                            <td className="px-6 py-3.5 text-[12px] text-white/40">{po.warehouse || "—"}</td>
                            <td className="px-6 py-3.5 text-[13px] text-white/80 font-medium">
                              ${(po.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-3.5">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide ${PO_STATUS_COLORS[po.status] || "bg-white/10 text-white/50"}`}>
                                {po.status.replace(/_/g, " ")}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 text-[12px] text-white/35">
                              {po.expected_date ? new Date(po.expected_date).toLocaleDateString() : "—"}
                            </td>
                            <td className="px-6 py-3.5">
                              <button
                                onClick={() => handleViewPO(po)}
                                className="w-8 h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
                              >
                                <Eye size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredPOs.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-white/25 text-[13px]">No purchase orders found</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "purchase-orders" && viewingPO && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setViewingPO(null)}
                      className="w-9 h-9 rounded-xl border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <div>
                      <h1 className="font-display text-3xl text-white mb-1">PO #{viewingPO.id}</h1>
                      <p className="text-white/35 text-[13px]">
                        {viewingPO.supplier_name} · Created {new Date(viewingPO.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-block px-3 py-1.5 rounded-full text-[11px] font-medium tracking-wide ${PO_STATUS_COLORS[viewingPO.status] || "bg-white/10 text-white/50"}`}>
                      {viewingPO.status.replace(/_/g, " ")}
                    </span>
                    <div className="relative">
                      <select
                        value={viewingPO.status}
                        onChange={(e) => handleUpdatePOStatus(viewingPO.id, e.target.value)}
                        className="appearance-none pl-4 pr-9 py-2 bg-white/[0.05] border border-white/[0.08] text-white rounded-xl text-[13px] outline-none focus:border-white/20 transition-colors cursor-pointer"
                      >
                        {PO_STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s} className="bg-[#0d0d0d]">
                            {s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {viewingPO.status === "received" && (
                  <div className="bg-green-500/[0.06] border border-green-500/[0.15] rounded-2xl px-5 py-4 flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-green-400 flex-shrink-0" />
                    <div>
                      <p className="text-[13px] text-green-400 font-medium">Order Received</p>
                      <p className="text-[12px] text-green-400/60">Inventory has been automatically updated</p>
                    </div>
                  </div>
                )}

                {viewPOLoading ? (
                  <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-12 text-center text-white/25 text-[13px]">
                    Loading details...
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-4">
                        <p className="text-[11px] text-white/30 tracking-wide mb-1">Supplier</p>
                        <p className="text-[13px] text-white/80">{viewingPO.supplier_name}</p>
                      </div>
                      <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-4">
                        <p className="text-[11px] text-white/30 tracking-wide mb-1">Warehouse</p>
                        <p className="text-[13px] text-white/80">{viewingPO.warehouse || "—"}</p>
                      </div>
                      <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-4">
                        <p className="text-[11px] text-white/30 tracking-wide mb-1">Expected Date</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Calendar size={12} className="text-white/30" />
                          <p className="text-[13px] text-white/80">
                            {viewingPO.expected_date ? new Date(viewingPO.expected_date).toLocaleDateString() : "—"}
                          </p>
                        </div>
                      </div>
                      <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-4">
                        <p className="text-[11px] text-white/30 tracking-wide mb-1">Total</p>
                        <p className="font-display text-2xl text-white">
                          ${(viewingPO.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    {viewingPO.notes && (
                      <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-5">
                        <p className="text-[11px] text-white/30 tracking-wide mb-2">Notes</p>
                        <p className="text-[13px] text-white/60">{viewingPO.notes}</p>
                      </div>
                    )}

                    <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl overflow-hidden">
                      <div className="px-6 py-4 border-b border-white/[0.06]">
                        <h2 className="text-[14px] font-medium text-white">Order Items</h2>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-white/[0.05]">
                              <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">PRODUCT</th>
                              <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">QUANTITY</th>
                              <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">UNIT COST</th>
                              <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">SUBTOTAL</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(viewingPO.items || []).map((item, idx) => (
                              <tr key={item.id || idx} className="border-b border-white/[0.04]">
                                <td className="px-6 py-3.5 text-[13px] text-white/80">{item.product_name}</td>
                                <td className="px-6 py-3.5 text-[12px] text-white/50">{item.quantity}</td>
                                <td className="px-6 py-3.5 text-[13px] text-white/70">${item.unit_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="px-6 py-3.5 text-[13px] text-white/80 font-medium">
                                  ${(item.quantity * item.unit_cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                            {(!viewingPO.items || viewingPO.items.length === 0) && (
                              <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-white/25 text-[13px]">No items in this order</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {showSupplierForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowSupplierForm(false)} />
          <div className="relative w-full max-w-lg bg-[#0d0d0d] border border-white/[0.08] rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <h3 className="text-[15px] font-medium text-white">
                {editingSupplier ? "Edit Supplier" : "Add Supplier"}
              </h3>
              <button
                onClick={() => setShowSupplierForm(false)}
                className="w-8 h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-white/80 transition-all"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Company Name</label>
                  <input
                    type="text"
                    value={supplierForm.name}
                    onChange={(e) => setSupplierForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Contact Name</label>
                  <input
                    type="text"
                    value={supplierForm.contact_name}
                    onChange={(e) => setSupplierForm((f) => ({ ...f, contact_name: e.target.value }))}
                    className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                    placeholder="Contact person"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Email</label>
                  <input
                    type="email"
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Phone</label>
                  <input
                    type="text"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Address</label>
                <input
                  type="text"
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                  placeholder="Street address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">City</label>
                  <input
                    type="text"
                    value={supplierForm.city}
                    onChange={(e) => setSupplierForm((f) => ({ ...f, city: e.target.value }))}
                    className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Country</label>
                  <input
                    type="text"
                    value={supplierForm.country}
                    onChange={(e) => setSupplierForm((f) => ({ ...f, country: e.target.value }))}
                    className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                    placeholder="Country"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Payment Terms</label>
                  <input
                    type="text"
                    value={supplierForm.payment_terms}
                    onChange={(e) => setSupplierForm((f) => ({ ...f, payment_terms: e.target.value }))}
                    className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                    placeholder="e.g. Net 30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Lead Time (days)</label>
                  <input
                    type="number"
                    value={supplierForm.lead_time_days}
                    onChange={(e) => setSupplierForm((f) => ({ ...f, lead_time_days: e.target.value }))}
                    className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-3">
              <button
                onClick={() => setShowSupplierForm(false)}
                className="px-5 py-2.5 text-[13px] text-white/50 hover:text-white/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSupplier}
                disabled={savingSupplier || !supplierForm.name}
                className="px-5 py-2.5 bg-white text-black text-[13px] font-medium rounded-full hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingSupplier ? "Saving..." : editingSupplier ? "Update Supplier" : "Add Supplier"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showProductForm && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowProductForm(false)} />
          <div className="relative w-full max-w-md bg-[#0d0d0d] border border-white/[0.08] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <h3 className="text-[15px] font-medium text-white">Add Supplier Product</h3>
              <button
                onClick={() => setShowProductForm(false)}
                className="w-8 h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-white/80 transition-all"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Product</label>
                <div className="relative">
                  <select
                    value={productForm.product_id}
                    onChange={(e) => setProductForm((f) => ({ ...f, product_id: e.target.value }))}
                    className="w-full appearance-none bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors cursor-pointer"
                  >
                    <option value="" className="bg-[#0d0d0d]">Select product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id} className="bg-[#0d0d0d]">
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Unit Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.unit_cost}
                    onChange={(e) => setProductForm((f) => ({ ...f, unit_cost: e.target.value }))}
                    className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Min Order Qty</label>
                  <input
                    type="number"
                    value={productForm.min_order_qty}
                    onChange={(e) => setProductForm((f) => ({ ...f, min_order_qty: e.target.value }))}
                    className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Lead Time (days)</label>
                  <input
                    type="number"
                    value={productForm.lead_time_days}
                    onChange={(e) => setProductForm((f) => ({ ...f, lead_time_days: e.target.value }))}
                    className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Supplier SKU</label>
                  <input
                    type="text"
                    value={productForm.supplier_sku}
                    onChange={(e) => setProductForm((f) => ({ ...f, supplier_sku: e.target.value }))}
                    className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                    placeholder="SKU-001"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={productForm.is_preferred}
                    onChange={(e) => setProductForm((f) => ({ ...f, is_preferred: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 rounded-full bg-white/10 peer-checked:bg-amber-500/30 transition-colors" />
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white/40 peer-checked:bg-amber-400 peer-checked:translate-x-4 transition-all" />
                </div>
                <span className="text-[13px] text-white/60">Preferred supplier</span>
              </label>
            </div>

            <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-3">
              <button
                onClick={() => setShowProductForm(false)}
                className="px-5 py-2.5 text-[13px] text-white/50 hover:text-white/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSupplierProduct}
                disabled={savingProduct || !productForm.product_id || !productForm.unit_cost}
                className="px-5 py-2.5 bg-white text-black text-[13px] font-medium rounded-full hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingProduct ? "Adding..." : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPOForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowPOForm(false)} />
          <div className="relative w-full max-w-2xl bg-[#0d0d0d] border border-white/[0.08] rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <h3 className="text-[15px] font-medium text-white">Create Purchase Order</h3>
              <button
                onClick={() => setShowPOForm(false)}
                className="w-8 h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-white/80 transition-all"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Supplier</label>
                  <div className="relative">
                    <select
                      value={poForm.supplier_id}
                      onChange={(e) => setPoForm((f) => ({ ...f, supplier_id: e.target.value }))}
                      className="w-full appearance-none bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors cursor-pointer"
                    >
                      <option value="" className="bg-[#0d0d0d]">Select supplier</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id} className="bg-[#0d0d0d]">
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Warehouse</label>
                  <div className="relative">
                    <select
                      value={poForm.warehouse_id}
                      onChange={(e) => setPoForm((f) => ({ ...f, warehouse_id: e.target.value }))}
                      className="w-full appearance-none bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors cursor-pointer"
                    >
                      <option value="" className="bg-[#0d0d0d]">Select warehouse</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id} className="bg-[#0d0d0d]">
                          {w.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Expected Date</label>
                <input
                  type="date"
                  value={poForm.expected_date}
                  onChange={(e) => setPoForm((f) => ({ ...f, expected_date: e.target.value }))}
                  className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[11px] text-white/30 tracking-wide">Order Items</label>
                  <button
                    onClick={handleAddPOItem}
                    className="flex items-center gap-1.5 text-[12px] text-white/50 hover:text-white/80 transition-colors"
                  >
                    <Plus size={12} />
                    Add Item
                  </button>
                </div>

                <div className="space-y-3">
                  {poItems.map((item, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="relative">
                          <select
                            value={item.product_id}
                            onChange={(e) => handlePOItemChange(index, "product_id", e.target.value)}
                            className="w-full appearance-none bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors cursor-pointer"
                          >
                            <option value="" className="bg-[#0d0d0d]">Product</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id} className="bg-[#0d0d0d]">
                                {p.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                        </div>
                      </div>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handlePOItemChange(index, "quantity", e.target.value)}
                        className="w-20 bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors text-center"
                        placeholder="Qty"
                        min="1"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={item.unit_cost}
                        onChange={(e) => handlePOItemChange(index, "unit_cost", e.target.value)}
                        className="w-28 bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                        placeholder="Cost"
                      />
                      {poItems.length > 1 && (
                        <button
                          onClick={() => handleRemovePOItem(index)}
                          className="w-9 h-9 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-400/[0.06] transition-all flex-shrink-0 mt-0.5"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Notes</label>
                <textarea
                  value={poForm.notes}
                  onChange={(e) => setPoForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors resize-none"
                  placeholder="Optional notes..."
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-[13px] text-white/40">
                  Total:{" "}
                  <span className="text-white/80 font-medium">
                    ${poItems
                      .reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0), 0)
                      .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-3">
              <button
                onClick={() => setShowPOForm(false)}
                className="px-5 py-2.5 text-[13px] text-white/50 hover:text-white/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePO}
                disabled={savingPO || !poForm.supplier_id || poItems.filter((i) => i.product_id && i.unit_cost).length === 0}
                className="px-5 py-2.5 bg-white text-black text-[13px] font-medium rounded-full hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingPO ? "Creating..." : "Create Purchase Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
