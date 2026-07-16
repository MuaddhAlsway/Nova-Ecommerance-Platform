import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Package, Heart, User, ChevronRight, Trash2, ExternalLink, Save } from 'lucide-react';
import { API_BASE } from '../config';

type Tab = 'orders' | 'wishlist' | 'profile';

interface OrderItem {
  product_id: string;
  name: string;
  image: string;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  created_at: string;
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  shipping_method?: string;
  shipping_carrier?: string;
  payment_method?: string;
  stripe_payment_id?: string;
  shipping_tracking_number?: string;
  shipping_status?: string;
  items: OrderItem[];
}

interface WishlistItem {
  id: number;
  product_id: number;
  name: string;
  price: number;
  image: string;
  category: string;
}

const statusStyles: Record<string, string> = {
  pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  confirmed: 'bg-green-500/15 text-green-400 border-green-500/20',
  shipped: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  delivered: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/20',
};

const tabs: { key: Tab; label: string; icon: typeof Package }[] = [
  { key: 'orders', label: 'Orders', icon: Package },
  { key: 'wishlist', label: 'Wishlist', icon: Heart },
  { key: 'profile', label: 'Profile', icon: User },
];

export default function UserDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const queryTab = new URLSearchParams(location.search).get('tab') as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(queryTab || 'orders');

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [orderDetails, setOrderDetails] = useState<Order | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfilePhone(user.phone || '');
      setProfileAddress(user.address || '');
    }
  }, [user]);

  useEffect(() => {
    if (queryTab && tabs.some(t => t.key === queryTab)) {
      setActiveTab(queryTab);
    }
  }, [queryTab]);

  useEffect(() => {
    if (activeTab === 'orders' && token) {
      fetchOrders();
    } else if (activeTab === 'wishlist' && token) {
      fetchWishlist();
    }
  }, [activeTab, token]);

  const authHeaders = () => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/orders`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || data);
      }
    } catch (e) {
      console.error('Failed to fetch orders', e);
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchOrderDetails = async (id: number) => {
    if (expandedOrder === id) {
      setExpandedOrder(null);
      setOrderDetails(null);
      return;
    }
    setExpandedOrder(id);
    setDetailsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/orders/detail/${id}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setOrderDetails(data.order || data);
      }
    } catch (e) {
      console.error('Failed to fetch order details', e);
    } finally {
      setDetailsLoading(false);
    }
  };

  const fetchWishlist = async () => {
    setWishlistLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/wishlist`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setWishlist(data.wishlist || data);
      }
    } catch (e) {
      console.error('Failed to fetch wishlist', e);
    } finally {
      setWishlistLoading(false);
    }
  };

  const removeWishlistItem = async (productId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/wishlist/${productId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        setWishlist(prev => prev.filter(item => item.product_id !== productId));
      }
    } catch (e) {
      console.error('Failed to remove from wishlist', e);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess(false);
    try {
      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          name: profileName,
          phone: profilePhone,
          address: profileAddress,
        }),
      });
      if (res.ok) {
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 3000);
      }
    } catch (e) {
      console.error('Failed to update profile', e);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    navigate(`/dashboard?tab=${tab}`, { replace: true });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-display text-3xl font-semibold mb-8">My Account</h1>

        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-64 shrink-0">
            <div className="bg-[#0d0d0d] rounded-2xl border border-white/[0.07] p-6">
              <div className="mb-6 pb-6 border-b border-white/[0.07]">
                <p className="font-display text-white/80 font-medium">{user.name}</p>
                <p className="text-sm text-white/40 mt-1">{user.email}</p>
              </div>

              <nav className="flex flex-col gap-1">
                {tabs.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => handleTabChange(key)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium transition-colors ${
                      activeTab === key
                        ? 'bg-white/[0.08] text-white'
                        : 'text-white/45 hover:text-white/70 hover:bg-white/[0.03]'
                    }`}
                  >
                    <Icon size={18} />
                    {label}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            {activeTab === 'orders' && (
              <div>
                <h2 className="font-display text-xl font-semibold mb-6">Order History</h2>

                {ordersLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="bg-[#0d0d0d] rounded-2xl border border-white/[0.07] p-12 text-center">
                    <Package size={40} className="mx-auto text-white/20 mb-4" />
                    <p className="text-white/45 text-sm">No orders yet</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {orders.map(order => (
                      <div
                        key={order.id}
                        className="bg-[#0d0d0d] rounded-2xl border border-white/[0.07] overflow-hidden"
                      >
                        <button
                          onClick={() => fetchOrderDetails(order.id)}
                          className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
                        >
                          <div className="flex items-center gap-6">
                            <div>
                              <p className="text-white/80 font-medium text-sm">
                                #{String(order.id).slice(-8).toUpperCase()}
                              </p>
                              <p className="text-white/40 text-xs mt-1">{formatDate(order.created_at)}</p>
                            </div>
                            <span
                              className={`text-[11px] font-medium px-3 py-1 rounded-full border capitalize ${
                                statusStyles[order.status] || 'bg-white/10 text-white/60 border-white/10'
                              }`}
                            >
                              {order.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-4">
                            <p className="text-white/80 font-medium text-sm">
                              ${order.total.toFixed(2)}
                            </p>
                            <ChevronRight
                              size={16}
                              className={`text-white/30 transition-transform ${
                                expandedOrder === order.id ? 'rotate-90' : ''
                              }`}
                            />
                          </div>
                        </button>

                        {expandedOrder === order.id && (
                          <div className="border-t border-white/[0.07] p-5">
                            {detailsLoading ? (
                              <div className="flex items-center justify-center py-8">
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
                              </div>
                            ) : orderDetails ? (
                              <div className="space-y-4">
                                <div className="flex flex-col gap-3">
                                  {orderDetails.items.map((item, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center gap-4 bg-white/[0.03] rounded-xl p-4"
                                    >
                                      <img
                                        src={item.image}
                                        alt={item.name}
                                        className="w-14 h-14 rounded-lg object-cover bg-white/[0.05]"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-white/80 text-sm font-medium truncate">
                                          {item.name}
                                        </p>
                                        <p className="text-white/40 text-xs mt-1">
                                          Qty: {item.quantity}
                                        </p>
                                      </div>
                                      <p className="text-white/80 text-sm font-medium">
                                        ${(item.price * item.quantity).toFixed(2)}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                                <div className="grid grid-cols-2 gap-3 pt-2">
                                  {orderDetails.shipping_carrier && (
                                    <div className="bg-white/[0.03] rounded-xl px-4 py-3">
                                      <p className="text-[10px] text-white/25 tracking-wider mb-1">SHIPPING</p>
                                      <p className="text-[12px] text-white/60 capitalize">{orderDetails.shipping_carrier} — {(orderDetails.shipping_method || "").replace(/_/g, " ")}</p>
                                    </div>
                                  )}
                                  {orderDetails.payment_method && (
                                    <div className="bg-white/[0.03] rounded-xl px-4 py-3">
                                      <p className="text-[10px] text-white/25 tracking-wider mb-1">PAYMENT</p>
                                      <p className="text-[12px] text-white/60 capitalize">{orderDetails.payment_method === "stripe" ? "Stripe (Card)" : orderDetails.payment_method}</p>
                                    </div>
                                  )}
                                  {orderDetails.shipping_tracking_number && (
                                    <div className="bg-white/[0.03] rounded-xl px-4 py-3">
                                      <p className="text-[10px] text-white/25 tracking-wider mb-1">TRACKING</p>
                                      <p className="text-[12px] text-white/60 font-mono">{orderDetails.shipping_tracking_number}</p>
                                      {orderDetails.shipping_status && <p className="text-[10px] text-emerald-400/60 mt-1 capitalize">{orderDetails.shipping_status.replace(/_/g, " ")}</p>}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <p className="text-white/40 text-sm text-center py-4">
                                Failed to load details
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'wishlist' && (
              <div>
                <h2 className="font-display text-xl font-semibold mb-6">Wishlist</h2>

                {wishlistLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
                  </div>
                ) : wishlist.length === 0 ? (
                  <div className="bg-[#0d0d0d] rounded-2xl border border-white/[0.07] p-12 text-center">
                    <Heart size={40} className="mx-auto text-white/20 mb-4" />
                    <p className="text-white/45 text-sm">Your wishlist is empty</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {wishlist.map(item => (
                      <div
                        key={item.id}
                        className="bg-[#0d0d0d] rounded-2xl border border-white/[0.07] overflow-hidden group"
                      >
                        <Link to={`/product/${item.product_id}`} className="block">
                          <div className="aspect-square bg-white/[0.03] overflow-hidden">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          </div>
                        </Link>

                        <div className="p-4">
                          <Link to={`/product/${item.product_id}`}>
                            <h3 className="text-white/80 font-medium text-sm hover:text-white transition-colors truncate">
                              {item.name}
                            </h3>
                          </Link>
                          {item.category && (
                            <p className="text-white/30 text-xs mt-1 capitalize">{item.category}</p>
                          )}
                          <div className="flex items-center justify-between mt-3">
                            <p className="text-white/80 font-medium text-sm">
                              ${item.price.toFixed(2)}
                            </p>
                            <div className="flex items-center gap-2">
                              <Link
                                to={`/product/${item.product_id}`}
                                className="p-2 rounded-full bg-white/[0.05] text-white/40 hover:text-white/80 hover:bg-white/[0.1] transition-colors"
                              >
                                <ExternalLink size={14} />
                              </Link>
                              <button
                                onClick={() => removeWishlistItem(item.product_id)}
                                className="p-2 rounded-full bg-white/[0.05] text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'profile' && (
              <div>
                <h2 className="font-display text-xl font-semibold mb-6">Profile Settings</h2>

                <div className="bg-[#0d0d0d] rounded-2xl border border-white/[0.07] p-6 sm:p-8 max-w-xl">
                  <form onSubmit={handleProfileSave} className="flex flex-col gap-5">
                    <div>
                      <label className="block text-white/45 text-xs font-medium mb-2 uppercase tracking-wider">
                        Name
                      </label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={e => setProfileName(e.target.value)}
                        className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-white/20 transition-colors"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-white/45 text-xs font-medium mb-2 uppercase tracking-wider">
                        Email
                      </label>
                      <input
                        type="email"
                        value={user.email}
                        disabled
                        className="w-full bg-white/[0.03] border border-white/[0.05] rounded-xl px-4 py-3 text-white/30 text-sm cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-white/45 text-xs font-medium mb-2 uppercase tracking-wider">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={profilePhone}
                        onChange={e => setProfilePhone(e.target.value)}
                        placeholder="Enter phone number"
                        className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-white/20 transition-colors placeholder:text-white/20"
                      />
                    </div>

                    <div>
                      <label className="block text-white/45 text-xs font-medium mb-2 uppercase tracking-wider">
                        Address
                      </label>
                      <input
                        type="text"
                        value={profileAddress}
                        onChange={e => setProfileAddress(e.target.value)}
                        placeholder="Enter address"
                        className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-white/20 transition-colors placeholder:text-white/20"
                      />
                    </div>

                    {profileSuccess && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-emerald-400 text-sm">
                        Profile updated successfully
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={profileSaving}
                      className="flex items-center justify-center gap-2 rounded-full bg-white text-[#080808] text-[13px] font-semibold px-6 py-3 hover:bg-white/90 transition-colors disabled:opacity-50 mt-2"
                    >
                      <Save size={15} />
                      {profileSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
