import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../context/AuthContext";
import { StripeProvider } from "../components/StripeProvider";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { CreditCard, Smartphone, Lock, Shield, Truck, Package, Loader2 } from "lucide-react";
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

interface ShippingRate {
  id: string;
  carrier: string;
  name: string;
  price: number;
  estimatedDays: string;
  tracking: boolean;
  insurance: boolean;
}

const CARRIER_COLORS: Record<string, string> = {
  USPS: "text-blue-400",
  UPS: "text-amber-500",
  FedEx: "text-purple-400",
  DHL: "text-[#FFCC00]",
  "DHL Express": "text-[#FFCC00]",
  Standard: "text-white/50",
};

function CheckoutForm({
  items,
  shippingRates,
  discount,
  discountLabel,
  couponCode,
  token,
  clientSecret,
  paymentIntentId,
}: {
  items: CartItem[];
  shippingRates: ShippingRate[];
  discount: number;
  discountLabel: string;
  couponCode: string;
  token: string;
  clientSecret: string;
  paymentIntentId: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [selectedShipping, setSelectedShipping] = useState("free_standard");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const shippingCost = shippingRates.find((r) => r.id === selectedShipping)?.price || 0;
  const finalTotal = Math.max(0, subtotal - discount + shippingCost);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (paymentMethod === "card") {
      if (!stripe || !elements) {
        setError("Stripe is not loaded. Please try again.");
        return;
      }
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        setError("Card details are required.");
        return;
      }

      setPlacing(true);
      try {
        const confirmResult = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: { name },
          },
        });

        if (confirmResult.error) {
          throw new Error(confirmResult.error.message);
        }

        if (confirmResult.paymentIntent?.status === "succeeded") {
          const checkoutRes = await fetch(`${API_BASE}/api/cart/checkout`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              shipping_name: name,
              shipping_address: address,
              shipping_city: city,
              shipping_zip: zip,
              payment_method: "stripe",
              coupon_code: couponCode || undefined,
              shipping_method: selectedShipping,
              shipping_cost: shippingCost,
              stripe_payment_id: paymentIntentId,
            }),
          });
          if (!checkoutRes.ok) {
            const errData = await checkoutRes.json();
            throw new Error(errData.error || "Order creation failed");
          }
          navigate("/dashboard?tab=orders");
        }
      } catch (err: any) {
        setError(err.message || "Payment failed. Please try again.");
      } finally {
        setPlacing(false);
      }
    } else {
      setPlacing(true);
      try {
        const res = await fetch(`${API_BASE}/api/cart/checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            shipping_name: name,
            shipping_address: address,
            shipping_city: city,
            shipping_zip: zip,
            payment_method: paymentMethod,
            coupon_code: couponCode || undefined,
            shipping_method: selectedShipping,
            shipping_cost: shippingCost,
          }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Checkout failed");
        }
        navigate("/dashboard?tab=orders");
      } catch (err: any) {
        setError(err.message || "Something went wrong.");
      } finally {
        setPlacing(false);
      }
    }
  };

  return (
    <form onSubmit={handlePlaceOrder} className="space-y-8">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Shipping Info */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-7">
        <h2 className="font-display text-lg text-white mb-6">Shipping Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] text-white/30 tracking-wide mb-2">Full Name</label>
            <input type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/[0.08] text-white placeholder:text-white/20 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/20 transition-colors" required />
          </div>
          <div>
            <label className="block text-[11px] text-white/30 tracking-wide mb-2">Street Address</label>
            <input type="text" placeholder="123 Fifth Avenue, New York, NY" value={address} onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/[0.08] text-white placeholder:text-white/20 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/20 transition-colors" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-white/30 tracking-wide mb-2">City</label>
              <input type="text" placeholder="New York" value={city} onChange={(e) => setCity(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/[0.08] text-white placeholder:text-white/20 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/20 transition-colors" required />
            </div>
            <div>
              <label className="block text-[11px] text-white/30 tracking-wide mb-2">ZIP Code</label>
              <input type="text" placeholder="10001" value={zip} onChange={(e) => setZip(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/[0.08] text-white placeholder:text-white/20 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/20 transition-colors" required />
            </div>
          </div>
        </div>
      </div>

      {/* Shipping Method */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-7">
        <h2 className="font-display text-lg text-white mb-6">Shipping Method</h2>
        <div className="space-y-3">
          {shippingRates.map((rate) => (
            <label
              key={rate.id}
              className={`flex items-center justify-between px-5 py-4 rounded-xl border cursor-pointer transition-all ${
                selectedShipping === rate.id
                  ? "border-white/20 bg-white/[0.04]"
                  : "border-white/[0.07] bg-transparent hover:border-white/[0.12]"
              }`}
            >
              <div className="flex items-center gap-4">
                <input
                  type="radio"
                  name="shipping"
                  value={rate.id}
                  checked={selectedShipping === rate.id}
                  onChange={(e) => setSelectedShipping(e.target.value)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${selectedShipping === rate.id ? "border-white" : "border-white/20"}`}>
                  {selectedShipping === rate.id && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div className="flex items-center gap-2.5">
                  <Truck size={16} className={CARRIER_COLORS[rate.carrier] || "text-white/40"} />
                  <div>
                    <p className="text-[13px] text-white/80 font-medium">{rate.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-white/30">{rate.estimatedDays}</span>
                      {rate.tracking && <span className="text-[10px] text-emerald-400/60">Tracking</span>}
                      {rate.insurance && <span className="text-[10px] text-blue-400/60">Insured</span>}
                    </div>
                  </div>
                </div>
              </div>
              <span className={`text-[14px] font-medium ${rate.price === 0 ? "text-emerald-400" : "text-white/70"}`}>
                {rate.price === 0 ? "Free" : `$${rate.price.toFixed(2)}`}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Payment */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-7">
        <h2 className="font-display text-lg text-white mb-6">Payment Method</h2>
        <div className="space-y-3 mb-6">
          {[
            { id: "card", label: "Credit / Debit Card (Stripe)", icon: CreditCard },
            { id: "apple_pay", label: "Apple Pay", icon: Smartphone },
            { id: "google_pay", label: "Google Pay", icon: Smartphone },
          ].map((method) => (
            <label
              key={method.id}
              className={`flex items-center gap-4 px-5 py-4 rounded-xl border cursor-pointer transition-all ${
                paymentMethod === method.id
                  ? "border-white/20 bg-white/[0.04]"
                  : "border-white/[0.07] bg-transparent hover:border-white/[0.12]"
              }`}
            >
              <input
                type="radio"
                name="payment"
                value={method.id}
                checked={paymentMethod === method.id}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${paymentMethod === method.id ? "border-white" : "border-white/20"}`}>
                {paymentMethod === method.id && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <method.icon size={18} className="text-white/40" />
              <span className="text-[13px] text-white/80">{method.label}</span>
            </label>
          ))}
        </div>

        {paymentMethod === "card" && (
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 mb-4">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: "14px",
                    color: "rgba(255,255,255,0.8)",
                    "::placeholder": { color: "rgba(255,255,255,0.2)" },
                    backgroundColor: "transparent",
                  },
                  invalid: { color: "#ef4444" },
                },
              }}
            />
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Lock size={12} className="text-white/25" />
          <span className="text-[11px] text-white/25">Payments processed securely by Stripe. Card details never touch our servers.</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={placing || items.length === 0 || !name.trim() || !address.trim()}
        className="w-full bg-white text-black text-[13px] font-medium tracking-wide rounded-full py-3.5 flex items-center justify-center gap-2 hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {placing ? (
          <><Loader2 size={15} className="animate-spin" /> Processing...</>
        ) : (
          `Place Order — $${finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
        )}
      </button>
      <p className="text-center text-white/30 text-[12px]">
        By placing this order you agree to our terms and conditions.
      </p>
    </form>
  );
}

export default function Checkout() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [clientSecret, setClientSecret] = useState("");
  const [paymentIntentId, setPaymentIntentId] = useState("");

  const couponCode = searchParams.get("coupon") || "";
  const [discount, setDiscount] = useState(0);
  const [discountLabel, setDiscountLabel] = useState("");

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    Promise.all([
      fetch(`${API_BASE}/api/cart`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`${API_BASE}/api/shipping/rates`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(async ([cartData, ratesData]) => {
        const list = Array.isArray(cartData) ? cartData : cartData.items || [];
        setItems(list);
        setShippingRates(Array.isArray(ratesData) ? ratesData : []);
        if (list.length === 0) { navigate("/cart"); return; }

        let disc = 0;
        if (couponCode && list.length > 0) {
          const sub = list.reduce((s: number, i: CartItem) => s + i.price * i.quantity, 0);
          try {
            const r = await fetch(`${API_BASE}/api/coupons/validate`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ code: couponCode, subtotal: sub }),
            });
            if (r.ok) {
              const data = await r.json();
              disc = data.discount_amount;
              setDiscount(disc);
              setDiscountLabel(data.discount_type === "percent" ? `${data.discount_value}% off` : `$${data.discount_value} off`);
            }
          } catch {}
        }

        const sub = list.reduce((s: number, i: CartItem) => s + i.price * i.quantity, 0);
        const amount = Math.max(0.5, sub - disc);
        try {
          const intentRes = await fetch(`${API_BASE}/api/payments/create-intent`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ amount, order_metadata: { coupon: couponCode } }),
          });
          if (intentRes.ok) {
            const data = await intentRes.json();
            setClientSecret(data.clientSecret);
            setPaymentIntentId(data.paymentIntentId);
          }
        } catch {}
      })
      .catch(() => { setItems([]); navigate("/cart"); })
      .finally(() => setLoading(false));
  }, [token]);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-6 h-6 border border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808]">
      <div className="max-w-7xl mx-auto px-6 pt-28 pb-20">
        <div className="mb-12">
          <p className="text-[10px] tracking-[0.35em] text-white/25 mb-3">SECURE CHECKOUT</p>
          <h1 className="font-display text-4xl text-white font-normal">Checkout</h1>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-10 xl:gap-14">
          {clientSecret ? (
            <StripeProvider clientSecret={clientSecret}>
              <CheckoutForm
                items={items}
                shippingRates={shippingRates}
                discount={discount}
                discountLabel={discountLabel}
                couponCode={couponCode}
                token={token!}
                clientSecret={clientSecret}
                paymentIntentId={paymentIntentId}
              />
            </StripeProvider>
          ) : (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-12 text-center">
              <p className="text-white/30 text-[13px]">Payment system is initializing. Please wait...</p>
            </div>
          )}

          {/* Order Summary */}
          <div>
            <div className="sticky top-28 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-7">
              <h2 className="font-display text-lg text-white mb-6">Order Summary</h2>
              <div className="space-y-4 mb-6 max-h-[320px] overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="flex-none w-14 h-14 rounded-lg overflow-hidden bg-[#141414] border border-white/[0.05]">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-white/80 truncate">{item.name}</p>
                      <p className="text-[11px] text-white/25">Qty: {item.quantity}</p>
                    </div>
                    <span className="text-[13px] text-white/60 flex-none">
                      ${(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              <div className="space-y-3 border-t border-white/[0.06] pt-5">
                <div className="flex justify-between text-[13px]">
                  <span className="text-white/45">Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
                  <span className="text-white/80">${subtotal.toLocaleString()}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-[13px]">
                    <span className="text-white/45">Discount ({discountLabel})</span>
                    <span className="text-emerald-400">-${discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[13px]">
                  <span className="text-white/45">Shipping</span>
                  <span className="text-white/60">See options above</span>
                </div>
                <div className="border-t border-white/[0.06] pt-3 flex justify-between">
                  <span className="text-[13px] text-white/60">Subtotal</span>
                  <span className="font-display text-xl text-white">${subtotal.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mt-6 pt-5 border-t border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Truck size={13} className="text-white/25" />
                  <span className="text-[11px] text-white/30">USPS, UPS, FedEx, DHL & more</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield size={13} className="text-white/25" />
                  <span className="text-[11px] text-white/30">Stripe Secure</span>
                </div>
                <div className="flex items-center gap-2">
                  <Package size={13} className="text-white/25" />
                  <span className="text-[11px] text-white/30">2-year warranty</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
