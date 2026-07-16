import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import {
  Laptop,
  Watch,
  Smartphone,
  Headphones,
  Gamepad2,
  Package,
  Shield,
  Truck,
  Award,
  CreditCard,
  ArrowRight,
  Star,
  Clock,
  Sparkles,
  ChevronRight,
  Send,
  Check,
} from "lucide-react";
import { API_BASE } from "../config";

const categories = [
  { name: "Laptops", icon: Laptop, count: 42 },
  { name: "Watches", icon: Watch, count: 28 },
  { name: "Smartphones", icon: Smartphone, count: 35 },
  { name: "Audio", icon: Headphones, count: 31 },
  { name: "Gaming", icon: Gamepad2, count: 19 },
  { name: "Accessories", icon: Package, count: 56 },
];

const features = [
  {
    icon: Shield,
    title: "2-Year Warranty",
    description: "Every product backed by our comprehensive guarantee",
  },
  {
    icon: Truck,
    title: "Free Shipping",
    description: "Complimentary express delivery on orders over $500",
  },
  {
    icon: Award,
    title: "Certified Quality",
    description: "Only authentic products from authorized retailers",
  },
  {
    icon: CreditCard,
    title: "Secure Payment",
    description: "256-bit encryption for worry-free transactions",
  },
];

function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(targetDate));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function calculateTimeLeft(target: Date) {
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  }

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [targetDate]);

  return timeLeft;
}

