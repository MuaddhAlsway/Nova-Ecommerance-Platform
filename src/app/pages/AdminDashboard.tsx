import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  TrendingUp,
  Edit,
  Trash2,
  Plus,
  X,
  ChevronDown,
  Search,
  Eye,
  Shield,
  Mail,
  Lock,
  AlertTriangle,
  Truck,
  Star,
  MessageSquareQuote,
  Send,
} from "lucide-react";
import { API_BASE } from "../config";

type Tab = "overview" | "products" | "orders" | "users" | "categories" | "coupons" | "testimonials" | "notifications";

const STATUS_OPTIONS = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-400/15 text-amber-400",
  confirmed: "bg-blue-400/15 text-blue-400",
  shipped: "bg-purple-400/15 text-purple-400",
  delivered: "bg-emerald-400/15 text-emerald-400",
  cancelled: "bg-red-400/15 text-red-400",
};

interface Stats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
}

interface Product {
  id: number;
  name: string;
  subtitle: string;
  description?: string;
  price: number;
  original_price?: number;
  badge?: string;
  stock: number;
  rating: number;
  image: string;
  category_id?: number;
  category?: string;
  category_name?: string;
}

interface Order {
  id: number;
  user_name?: string;
  customer_name?: string;
  name?: string;
  email: string;
  total: number;
  status: string;
  created_at: string;
  date?: string;
  items?: { product_name: string; quantity: number; price: number }[];
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  phone?: string;
  address?: string;
  created_at: string;
}

interface OrderDetail extends Order {
  shipping_name?: string;
  shipping_address?: string;
  shipping_city?: string;
  shipping_zip?: string;
  shipping_method?: string;
  shipping_carrier?: string;
  payment_method?: string;
  stripe_payment_id?: string;
  shipping_tracking_number?: string;
  shipping_status?: string;
  user_name?: string;
  user_email?: string;
  items: { product_name: string; quantity: number; price: number; product_image?: string }[];
}

interface Coupon {
  id: number;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order: number;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  is_active: number;
}

interface Testimonial {
  id: number;
  name: string;
  role: string;
  avatar: string;
  quote: string;
  rating: number;
  is_active: number;
}

