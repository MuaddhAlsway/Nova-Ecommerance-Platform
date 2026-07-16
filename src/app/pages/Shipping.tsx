import { Package, Truck, Globe, Shield, Clock, CheckCircle, ArrowRight, MapPin } from "lucide-react";
import { Link } from "react-router";

const carriers = [
  {
    name: "DHL Express",
    logo: "DHL",
    color: "#FFCC00",
    bg: "bg-[#FFCC00]/10",
    border: "border-[#FFCC00]/20",
    text: "text-[#FFCC00]",
    services: ["DHL Express Worldwide", "DHL Express 12:00", "DHL Express 9:00", "DHL Economy Select"],
    regions: ["Global — 220+ countries"],
    speed: "1-5 business days",
    tracking: "Real-time with SMS & email updates",
    specialty: "Best for international priority shipments with guaranteed delivery windows",
  },
  {
    name: "FedEx",
    logo: "FedEx",
    color: "#4D148C",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    text: "text-purple-400",
    services: ["FedEx International Priority", "FedEx International Economy", "FedEx Express Saver", "FedEx 2Day"],
    regions: ["Global — 220+ countries"],
    speed: "1-5 business days",
    tracking: "FedEx Tracking with Delivery Manager",
    specialty: "Industry-leading time-definite delivery with money-back guarantee",
  },
  {
    name: "UPS",
    logo: "UPS",
    color: "#351C15",
    bg: "bg-amber-700/10",
    border: "border-amber-700/20",
    text: "text-amber-500",
    services: ["UPS Worldwide Express", "UPS Worldwide Expedited", "UPS Standard", "UPS Saver"],
    regions: ["Global — 220+ countries"],
    speed: "1-5 business days",
    tracking: "UPS My Choice with predictive delivery",
    specialty: "Reliable ground and air network with extensive US coverage",
  },
  {
    name: "Shippo",
    logo: "SHIPPO",
    color: "#00A699",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    text: "text-emerald-400",
    services: ["USPS via Shippo", "UPS via Shippo", "FedEx via Shippo", "DHL via Shippo"],
    regions: ["Global — 40+ carriers via Shippo network"],
    speed: "1-7 business days",
    tracking: "Unified tracking across all carriers",
    specialty: "Multi-carrier shipping platform providing access to discounted rates from USPS, UPS, FedEx, DHL and more",
  },
  {
    name: "USPS",
    logo: "USPS",
    color: "#004B87",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    text: "text-blue-400",
    services: ["Priority Mail Express", "Priority Mail", "First-Class Package", "Priority Mail International"],
    regions: ["United States + 190 countries (International)"],
    speed: "1-3 domestic / 6-10 international",
    tracking: "USPS Informed Delivery",
    specialty: "Most affordable domestic shipping with Saturday delivery included",
  },
  {
    name: "TNT",
    logo: "TNT",
    color: "#FF6200",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    text: "text-orange-400",
    services: ["TNT Express", "TNT Economy Express", "TNT Freight"],
    regions: ["Europe, Asia-Pacific"],
    speed: "2-5 business days",
    tracking: "TNT Tracking with proactive notifications",
    specialty: "Strong European road network with door-to-door express delivery",
  },
];

const shippingTiers = [
  {
    name: "Standard",
    price: "Free over $200",
    speed: "5-7 business days",
    icon: Package,
    features: ["Order tracking", "Signature on delivery", "Insurance included", "Available for all orders"],
  },
  {
    name: "Express",
    price: "$19.99",
    speed: "2-3 business days",
    icon: Truck,
    features: ["Priority handling", "Real-time tracking", "SMS notifications", "Signature on delivery", "Full insurance"],
  },
  {
    name: "Next Day",
    price: "$34.99",
    speed: "Next business day",
    icon: Clock,
    features: ["Guaranteed delivery", "Real-time GPS tracking", "Signature required", "Full insurance", "Priority at all checkpoints"],
  },
];

const regions = [
  { region: "United States", carriers: "USPS, FedEx, UPS", standard: "3-5 days", express: "1-2 days", nextDay: "Yes" },
  { region: "Canada", carriers: "FedEx, UPS, DHL", standard: "5-7 days", express: "2-3 days", nextDay: "Yes (major cities)" },
  { region: "Europe (EU/UK)", carriers: "DHL, FedEx, UPS, TNT", standard: "5-10 days", express: "2-4 days", nextDay: "Yes (major cities)" },
  { region: "Middle East & North Africa", carriers: "DHL, FedEx, UPS via Shippo", standard: "5-10 days", express: "2-4 days", nextDay: "Select cities" },
  { region: "Asia-Pacific", carriers: "DHL, FedEx, TNT", standard: "7-14 days", express: "3-5 days", nextDay: "Select cities" },
  { region: "Latin America", carriers: "DHL, FedEx", standard: "7-14 days", express: "3-5 days", nextDay: "No" },
  { region: "Africa", carriers: "DHL, FedEx via Shippo", standard: "7-14 days", express: "3-7 days", nextDay: "No" },
];

