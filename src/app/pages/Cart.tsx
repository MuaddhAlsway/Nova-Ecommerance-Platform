import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Shield, Truck } from "lucide-react";
import { API_BASE } from "../config";

interface CartItem {
  id: number;
  product_id: number;
  name: string;
  subtitle: string;
  price: number;
  image: string;
  quantity: number;
}

export default function Cart() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState("");
  const [discountValue, setDiscountValue] = useState(0);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetch(`${API_BASE}/api/cart`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : data.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [token]);

  const updateQuantity = async (id: number, newQty: number) => {
    if (newQty < 1) return;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: newQty } : i)));
    try {
      await fetch(`${API_BASE}/api/cart/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ quantity: newQty }),
      });
    } catch {}
  };

  const removeItem = async (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await fetch(`${API_BASE}/api/cart/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}
  };

  const removeCoupon = () => {
    setCouponCode("");
    setDiscount(0);
    setDiscountType("");
    setDiscountValue(0);
    setCouponSuccess("");
    setCouponError("");
  };

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const shipping = subtotal > 200 ? 0 : 15;
  const finalTotal = Math.max(0, subtotal - discount + shipping);

  const validateCoupon = async () => {
    if (!couponCode.trim() || !token) return;
    setApplyingCoupon(true);
    setCouponError("");
    setCouponSuccess("");
    try {
      const res = await fetch(`${API_BASE}/api/coupons/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: couponCode.trim(), subtotal: subtotal }),
      });
      if (!res.ok) {
        const err = await res.json();
        setCouponError(err.error || "Invalid coupon");
        setDiscount(0);
        return;
      }
      const data = await res.json();
      setDiscount(data.discount_amount);
      setDiscountType(data.discount_type);
      setDiscountValue(data.discount_value);
      setCouponSuccess(`Coupon applied! ${data.discount_type === "percent" ? `${data.discount_value}% off` : `$${data.discount_value} off`}`);
      setCouponError("");
    } catch {
      setCouponError("Failed to validate coupon");
    }
    setApplyingCoupon(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-6 h-6 border border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border border-white/[0.07] bg-white/[0.02] flex items-center justify-center mx-auto mb-6">
            <ShoppingBag size={24} className="text-white/20" />
          </div>
          <h1 className="font-display text-3xl text-white mb-2">Your Cart is Empty</h1>
          <p className="text-white/40 text-sm mb-8">Looks like you haven't added anything yet.</p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 bg-white text-black text-[13px] font-medium tracking-wide rounded-full px-8 py-3 hover:bg-white/90 transition-all"
          >
            Browse Products
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808]">
      <div className="max-w-7xl mx-auto px-6 pt-28 pb-20">
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="text-[10px] tracking-[0.35em] text-white/25 mb-3">YOUR SELECTIONS</p>
            <h1 className="font-display text-4xl text-white font-normal">Shopping Cart</h1>
          </div>
          <Link
            to="/products"
            className="text-[13px] text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5"
          >
            <ArrowRight size={13} className="rotate-180" />
            Continue Shopping
          </Link>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-10 xl:gap-14">
          {/* Cart Items */}
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex gap-5 p-5 rounded-2xl border border-white/[0.07] bg-white/[0.02]"
              >
                <Link
                  to={`/product/${item.product_id}`}
                  className="flex-none w-28 h-28 rounded-xl overflow-hidden bg-[#141414] border border-white/[0.05]"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </Link>

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <Link
                      to={`/product/${item.product_id}`}
                      className="text-[15px] text-white font-medium hover:text-white/80 transition-colors"
                    >
                      {item.name}
                    </Link>
                    {item.subtitle && (
                      <p className="text-[12px] text-white/30 mt-0.5">{item.subtitle}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border border-white/[0.1] rounded-full">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="w-9 h-9 flex items-center justify-center text-white/40 hover:text-white transition-colors disabled:opacity-30"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-9 text-center text-[13px] text-white font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-9 h-9 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-[15px] text-white font-medium">
                        ${(item.price * item.quantity).toLocaleString()}
                      </span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="w-9 h-9 rounded-full border border-white/[0.07] flex items-center justify-center text-white/30 hover:text-rose-400 hover:border-rose-400/30 transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div>
            <div className="sticky top-28 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-7">
              <h2 className="font-display text-xl text-white mb-7">Order Summary</h2>

              <div className="space-y-4 mb-7">
                <div className="flex justify-between text-[13px]">
                  <span className="text-white/45">Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
                  <span className="text-white/80">${subtotal.toLocaleString()}</span>
                </div>
                <div className="mb-4">
                  {couponSuccess ? (
                    <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5">
                      <div>
                        <p className="text-[13px] text-emerald-400 font-medium">{couponSuccess}</p>
                        <p className="text-[11px] text-emerald-400/60">Code: {couponCode.toUpperCase()}</p>
                      </div>
                      <button onClick={removeCoupon} className="text-[11px] text-emerald-400/60 hover:text-emerald-400 transition-colors">Remove</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Coupon code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => { if (e.key === "Enter") validateCoupon(); }}
                        className="flex-1 bg-white/[0.05] border border-white/[0.08] text-white placeholder:text-white/20 rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors uppercase"
                      />
                      <button
                        onClick={validateCoupon}
                        disabled={applyingCoupon || !couponCode.trim()}
                        className="px-4 py-2.5 bg-white/[0.08] border border-white/[0.1] text-white/70 text-[13px] rounded-xl hover:bg-white/[0.12] transition-colors disabled:opacity-40"
                      >
                        {applyingCoupon ? "..." : "Apply"}
                      </button>
                    </div>
                  )}
                  {couponError && <p className="text-[11px] text-red-400 mt-1.5">{couponError}</p>}
                </div>
                {discount > 0 && (
                  <div className="flex items-center justify-between py-3">
                    <span className="text-[13px] text-white/40">Discount</span>
                    <span className="text-[13px] text-emerald-400">-${discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[13px]">
                  <span className="text-white/45">Shipping</span>
                  <span className={shipping === 0 ? "text-emerald-400" : "text-white/80"}>
                    {shipping === 0 ? "Free" : `$${shipping}`}
                  </span>
                </div>
                <div className="border-t border-white/[0.06] pt-4 flex justify-between">
                  <span className="text-[13px] text-white/60">Total</span>
                  <span className="font-display text-xl text-white">${finalTotal.toLocaleString()}</span>
                </div>
              </div>

              <Link
                to={discount > 0 ? `/checkout?coupon=${couponCode}` : "/checkout"}
                className="w-full bg-white text-black text-[13px] font-medium tracking-wide rounded-full py-3.5 flex items-center justify-center gap-2 hover:bg-white/90 transition-all"
              >
                Proceed to Checkout
                <ArrowRight size={14} />
              </Link>

              <div className="flex flex-wrap gap-4 mt-6 pt-5 border-t border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Truck size={13} className="text-white/25" />
                  <span className="text-[11px] text-white/30">Free shipping over $200</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield size={13} className="text-white/25" />
                  <span className="text-[11px] text-white/30">Secure checkout</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