export default function Home() {
  const [bestSellers, setBestSellers] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "loading" | "success">("idle");

  const dealEnd = useRef(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000));
  const countdown = useCountdown(dealEnd.current);

  useEffect(() => {
    fetch(`${API_BASE}/api/products?best_sellers=true`)
      .then((res) => res.json())
      .then((data) => setBestSellers(Array.isArray(data) ? data : data.products || []))
      .catch(() => {});
    fetch(`${API_BASE}/api/testimonials`)
      .then((res) => res.json())
      .then(setTestimonials)
      .catch(() => {});
  }, []);

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setNewsletterStatus("loading");
    try {
      await fetch(`${API_BASE}/api/newsletter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setNewsletterStatus("success");
      setEmail("");
    } catch {
      setNewsletterStatus("idle");
    }
  };

  return (
    <div className="bg-[#080808] min-h-screen text-white">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-white/[0.015] rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-32 grid lg:grid-cols-2 gap-16 items-center w-full">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block rounded-full text-[9px] tracking-[0.15em] uppercase text-white/45 border border-white/[0.07] px-4 py-2 mb-8">
                Premium Technology
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="font-display text-5xl md:text-7xl lg:text-[5.5rem] font-light tracking-wide leading-[0.95] mb-8"
            >
              Elevate Your
              <br />
              <span className="text-white/45">Digital Life</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="text-white/45 text-lg max-w-md mb-12 leading-relaxed"
            >
              Curated collection of premium technology, designed for those who
              demand excellence in every detail.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="flex items-center gap-6"
            >
              <Link
                to="/products"
                className="group rounded-full bg-white text-[#080808] text-[13px] tracking-wide px-8 py-4 inline-flex items-center gap-3 hover:bg-white/90 transition-colors"
              >
                Shop Collection
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/products"
                className="rounded-full border border-white/[0.07] text-[13px] tracking-wide px-8 py-4 text-white/55 hover:text-white hover:border-white/[0.15] transition-all"
              >
                View All
              </Link>
            </motion.div>
          </div>

          <div className="relative hidden lg:flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="w-[420px] h-[420px] rounded-full border border-white/[0.07] flex items-center justify-center relative">
                <div className="w-[320px] h-[320px] rounded-full border border-white/[0.05] flex items-center justify-center">
                  <div className="w-[200px] h-[200px] rounded-full bg-white/[0.03] flex items-center justify-center">
                    <Sparkles className="w-16 h-16 text-white/20" />
                  </div>
                </div>
                <motion.div
                  animate={{ y: [-8, 8, -8] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-8 right-12 bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-4"
                >
                  <Laptop className="w-8 h-8 text-white/55" />
                </motion.div>
                <motion.div
                  animate={{ y: [6, -6, 6] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute bottom-12 left-8 bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-4"
                >
                  <Headphones className="w-8 h-8 text-white/55" />
                </motion.div>
                <motion.div
                  animate={{ y: [-5, 5, -5] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute bottom-8 right-16 bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-4"
                >
                  <Watch className="w-8 h-8 text-white/55" />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 border-t border-white/[0.07]">
          <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "10K+", label: "Products" },
              { value: "50K+", label: "Customers" },
              { value: "99%", label: "Satisfaction" },
              { value: "24/7", label: "Support" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                className="text-center"
              >
                <div className="font-display text-3xl md:text-4xl font-light tracking-wide mb-1">
                  {stat.value}
                </div>
                <div className="text-white/45 text-[11px] tracking-[0.15em] uppercase">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-32 border-t border-white/[0.07]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-16">
            <div>
              <span className="rounded-full text-[9px] tracking-[0.15em] uppercase text-white/45 border border-white/[0.07] px-4 py-2 mb-6 inline-block">
                Browse
              </span>
              <h2 className="font-display text-4xl md:text-5xl font-light tracking-wide">
                Categories
              </h2>
            </div>
            <Link
              to="/products"
              className="text-[13px] text-white/45 hover:text-white transition-colors inline-flex items-center gap-2"
            >
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
              >
                <Link
                  to={`/products?category=${cat.name}`}
                  className="group block bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-6 text-center hover:border-white/[0.15] hover:bg-[#111] transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-full border border-white/[0.07] flex items-center justify-center mx-auto mb-4 group-hover:border-white/[0.15] transition-colors">
                    <cat.icon className="w-5 h-5 text-white/45 group-hover:text-white/75 transition-colors" />
                  </div>
                  <div className="text-[13px] tracking-wide mb-1">{cat.name}</div>
                  <div className="text-[11px] text-white/25">{cat.count} items</div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Best Sellers */}
      <section className="py-32 border-t border-white/[0.07]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-16">
            <div>
              <span className="rounded-full text-[9px] tracking-[0.15em] uppercase text-white/45 border border-white/[0.07] px-4 py-2 mb-6 inline-block">
                Popular
              </span>
              <h2 className="font-display text-4xl md:text-5xl font-light tracking-wide">
                Best Sellers
              </h2>
            </div>
            <Link
              to="/products"
              className="text-[13px] text-white/45 hover:text-white transition-colors inline-flex items-center gap-2"
            >
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {bestSellers.map((product: any, i: number) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Link
                  to={`/product/${product.id}`}
                  className="group block bg-[#0d0d0d] border border-white/[0.07] rounded-2xl overflow-hidden hover:border-white/[0.15] transition-all duration-300"
                >
                  <div className="aspect-square bg-[#111] flex items-center justify-center p-8 relative overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                    />
                    {product.badge && (
                      <span className="absolute top-4 left-4 rounded-full bg-white text-[#080808] text-[9px] tracking-[0.15em] uppercase px-3 py-1.5 font-medium">
                        {product.badge}
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="text-[11px] text-white/25 tracking-[0.15em] uppercase mb-2">
                      {product.category}
                    </div>
                    <div className="text-[13px] tracking-wide mb-3 line-clamp-1">
                      {product.name}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-[15px] tracking-wide">${product.price}</div>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-white/45 text-white/45" />
                        <span className="text-[11px] text-white/45">{product.rating}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why NOVA */}
      <section className="py-32 border-t border-white/[0.07]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="rounded-full text-[9px] tracking-[0.15em] uppercase text-white/45 border border-white/[0.07] px-4 py-2 mb-6 inline-block">
              Our Promise
            </span>
            <h2 className="font-display text-4xl md:text-5xl font-light tracking-wide">
              Why NOVA
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-8 text-center hover:border-white/[0.15] transition-colors duration-300"
              >
                <div className="w-14 h-14 rounded-full border border-white/[0.07] flex items-center justify-center mx-auto mb-6">
                  <feat.icon className="w-6 h-6 text-white/45" />
                </div>
                <div className="text-[15px] tracking-wide mb-3">{feat.title}</div>
                <div className="text-[13px] text-white/35 leading-relaxed">{feat.description}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 border-t border-white/[0.07] overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="rounded-full text-[9px] tracking-[0.15em] uppercase text-white/45 border border-white/[0.07] px-4 py-2 mb-6 inline-block">
              Reviews
            </span>
            <h2 className="font-display text-4xl md:text-5xl font-light tracking-wide">
              What People Say
            </h2>
          </div>
        </div>

        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#080808] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#080808] to-transparent z-10 pointer-events-none" />

          <div className="flex gap-4 animate-scroll">
            {[...testimonials, ...testimonials, ...testimonials].map((t: any, i: number) => (
              <div
                key={`${t.id ?? i}-${i}`}
                className="flex-shrink-0 w-[380px] bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-8 hover:border-white/[0.15] transition-colors duration-300"
              >
                <div className="flex gap-1 mb-6">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${s < t.rating ? "fill-white/55 text-white/55" : "text-white/15"}`}
                    />
                  ))}
                </div>
                <p className="text-[13px] text-white/45 leading-relaxed mb-8">{t.quote}</p>
                <div className="flex items-center gap-4">
                  {t.avatar ? (
                    <img src={t.avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-white/[0.1]" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-white/[0.05] flex items-center justify-center text-[13px] text-white/45">
                      {t.name?.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="text-[13px] tracking-wide">{t.name}</div>
                    <div className="text-[11px] text-white/25">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Deals Banner */}
      <section className="py-32 border-t border-white/[0.07]">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative bg-[#0d0d0d] border border-white/[0.07] rounded-2xl overflow-hidden"
          >
            <div className="absolute inset-0">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
            </div>
            <div className="relative grid lg:grid-cols-2 gap-12 p-12 md:p-16 items-center">
              <div>
                <span className="rounded-full text-[9px] tracking-[0.15em] uppercase text-white/45 border border-white/[0.07] px-4 py-2 mb-6 inline-block">
                  Limited Time
                </span>
                <h2 className="font-display text-4xl md:text-5xl font-light tracking-wide mb-4">
                  Season Deal
                </h2>
                <p className="text-white/45 text-[13px] leading-relaxed mb-8 max-w-md">
                  Exclusive discounts on our most coveted products. Don't miss the
                  opportunity to own premium technology at exceptional prices.
                </p>
                <Link
                  to="/products"
                  className="group rounded-full bg-white text-[#080808] text-[13px] tracking-wide px-8 py-4 inline-flex items-center gap-3 hover:bg-white/90 transition-colors"
                >
                  Shop Deals
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="flex justify-center lg:justify-end gap-4">
                {[
                  { value: countdown.days, label: "Days" },
                  { value: countdown.hours, label: "Hours" },
                  { value: countdown.minutes, label: "Min" },
                  { value: countdown.seconds, label: "Sec" },
                ].map((unit, i) => (
                  <div key={unit.label} className="text-center">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl border border-white/[0.07] bg-[#080808] flex items-center justify-center mb-3">
                      <span className="font-display text-3xl md:text-4xl font-light tracking-wide">
                        {String(unit.value).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="text-[10px] text-white/25 tracking-[0.15em] uppercase">
                      {unit.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-32 border-t border-white/[0.07]">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-xl mx-auto text-center"
          >
            <span className="rounded-full text-[9px] tracking-[0.15em] uppercase text-white/45 border border-white/[0.07] px-4 py-2 mb-6 inline-block">
              Stay Updated
            </span>
            <h2 className="font-display text-4xl md:text-5xl font-light tracking-wide mb-4">
              Join NOVA
            </h2>
            <p className="text-white/45 text-[13px] leading-relaxed mb-10">
              Subscribe for exclusive access to new arrivals, special offers, and
              insider updates.
            </p>

            <form onSubmit={handleNewsletter} className="flex gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="flex-1 bg-[#0d0d0d] border border-white/[0.07] rounded-full px-6 py-4 text-[13px] tracking-wide text-white placeholder:text-white/25 focus:outline-none focus:border-white/[0.15] transition-colors"
              />
              <button
                type="submit"
                disabled={newsletterStatus === "loading"}
                className="rounded-full bg-white text-[#080808] text-[13px] tracking-wide px-6 py-4 inline-flex items-center gap-2 hover:bg-white/90 transition-colors disabled:opacity-50"
              >
                {newsletterStatus === "success" ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {newsletterStatus === "success" ? "Joined" : "Subscribe"}
              </button>
            </form>
          </motion.div>
        </div>
      </section>
    </div>
  );
}