const EMPTY_FORM = {
  name: "",
  subtitle: "",
  description: "",
  price: "",
  original_price: "",
  badge: "",
  stock: "",
  image: "",
  category_id: "",
  rating: "",
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, token, login, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminLoggingIn, setAdminLoggingIn] = useState(false);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [viewingOrder, setViewingOrder] = useState<OrderDetail | null>(null);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState({ name: "", icon: "", color: "" });
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [couponForm, setCouponForm] = useState({ code: "", discount_type: "percent", discount_value: "", min_order: "", max_uses: "", expires_at: "" });
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [showTestimonialForm, setShowTestimonialForm] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [testimonialForm, setTestimonialForm] = useState({ name: "", role: "", avatar: "", quote: "", rating: "5", is_active: true });
  const [broadcastForm, setBroadcastForm] = useState({ subject: "", title: "", message: "", target: "all" });
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null);

  const authHeaders = token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };

  useEffect(() => {
    if (!token || !user || user.role !== "admin") { setLoading(false); return; }
    setLoading(true);

    Promise.all([
      fetch(`${API_BASE}/api/admin/stats`, { headers: authHeaders }).then((r) => r.ok ? r.json() : null),
      fetch(`${API_BASE}/api/products`, { headers: authHeaders }).then((r) => r.ok ? r.json() : []),
      fetch(`${API_BASE}/api/orders/all`, { headers: authHeaders }).then((r) => r.ok ? r.json() : []),
      fetch(`${API_BASE}/api/categories`, { headers: authHeaders }).then((r) => r.ok ? r.json() : []),
      fetch(`${API_BASE}/api/admin/users`, { headers: authHeaders }).then((r) => r.ok ? r.json() : []),
      fetch(`${API_BASE}/api/coupons`, { headers: authHeaders }).then((r) => r.ok ? r.json() : []),
      fetch(`${API_BASE}/api/testimonials/all`, { headers: authHeaders }).then((r) => r.ok ? r.json() : []),
    ])
      .then(([statsData, productsData, ordersData, categoriesData, usersData, couponsData, testimonialsData]) => {
        if (statsData) setStats(statsData);
        setProducts(Array.isArray(productsData) ? productsData : productsData.products || []);
        setOrders(Array.isArray(ordersData) ? ordersData : ordersData.orders || []);
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        setUsers(Array.isArray(usersData) ? usersData : []);
        setCoupons(Array.isArray(couponsData) ? couponsData : []);
        setTestimonials(Array.isArray(testimonialsData) ? testimonialsData : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, user]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError("");
    setAdminLoggingIn(true);
    try {
      await login(adminEmail, adminPassword);
    } catch (err: any) {
      setAdminError(err.message || "Invalid admin credentials");
    } finally {
      setAdminLoggingIn(false);
    }
  };

  const openAddForm = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEditForm = (p: Product) => {
    setEditingProduct(p);
    setForm({
      name: p.name,
      subtitle: p.subtitle || "",
      description: p.description || "",
      price: String(p.price),
      original_price: p.original_price ? String(p.original_price) : "",
      badge: p.badge || "",
      stock: String(p.stock),
      image: p.image,
      category_id: p.category_id ? String(p.category_id) : "",
      rating: p.rating ? String(p.rating) : "",
    });
    setShowForm(true);
  };

  const handleSaveProduct = async () => {
    setSaving(true);
    try {
      const body = {
        name: form.name,
        subtitle: form.subtitle,
        description: form.description,
        price: Number(form.price),
        original_price: form.original_price ? Number(form.original_price) : undefined,
        badge: form.badge || undefined,
        stock: Number(form.stock),
        image: form.image,
        category_id: form.category_id ? Number(form.category_id) : undefined,
        rating: form.rating ? Number(form.rating) : undefined,
      };

      if (editingProduct) {
        const res = await fetch(`${API_BASE}/api/products/${editingProduct.id}`, {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const updated = await res.json();
          setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? { ...p, ...updated } : p)));
        }
      } else {
        const res = await fetch(`${API_BASE}/api/products`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const created = await res.json();
          setProducts((prev) => [...prev, created]);
        }
      }
      setShowForm(false);
      setEditingProduct(null);
      setForm(EMPTY_FORM);
    } catch {}
    setSaving(false);
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/products/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (res.ok) setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch {}
  };

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
      }
    } catch {}
  };

  const viewOrderDetail = async (orderId: number) => {
    setOrderDetailLoading(true);
    setViewingOrder(null);
    try {
      const res = await fetch(`${API_BASE}/api/orders/detail/${orderId}`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setViewingOrder(data);
      }
    } catch {}
    setOrderDetailLoading(false);
  };

  const handleSaveCategory = async () => {
    try {
      if (editingCategory) {
        await fetch(`${API_BASE}/api/admin/categories/${editingCategory.id}`, {
          method: "PUT", headers: authHeaders,
          body: JSON.stringify(catForm),
        });
        setCategories((prev) => prev.map((c) => c.id === editingCategory.id ? { ...c, ...catForm } : c));
      } else {
        const res = await fetch(`${API_BASE}/api/admin/categories`, {
          method: "POST", headers: authHeaders,
          body: JSON.stringify(catForm),
        });
        if (res.ok) {
          const created = await res.json();
          setCategories((prev) => [...prev, created]);
        }
      }
      setShowCategoryForm(false);
      setEditingCategory(null);
      setCatForm({ name: "", icon: "", color: "" });
    } catch {}
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("Delete this category?")) return;
    try {
      await fetch(`${API_BASE}/api/admin/categories/${id}`, { method: "DELETE", headers: authHeaders });
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch {}
  };

  const handleSaveCoupon = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/coupons`, {
        method: "POST", headers: authHeaders,
        body: JSON.stringify({
          code: couponForm.code,
          discount_type: couponForm.discount_type,
          discount_value: Number(couponForm.discount_value),
          min_order: Number(couponForm.min_order) || 0,
          max_uses: Number(couponForm.max_uses) || 0,
          expires_at: couponForm.expires_at || null,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setCoupons((prev) => [...prev, created]);
      }
      setShowCouponForm(false);
      setCouponForm({ code: "", discount_type: "percent", discount_value: "", min_order: "", max_uses: "", expires_at: "" });
    } catch {}
  };

  const handleDeleteCoupon = async (id: number) => {
    if (!confirm("Delete this coupon?")) return;
    try {
      await fetch(`${API_BASE}/api/coupons/${id}`, { method: "DELETE", headers: authHeaders });
      setCoupons((prev) => prev.filter((c) => c.id !== id));
    } catch {}
  };

  const handleSaveTestimonial = async () => {
    try {
      const body = {
        name: testimonialForm.name,
        role: testimonialForm.role || null,
        avatar: testimonialForm.avatar || null,
        quote: testimonialForm.quote,
        rating: Number(testimonialForm.rating) || 5,
        is_active: testimonialForm.is_active,
      };
      if (editingTestimonial) {
        const res = await fetch(`${API_BASE}/api/testimonials/${editingTestimonial.id}`, {
          method: "PUT", headers: authHeaders, body: JSON.stringify(body),
        });
        if (res.ok) {
          const updated = await res.json();
          setTestimonials((prev) => prev.map((t) => (t.id === editingTestimonial.id ? updated : t)));
        }
      } else {
        const res = await fetch(`${API_BASE}/api/testimonials`, {
          method: "POST", headers: authHeaders, body: JSON.stringify(body),
        });
        if (res.ok) {
          const created = await res.json();
          setTestimonials((prev) => [...prev, created]);
        }
      }
      setShowTestimonialForm(false);
      setEditingTestimonial(null);
      setTestimonialForm({ name: "", role: "", avatar: "", quote: "", rating: "5", is_active: true });
    } catch {}
  };

  const handleDeleteTestimonial = async (id: number) => {
    if (!confirm("Delete this testimonial?")) return;
    try {
      await fetch(`${API_BASE}/api/testimonials/${id}`, { method: "DELETE", headers: authHeaders });
      setTestimonials((prev) => prev.filter((t) => t.id !== id));
    } catch {}
  };

  const openEditTestimonial = (t: Testimonial) => {
    setEditingTestimonial(t);
    setTestimonialForm({
      name: t.name,
      role: t.role || "",
      avatar: t.avatar || "",
      quote: t.quote,
      rating: String(t.rating),
      is_active: !!t.is_active,
    });
    setShowTestimonialForm(true);
  };

  const openAddTestimonial = () => {
    setEditingTestimonial(null);
    setTestimonialForm({ name: "", role: "", avatar: "", quote: "", rating: "5", is_active: true });
    setShowTestimonialForm(true);
  };

  const handleBroadcast = async () => {
    if (!broadcastForm.subject || !broadcastForm.message) return;
    setBroadcastSending(true);
    setBroadcastResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/broadcast`, {
        method: "POST", headers: authHeaders,
        body: JSON.stringify(broadcastForm),
      });
      const data = await res.json();
      if (res.ok) {
        setBroadcastResult(`Sent to ${data.sent}/${data.total} users`);
        setBroadcastForm({ subject: "", title: "", message: "", target: "all" });
      } else {
        setBroadcastResult(data.error || "Failed to send");
      }
    } catch {
      setBroadcastResult("Failed to send broadcast");
    }
    setBroadcastSending(false);
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category_name || p.category || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOrders = orders.filter(
    (o) =>
      (o.user_name || o.customer_name || o.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(o.id).includes(searchQuery)
  );

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="text-white/25 text-sm">Loading dashboard...</div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-10">
            <div className="text-center mb-10">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mx-auto mb-5">
                <Shield size={24} className="text-white/50" />
              </div>
              <h1 className="font-display text-lg tracking-[0.35em] text-white mb-4">NOVA</h1>
              <h2 className="font-display text-2xl text-white mb-2">Admin Access</h2>
              <p className="text-white/40 text-[13px]">Sign in with an administrator account</p>
            </div>

            {adminError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6 flex items-center gap-2.5">
                <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-[13px]">{adminError}</p>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                <input
                  type="email"
                  placeholder="Admin email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.08] text-white placeholder:text-white/20 rounded-xl pl-11 pr-4 py-3 text-[13px] outline-none focus:border-white/20 transition-colors"
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                <input
                  type="password"
                  placeholder="Password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.08] text-white placeholder:text-white/20 rounded-xl pl-11 pr-4 py-3 text-[13px] outline-none focus:border-white/20 transition-colors"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={adminLoggingIn}
                className="w-full bg-white text-black font-medium rounded-full py-3 text-[13px] hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {adminLoggingIn ? "Signing in..." : "Sign In as Admin"}
              </button>
            </form>

            <p className="text-center mt-8 text-white/30 text-[11px]">
              Admin access is restricted to authorized personnel
            </p>
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Users",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: "from-blue-500/10 to-blue-500/5",
    },
    {
      label: "Total Products",
      value: stats?.totalProducts ?? 0,
      icon: Package,
      color: "from-purple-500/10 to-purple-500/5",
    },
    {
      label: "Total Orders",
      value: stats?.totalOrders ?? 0,
      icon: ShoppingCart,
      color: "from-emerald-500/10 to-emerald-500/5",
    },
    {
      label: "Total Revenue",
      value: `$${(stats?.totalRevenue ?? 0).toLocaleString()}`,
      icon: DollarSign,
      color: "from-amber-500/10 to-amber-500/5",
    },
  ];

  const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "products", label: "Products", icon: Package },
    { id: "orders", label: "Orders", icon: ShoppingCart },
    { id: "users", label: "Users", icon: Users },
    { id: "categories", label: "Categories", icon: LayoutDashboard },
    { id: "coupons", label: "Coupons", icon: DollarSign },
    { id: "testimonials", label: "Testimonials", icon: MessageSquareQuote },
    { id: "notifications", label: "Notifications", icon: Send },
  ];

  const logisticsLinks = [
    { label: "Fulfillment", path: "/admin/fulfillment", icon: Truck },
    { label: "Inventory", path: "/admin/inventory", icon: Package },
    { label: "Suppliers", path: "/admin/suppliers", icon: Users },
    { label: "Analytics", path: "/admin/analytics", icon: LayoutDashboard },
  ];

  return (
    <div className="min-h-screen bg-[#080808] antialiased">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-[#050505]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-display text-lg tracking-[0.35em] text-white font-light">NOVA</span>
            <span className="text-[10px] tracking-[0.25em] text-white/25 border border-white/[0.08] px-2.5 py-1 rounded-full">
              ADMIN
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

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
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
              <div className="hidden lg:block border-t border-white/[0.06] my-2" />
              <p className="hidden lg:block text-[10px] tracking-[0.2em] text-white/20 px-4 pt-1 pb-0.5">LOGISTICS</p>
              {logisticsLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] text-white/40 hover:text-white/70 hover:bg-white/[0.03] border border-transparent transition-all whitespace-nowrap"
                  >
                    <Icon size={16} />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Overview */}
            {activeTab === "overview" && (
              <div className="space-y-8">
                <div>
                  <h1 className="font-display text-3xl text-white mb-1">Overview</h1>
                  <p className="text-white/35 text-[13px]">Your store at a glance</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {statCards.map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div
                        key={stat.label}
                        className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-5"
                      >
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

                {/* Recent Orders */}
                <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/[0.06]">
                    <h2 className="text-[14px] font-medium text-white">Recent Orders</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/[0.05]">
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">ORDER</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">CUSTOMER</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">TOTAL</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">STATUS</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">DATE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.slice(0, 5).map((order) => (
                          <tr key={order.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-3.5 text-[13px] text-white/60">#{order.id}</td>
                            <td className="px-6 py-3.5">
                              <p className="text-[13px] text-white/80">{order.user_name || order.customer_name || order.name || "—"}</p>
                              <p className="text-[11px] text-white/30">{order.email}</p>
                            </td>
                            <td className="px-6 py-3.5 text-[13px] text-white/80">${order.total.toLocaleString()}</td>
                            <td className="px-6 py-3.5">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide ${STATUS_COLORS[order.status] || "bg-white/10 text-white/50"}`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 text-[12px] text-white/35">
                              {new Date(order.created_at || order.date || "").toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                        {orders.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-white/25 text-[13px]">No orders yet</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Products */}
            {activeTab === "products" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="font-display text-3xl text-white mb-1">Products</h1>
                    <p className="text-white/35 text-[13px]">{products.length} products total</p>
                  </div>
                  <button
                    onClick={openAddForm}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-black text-[13px] font-medium rounded-full hover:bg-white/90 transition-colors"
                  >
                    <Plus size={14} />
                    Add Product
                  </button>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/[0.08] text-white placeholder:text-white/20 rounded-xl pl-11 pr-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                  />
                </div>

                <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/[0.05]">
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">PRODUCT</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">CATEGORY</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">PRICE</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">STOCK</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">RATING</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.map((product) => (
                          <tr key={product.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/[0.04] border border-white/[0.06] flex-shrink-0">
                                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                  <p className="text-[13px] text-white/80 font-medium">{product.name}</p>
                                  <p className="text-[11px] text-white/30">{product.subtitle}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-3 text-[12px] text-white/40">{product.category_name || product.category || "—"}</td>
                            <td className="px-6 py-3 text-[13px] text-white/80">${product.price.toLocaleString()}</td>
                            <td className="px-6 py-3">
                              <span className={`text-[12px] font-medium ${product.stock <= 5 ? "text-red-400" : product.stock <= 20 ? "text-amber-400" : "text-emerald-400"}`}>
                                {product.stock}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-[12px] text-white/50">{product.rating?.toFixed(1) || "—"}</td>
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openEditForm(product)}
                                  className="w-8 h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
                                >
                                  <Edit size={13} />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(product.id)}
                                  className="w-8 h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-400/[0.06] transition-all"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredProducts.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-white/25 text-[13px]">No products found</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Orders */}
            {activeTab === "orders" && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-display text-3xl text-white mb-1">Orders</h1>
                  <p className="text-white/35 text-[13px]">{orders.length} orders total</p>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                  <input
                    type="text"
                    placeholder="Search by customer, email, or order ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/[0.08] text-white placeholder:text-white/20 rounded-xl pl-11 pr-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                  />
                </div>

                <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/[0.05]">
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">ORDER ID</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">CUSTOMER</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">TOTAL</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">STATUS</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">DATE</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map((order) => (
                          <tr key={order.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-3.5 text-[13px] text-white/60 font-mono">#{order.id}</td>
                            <td className="px-6 py-3.5">
                              <p className="text-[13px] text-white/80">{order.user_name || order.customer_name || order.name || "—"}</p>
                              <p className="text-[11px] text-white/30">{order.email}</p>
                            </td>
                            <td className="px-6 py-3.5 text-[13px] text-white/80 font-medium">${order.total.toLocaleString()}</td>
                            <td className="px-6 py-3.5">
                              <div className="relative">
                                <select
                                  value={order.status}
                                  onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                  className={`appearance-none pl-3 pr-7 py-1.5 rounded-lg text-[11px] font-medium tracking-wide border border-white/[0.08] bg-white/[0.04] outline-none cursor-pointer transition-colors hover:border-white/[0.15] ${STATUS_COLORS[order.status] || "text-white/50"}`}
                                >
                                  {STATUS_OPTIONS.map((s) => (
                                    <option key={s} value={s} className="bg-[#0d0d0d] text-white">
                                      {s.charAt(0).toUpperCase() + s.slice(1)}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                              </div>
                            </td>
                            <td className="px-6 py-3.5 text-[12px] text-white/35">
                              {new Date(order.created_at || order.date || "").toLocaleDateString()}
                            </td>
                            <td className="px-6 py-3.5">
                              <button onClick={() => viewOrderDetail(order.id)} className="w-8 h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all">
                                <Eye size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredOrders.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-white/25 text-[13px]">No orders found</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Users */}
            {activeTab === "users" && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-display text-3xl text-white mb-1">Users</h1>
                  <p className="text-white/35 text-[13px]">{users.length} registered users</p>
                </div>
                <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/[0.05]">
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">USER</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">ROLE</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">PHONE</th>
                          <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">JOINED</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-white/[0.08] border border-white/[0.1] flex items-center justify-center">
                                  <span className="text-[11px] text-white/60 font-medium">{u.name.charAt(0).toUpperCase()}</span>
                                </div>
                                <div>
                                  <p className="text-[13px] text-white/80 font-medium">{u.name}</p>
                                  <p className="text-[11px] text-white/30">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-3.5">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide ${u.role === "admin" ? "bg-amber-400/15 text-amber-400" : "bg-white/10 text-white/50"}`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 text-[13px] text-white/50">{u.phone || "—"}</td>
                            <td className="px-6 py-3.5 text-[12px] text-white/35">{new Date(u.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Categories */}
            {activeTab === "categories" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="font-display text-3xl text-white mb-1">Categories</h1>
                    <p className="text-white/35 text-[13px]">{categories.length} categories</p>
                  </div>
                  <button onClick={() => { setEditingCategory(null); setCatForm({ name: "", icon: "", color: "" }); setShowCategoryForm(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-white text-black text-[13px] font-medium rounded-full hover:bg-white/90 transition-colors">
                    <Plus size={14} /> Add Category
                  </button>
                </div>
                <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/[0.05]">
                        <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">NAME</th>
                        <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">ICON</th>
                        <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">PRODUCTS</th>
                        <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((cat) => (
                        <tr key={cat.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-3.5 text-[13px] text-white/80 font-medium">{cat.name}</td>
                          <td className="px-6 py-3.5 text-[12px] text-white/40">{(cat as any).icon || "—"}</td>
                          <td className="px-6 py-3.5 text-[12px] text-white/40">{(cat as any).count ?? 0}</td>
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-2">
                              <button onClick={() => { setEditingCategory(cat); setCatForm({ name: cat.name, icon: (cat as any).icon || "", color: (cat as any).color || "" }); setShowCategoryForm(true); }} className="w-8 h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all">
                                <Edit size={13} />
                              </button>
                              <button onClick={() => handleDeleteCategory(cat.id)} className="w-8 h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-400/[0.06] transition-all">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Coupons */}
            {activeTab === "coupons" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="font-display text-3xl text-white mb-1">Coupons</h1>
                    <p className="text-white/35 text-[13px]">{coupons.length} active coupons</p>
                  </div>
                  <button onClick={() => setShowCouponForm(true)} className="flex items-center gap-2 px-5 py-2.5 bg-white text-black text-[13px] font-medium rounded-full hover:bg-white/90 transition-colors">
                    <Plus size={14} /> Add Coupon
                  </button>
                </div>
                <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/[0.05]">
                        <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">CODE</th>
                        <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">DISCOUNT</th>
                        <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">MIN ORDER</th>
                        <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">USES</th>
                        <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">STATUS</th>
                        <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coupons.map((c) => (
                        <tr key={c.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-3.5 text-[13px] text-white/80 font-mono font-medium">{c.code}</td>
                          <td className="px-6 py-3.5 text-[13px] text-white/70">{c.discount_type === "percent" ? `${c.discount_value}%` : `$${c.discount_value}`}</td>
                          <td className="px-6 py-3.5 text-[12px] text-white/40">${c.min_order}</td>
                          <td className="px-6 py-3.5 text-[12px] text-white/40">{c.used_count}{c.max_uses > 0 ? `/${c.max_uses}` : ""}</td>
                          <td className="px-6 py-3.5">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide ${c.is_active ? "bg-emerald-400/15 text-emerald-400" : "bg-white/10 text-white/40"}`}>
                              {c.is_active ? "Active" : "Disabled"}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <button onClick={() => handleDeleteCoupon(c.id)} className="w-8 h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-400/[0.06] transition-all">
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "testimonials" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="font-display text-3xl text-white mb-1">Testimonials</h1>
                    <p className="text-white/35 text-[13px]">{testimonials.length} testimonials on homepage</p>
                  </div>
                  <button onClick={openAddTestimonial} className="flex items-center gap-2 px-5 py-2.5 bg-white text-black text-[13px] font-medium rounded-full hover:bg-white/90 transition-colors">
                    <Plus size={14} /> Add Testimonial
                  </button>
                </div>
                <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/[0.05]">
                        <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">NAME</th>
                        <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">ROLE</th>
                        <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">QUOTE</th>
                        <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">RATING</th>
                        <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">STATUS</th>
                        <th className="px-6 py-3 text-[10px] text-white/25 tracking-[0.15em] font-medium">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testimonials.map((t) => (
                        <tr key={t.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-3.5 text-[13px] text-white/80 font-medium">{t.name}</td>
                          <td className="px-6 py-3.5 text-[12px] text-white/40">{t.role || "-"}</td>
                          <td className="px-6 py-3.5 text-[12px] text-white/50 max-w-[280px] truncate">{t.quote}</td>
                          <td className="px-6 py-3.5">
                            <div className="flex gap-0.5">
                              {Array.from({ length: 5 }).map((_, s) => (
                                <Star key={s} size={12} className={s < t.rating ? "fill-amber-400 text-amber-400" : "text-white/15"} />
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide ${t.is_active ? "bg-emerald-400/15 text-emerald-400" : "bg-white/10 text-white/40"}`}>
                              {t.is_active ? "Active" : "Hidden"}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="flex gap-2">
                              <button onClick={() => openEditTestimonial(t)} className="w-8 h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all">
                                <Edit size={13} />
                              </button>
                              <button onClick={() => handleDeleteTestimonial(t.id)} className="w-8 h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-400/[0.06] transition-all">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-display text-3xl text-white mb-1">Send Notifications</h1>
                  <p className="text-white/35 text-[13px]">Send email alerts about discounts, new arrivals, and promotions to your users</p>
                </div>

                <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-6 space-y-5">
                  <div>
                    <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Recipients</label>
                    <div className="flex gap-3">
                      {[
                        { value: "all", label: "All Users" },
                        { value: "customers", label: "Customers Only" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setBroadcastForm((f) => ({ ...f, target: opt.value }))}
                          className={`px-4 py-2 rounded-full text-[13px] border transition-all ${
                            broadcastForm.target === opt.value
                              ? "bg-white text-black border-white"
                              : "border-white/[0.08] text-white/50 hover:text-white/80"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Email Subject *</label>
                    <input
                      type="text"
                      value={broadcastForm.subject}
                      onChange={(e) => setBroadcastForm((f) => ({ ...f, subject: e.target.value }))}
                      className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                      placeholder="e.g. Flash Sale — 30% Off All Headphones"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Headline (optional)</label>
                    <input
                      type="text"
                      value={broadcastForm.title}
                      onChange={(e) => setBroadcastForm((f) => ({ ...f, title: e.target.value }))}
                      className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                      placeholder="e.g. Exclusive Offer Inside"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Message *</label>
                    <textarea
                      value={broadcastForm.message}
                      onChange={(e) => setBroadcastForm((f) => ({ ...f, message: e.target.value }))}
                      className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors resize-none h-32"
                      placeholder="Write your message here... Use \n for new lines"
                    />
                  </div>

                  {broadcastResult && (
                    <div className={`text-[13px] px-4 py-2.5 rounded-xl ${broadcastResult.includes("Sent") ? "bg-emerald-400/10 text-emerald-400" : "bg-red-400/10 text-red-400"}`}>
                      {broadcastResult}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-[11px] text-white/20">Emails sent via Gmail SMTP. Configured in wrangler.toml</p>
                    <button
                      onClick={handleBroadcast}
                      disabled={broadcastSending || !broadcastForm.subject || !broadcastForm.message}
                      className="flex items-center gap-2 px-6 py-2.5 bg-white text-black text-[13px] font-medium rounded-full hover:bg-white/90 transition-colors disabled:opacity-40"
                    >
                      <Send size={13} />
                      {broadcastSending ? "Sending..." : "Send Broadcast"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-lg bg-[#0d0d0d] border border-white/[0.08] rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <h3 className="text-[15px] font-medium text-white">
                {editingProduct ? "Edit Product" : "Add Product"}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-white/80 transition-all"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                  placeholder="Product name"
                />
              </div>

              <div>
                <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Subtitle</label>
                <input
                  type="text"
                  value={form.subtitle}
                  onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                  className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                  placeholder="Short description"
                />
              </div>

              <div>
                <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors resize-none"
                  placeholder="Full description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Price</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Original Price</label>
                  <input
                    type="number"
                    value={form.original_price}
                    onChange={(e) => setForm((f) => ({ ...f, original_price: e.target.value }))}
                    className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Stock</label>
                  <input
                    type="number"
                    value={form.stock}
                    onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                    className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Badge</label>
                  <input
                    type="text"
                    value={form.badge}
                    onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))}
                    className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                    placeholder="e.g. New, Sale"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Category</label>
                <div className="relative">
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                    className="w-full appearance-none bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors cursor-pointer"
                  >
                    <option value="" className="bg-[#0d0d0d]">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id} className="bg-[#0d0d0d]">
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Rating (0 - 5)</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={form.rating}
                    onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}
                    className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Image URL</label>
                  <input
                    type="url"
                    value={form.image}
                    onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                    className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors"
                    placeholder="https://..."
                  />
                </div>
              </div>

              {form.image && (
                <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-white/[0.03] aspect-video">
                  <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.06]">
              <button
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 text-[13px] text-white/50 hover:text-white/80 rounded-full border border-white/[0.08] hover:border-white/[0.15] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProduct}
                disabled={saving || !form.name || !form.price}
                className="px-6 py-2.5 bg-white text-black text-[13px] font-medium rounded-full hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : editingProduct ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {(viewingOrder || orderDetailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setViewingOrder(null)} />
          <div className="relative w-full max-w-lg bg-[#0d0d0d] border border-white/[0.08] rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <h3 className="text-[15px] font-medium text-white">Order #{viewingOrder?.id || "..."}</h3>
              <button onClick={() => setViewingOrder(null)} className="w-8 h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-white/80 transition-all">
                <X size={14} />
              </button>
            </div>
            {orderDetailLoading && !viewingOrder ? (
              <div className="p-12 text-center text-white/25 text-[13px]">Loading order details...</div>
            ) : viewingOrder && (
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-white/25 tracking-[0.15em] mb-1">STATUS</p>
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide ${STATUS_COLORS[viewingOrder.status] || ""}`}>{viewingOrder.status}</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/25 tracking-[0.15em] mb-1">TOTAL</p>
                    <p className="text-[15px] text-white font-medium">${viewingOrder.total.toLocaleString()}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-white/25 tracking-[0.15em] mb-1">CUSTOMER</p>
                  <p className="text-[13px] text-white/80">{viewingOrder.user_name || viewingOrder.shipping_name || "—"}</p>
                  <p className="text-[11px] text-white/30">{viewingOrder.user_email || viewingOrder.email}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/25 tracking-[0.15em] mb-1">SHIPPING ADDRESS</p>
                  <p className="text-[13px] text-white/60">{viewingOrder.shipping_name || "—"}</p>
                  <p className="text-[12px] text-white/40">{viewingOrder.shipping_address || "—"}</p>
                  <p className="text-[12px] text-white/40">{[viewingOrder.shipping_city, viewingOrder.shipping_zip].filter(Boolean).join(", ")}</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] text-white/25 tracking-[0.15em] mb-1">SHIPPING METHOD</p>
                    <p className="text-[13px] text-white/60 capitalize">{viewingOrder.shipping_carrier || "Standard"} — {viewingOrder.shipping_method?.replace(/_/g, " ") || "free standard"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/25 tracking-[0.15em] mb-1">PAYMENT</p>
                    <p className="text-[13px] text-white/60 capitalize">{viewingOrder.payment_method === "stripe" ? "Stripe (Card)" : viewingOrder.payment_method || "card"}</p>
                    {viewingOrder.stripe_payment_id && (
                      <p className="text-[11px] text-white/30 font-mono mt-0.5">{viewingOrder.stripe_payment_id}</p>
                    )}
                  </div>
                  {viewingOrder.shipping_tracking_number && (
                    <div>
                      <p className="text-[10px] text-white/25 tracking-[0.15em] mb-1">TRACKING</p>
                      <p className="text-[13px] text-white/60 font-mono">{viewingOrder.shipping_tracking_number}</p>
                      {viewingOrder.shipping_status && <p className="text-[10px] text-emerald-400/60 mt-1 capitalize">{viewingOrder.shipping_status.replace(/_/g, " ")}</p>}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-white/25 tracking-[0.15em] mb-2">ITEMS</p>
                  <div className="space-y-2">
                    {viewingOrder.items?.map((item, i) => (
                      <div key={i} className="flex items-center justify-between bg-white/[0.03] rounded-xl px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.product_image && <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/[0.04] flex-shrink-0"><img src={item.product_image} alt="" className="w-full h-full object-cover" /></div>}
                          <div>
                            <p className="text-[13px] text-white/70">{item.product_name}</p>
                            <p className="text-[11px] text-white/30">Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <p className="text-[13px] text-white/60">${(item.price * item.quantity).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-2 text-[11px] text-white/25">
                  Placed on {new Date(viewingOrder.created_at).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Category Form Modal */}
      {showCategoryForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCategoryForm(false)} />
          <div className="relative w-full max-w-md bg-[#0d0d0d] border border-white/[0.08] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <h3 className="text-[15px] font-medium text-white">{editingCategory ? "Edit Category" : "Add Category"}</h3>
              <button onClick={() => setShowCategoryForm(false)} className="w-8 h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-white/80 transition-all"><X size={14} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Name</label>
                <input type="text" value={catForm.name} onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))} className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors" placeholder="Category name" />
              </div>
              <div>
                <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Icon (lucide-react name)</label>
                <input type="text" value={catForm.icon} onChange={(e) => setCatForm((f) => ({ ...f, icon: e.target.value }))} className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors" placeholder="e.g. Laptop, Headphones" />
              </div>
              <div>
                <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Color (tailwind gradient)</label>
                <input type="text" value={catForm.color} onChange={(e) => setCatForm((f) => ({ ...f, color: e.target.value }))} className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors" placeholder="e.g. from-blue-500/10" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.06]">
              <button onClick={() => setShowCategoryForm(false)} className="px-5 py-2.5 text-[13px] text-white/50 hover:text-white/80 rounded-full border border-white/[0.08] transition-all">Cancel</button>
              <button onClick={handleSaveCategory} disabled={!catForm.name || !catForm.icon} className="px-6 py-2.5 bg-white text-black text-[13px] font-medium rounded-full hover:bg-white/90 transition-colors disabled:opacity-40">{editingCategory ? "Update" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Coupon Form Modal */}
      {showCouponForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCouponForm(false)} />
          <div className="relative w-full max-w-md bg-[#0d0d0d] border border-white/[0.08] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <h3 className="text-[15px] font-medium text-white">Add Coupon</h3>
              <button onClick={() => setShowCouponForm(false)} className="w-8 h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-white/80 transition-all"><X size={14} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Code</label>
                <input type="text" value={couponForm.code} onChange={(e) => setCouponForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors uppercase font-mono" placeholder="e.g. SUMMER20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Type</label>
                  <select value={couponForm.discount_type} onChange={(e) => setCouponForm((f) => ({ ...f, discount_type: e.target.value }))} className="w-full appearance-none bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors cursor-pointer">
                    <option value="percent" className="bg-[#0d0d0d]">Percent (%)</option>
                    <option value="fixed" className="bg-[#0d0d0d]">Fixed ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Value</label>
                  <input type="number" value={couponForm.discount_value} onChange={(e) => setCouponForm((f) => ({ ...f, discount_value: e.target.value }))} className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors" placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Min Order ($)</label>
                  <input type="number" value={couponForm.min_order} onChange={(e) => setCouponForm((f) => ({ ...f, min_order: e.target.value }))} className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors" placeholder="0" />
                </div>
                <div>
                  <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Max Uses (0=unlimited)</label>
                  <input type="number" value={couponForm.max_uses} onChange={(e) => setCouponForm((f) => ({ ...f, max_uses: e.target.value }))} className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors" placeholder="0" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.06]">
              <button onClick={() => setShowCouponForm(false)} className="px-5 py-2.5 text-[13px] text-white/50 hover:text-white/80 rounded-full border border-white/[0.08] transition-all">Cancel</button>
              <button onClick={handleSaveCoupon} disabled={!couponForm.code || !couponForm.discount_value} className="px-6 py-2.5 bg-white text-black text-[13px] font-medium rounded-full hover:bg-white/90 transition-colors disabled:opacity-40">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Testimonial Form Modal */}
      {showTestimonialForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowTestimonialForm(false)} />
          <div className="relative w-full max-w-lg bg-[#0d0d0d] border border-white/[0.08] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <h3 className="text-[15px] font-medium text-white">{editingTestimonial ? "Edit Testimonial" : "Add Testimonial"}</h3>
              <button onClick={() => setShowTestimonialForm(false)} className="w-8 h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-white/80 transition-all"><X size={14} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Name *</label>
                <input type="text" value={testimonialForm.name} onChange={(e) => setTestimonialForm((f) => ({ ...f, name: e.target.value }))} className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors" placeholder="Customer name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Role / Title</label>
                  <input type="text" value={testimonialForm.role} onChange={(e) => setTestimonialForm((f) => ({ ...f, role: e.target.value }))} className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors" placeholder="e.g. Creative Director" />
                </div>
                <div>
                  <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Rating</label>
                  <select value={testimonialForm.rating} onChange={(e) => setTestimonialForm((f) => ({ ...f, rating: e.target.value }))} className="w-full appearance-none bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors cursor-pointer">
                    <option value="5" className="bg-[#0d0d0d]">5 Stars</option>
                    <option value="4" className="bg-[#0d0d0d]">4 Stars</option>
                    <option value="3" className="bg-[#0d0d0d]">3 Stars</option>
                    <option value="2" className="bg-[#0d0d0d]">2 Stars</option>
                    <option value="1" className="bg-[#0d0d0d]">1 Star</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Quote / Review *</label>
                <textarea value={testimonialForm.quote} onChange={(e) => setTestimonialForm((f) => ({ ...f, quote: e.target.value }))} className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors resize-none h-24" placeholder="What the customer said..." />
              </div>
              <div>
                <label className="block text-[11px] text-white/30 tracking-wide mb-1.5">Avatar URL (optional)</label>
                <input type="text" value={testimonialForm.avatar} onChange={(e) => setTestimonialForm((f) => ({ ...f, avatar: e.target.value }))} className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors" placeholder="https://..." />
                {testimonialForm.avatar && (
                  <div className="mt-2 flex items-center gap-3">
                    <img src={testimonialForm.avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-white/[0.1]" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    <span className="text-[11px] text-white/25">Preview</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setTestimonialForm((f) => ({ ...f, is_active: !f.is_active }))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${testimonialForm.is_active ? "bg-emerald-500" : "bg-white/15"}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${testimonialForm.is_active ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
                <span className="text-[13px] text-white/50">{testimonialForm.is_active ? "Visible on homepage" : "Hidden from homepage"}</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.06]">
              <button onClick={() => setShowTestimonialForm(false)} className="px-5 py-2.5 text-[13px] text-white/50 hover:text-white/80 rounded-full border border-white/[0.08] transition-all">Cancel</button>
              <button onClick={handleSaveTestimonial} disabled={!testimonialForm.name || !testimonialForm.quote} className="px-6 py-2.5 bg-white text-black text-[13px] font-medium rounded-full hover:bg-white/90 transition-colors disabled:opacity-40">{editingTestimonial ? "Update" : "Create"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