export default function Shipping() {
  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Hero */}
      <section className="pt-32 pb-20 bg-[#050505] border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[10px] tracking-[0.35em] text-white/25 mb-3">SHIPPING & DELIVERY</p>
          <h1 className="font-display text-4xl md:text-6xl text-white font-normal mb-6 max-w-3xl">
            Delivered with Care, Anywhere in the World
          </h1>
          <p className="text-white/40 text-[16px] leading-relaxed max-w-2xl">
            We partner with the world's most trusted logistics providers to ensure your premium technology arrives safely, on time, and in perfect condition.
          </p>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-b border-white/[0.05] bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {[
              { icon: Shield, label: "Full Insurance Coverage" },
              { icon: Globe, label: "35+ Countries" },
              { icon: CheckCircle, label: "Signature on Delivery" },
              { icon: MapPin, label: "Real-Time Tracking" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2.5">
                <item.icon size={16} className="text-white/30" />
                <span className="text-[12px] text-white/40">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Shipping Tiers */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[10px] tracking-[0.35em] text-white/25 mb-3">CHOOSE YOUR SPEED</p>
          <h2 className="font-display text-3xl text-white mb-12">Shipping Options</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {shippingTiers.map((tier, i) => (
              <div
                key={tier.name}
                className={`bg-[#0d0d0d] border rounded-2xl p-8 ${i === 1 ? "border-white/20" : "border-white/[0.07]"}`}
              >
                {i === 1 && (
                  <span className="text-[9px] tracking-[0.2em] text-white/40 border border-white/15 px-2.5 py-1 rounded-full mb-4 inline-block">MOST POPULAR</span>
                )}
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
                    <tier.icon size={18} className="text-white/50" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-medium text-white">{tier.name}</h3>
                    <p className="text-[12px] text-white/30">{tier.speed}</p>
                  </div>
                </div>
                <p className="font-display text-2xl text-white mb-6">{tier.price}</p>
                <ul className="space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-[13px] text-white/40">
                      <CheckCircle size={13} className="text-emerald-400/60 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Carrier Partners */}
      <section className="py-24 bg-[#050505] border-y border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[10px] tracking-[0.35em] text-white/25 mb-3">OUR LOGISTICS PARTNERS</p>
          <h2 className="font-display text-3xl text-white mb-4">Trusted Carrier Network</h2>
          <p className="text-white/35 text-[14px] mb-12 max-w-2xl">
            We've partnered with the world's leading courier and logistics companies to offer reliable, tracked shipping to every corner of the globe.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {carriers.map((c) => (
              <div key={c.name} className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-7 hover:border-white/[0.13] transition-all">
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-12 h-12 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center`}>
                    <span className={`text-[11px] font-bold tracking-wider ${c.text}`}>{c.logo}</span>
                  </div>
                  <div>
                    <h4 className="text-[15px] font-medium text-white">{c.name}</h4>
                    <p className="text-[11px] text-white/30">{c.speed}</p>
                  </div>
                </div>
                <p className="text-[12px] text-white/35 leading-[1.6] mb-4">{c.specialty}</p>
                <div className="space-y-2 mb-4">
                  {c.services.map((s) => (
                    <span key={s} className="inline-block text-[10px] text-white/30 bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 rounded-full mr-1.5 mb-1.5">
                      {s}
                    </span>
                  ))}
                </div>
                <div className="pt-4 border-t border-white/[0.06] flex flex-col gap-1.5">
                  <p className="text-[11px] text-white/25"><span className="text-white/35">Coverage:</span> {c.regions.join(", ")}</p>
                  <p className="text-[11px] text-white/25"><span className="text-white/35">Tracking:</span> {c.tracking}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Regional Shipping */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[10px] tracking-[0.35em] text-white/25 mb-3">WORLDWIDE COVERAGE</p>
          <h2 className="font-display text-3xl text-white mb-4">Shipping by Region</h2>
          <p className="text-white/35 text-[14px] mb-12 max-w-2xl">
            Estimated delivery times and available carriers by destination. All shipments include full insurance and real-time tracking.
          </p>
          <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    <th className="px-6 py-4 text-[10px] text-white/25 tracking-[0.15em] font-medium">REGION</th>
                    <th className="px-6 py-4 text-[10px] text-white/25 tracking-[0.15em] font-medium">CARRIERS</th>
                    <th className="px-6 py-4 text-[10px] text-white/25 tracking-[0.15em] font-medium">STANDARD</th>
                    <th className="px-6 py-4 text-[10px] text-white/25 tracking-[0.15em] font-medium">EXPRESS</th>
                    <th className="px-6 py-4 text-[10px] text-white/25 tracking-[0.15em] font-medium">NEXT DAY</th>
                  </tr>
                </thead>
                <tbody>
                  {regions.map((r) => (
                    <tr key={r.region} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 text-[13px] text-white/80 font-medium">{r.region}</td>
                      <td className="px-6 py-4 text-[12px] text-white/40">{r.carriers}</td>
                      <td className="px-6 py-4 text-[12px] text-white/40">{r.standard}</td>
                      <td className="px-6 py-4 text-[12px] text-white/40">{r.express}</td>
                      <td className="px-6 py-4 text-[12px] text-white/40">{r.nextDay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Returns Section */}
      <section className="py-24 bg-[#050505] border-y border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[10px] tracking-[0.35em] text-white/25 mb-3">EASY RETURNS</p>
              <h2 className="font-display text-3xl text-white mb-6">30-Day Hassle-Free Returns</h2>
              <p className="text-white/40 text-[14px] leading-[1.8] mb-6">
                We want you to love your purchase. If you're not completely satisfied, return any item within 30 days for a full refund. Items must be in original condition with all accessories and packaging.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  "Free return shipping for defective or incorrect items",
                  "Prepaid return labels provided via email",
                  "Refunds processed within 3-5 business days",
                  "Exchanges available for different sizes or colors",
                  "No restocking fees — ever",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[13px] text-white/40">
                    <CheckCircle size={14} className="text-emerald-400/60 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to="/faq"
                className="inline-flex items-center gap-2 text-[13px] text-white/50 hover:text-white/80 transition-colors"
              >
                Learn more in our FAQ
                <ArrowRight size={13} />
              </Link>
            </div>
            <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-10">
              <h3 className="font-display text-xl text-white mb-6">How Returns Work</h3>
              <div className="space-y-6">
                {[
                  { step: "01", title: "Request a Return", desc: "Log into your Dashboard, select your order, and click 'Request Return'." },
                  { step: "02", title: "Get Your Label", desc: "We'll email you a prepaid shipping label within minutes." },
                  { step: "03", title: "Pack & Ship", desc: "Pack the item in its original packaging, attach the label, and drop off at any carrier location." },
                  { step: "04", title: "Get Refunded", desc: "Once we receive and inspect your return, your refund is processed within 3-5 business days." },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <span className="font-display text-2xl text-white/10 shrink-0">{item.step}</span>
                    <div>
                      <h4 className="text-[14px] font-medium text-white mb-1">{item.title}</h4>
                      <p className="text-[12px] text-white/35 leading-[1.6]">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Customs & Duties */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[10px] tracking-[0.35em] text-white/25 mb-3">IMPORTANT INFORMATION</p>
          <h2 className="font-display text-3xl text-white mb-8">Customs, Duties & Taxes</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-8">
              <h4 className="text-[15px] font-medium text-white mb-3">International Orders</h4>
              <p className="text-[13px] text-white/35 leading-[1.7]">
                For international shipments, your order may be subject to import duties, taxes, and customs processing fees imposed by your country. These charges are the responsibility of the recipient and are not included in our shipping rates. We recommend contacting your local customs office for more information on potential charges.
              </p>
            </div>
            <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-8">
              <h4 className="text-[15px] font-medium text-white mb-3">Delivered Duty Paid (DDP)</h4>
              <p className="text-[13px] text-white/35 leading-[1.7]">
                For select regions, we offer DDP shipping where all duties and taxes are calculated and collected at checkout. This means no surprise charges at delivery. Look for the "Duties Included" badge at checkout to know your total cost upfront.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[#050505] border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="font-display text-3xl text-white mb-4">Ready to Order?</h2>
          <p className="text-white/35 text-[14px] mb-8 max-w-lg mx-auto">
            Free shipping on all orders over $200. Express and Next Day options available at checkout.
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 bg-white text-black text-[13px] font-medium tracking-wide rounded-full px-8 py-3.5 hover:bg-white/90 transition-all"
          >
            Browse Products
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}
