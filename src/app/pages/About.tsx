import { Link } from "react-router";
import { ArrowRight, Target, Eye, Gem, Users } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Hero */}
      <section className="pt-32 pb-20 bg-[#050505] border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[10px] tracking-[0.35em] text-white/25 mb-3">OUR STORY</p>
          <h1 className="font-display text-4xl md:text-6xl text-white font-normal mb-6 max-w-3xl">
            Redefining Premium Technology
          </h1>
          <p className="text-white/40 text-[16px] leading-relaxed max-w-2xl">
            Founded in 2024, NOVA was born from a simple belief: technology should be experienced, not just purchased. We curate the world's finest tech products for discerning buyers who demand nothing less than extraordinary.
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-10">
              <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mb-6">
                <Target size={22} className="text-white/50" />
              </div>
              <h3 className="font-display text-2xl text-white mb-4">Our Mission</h3>
              <p className="text-white/40 text-[14px] leading-[1.8]">
                To bridge the gap between cutting-edge technology and the people who appreciate craftsmanship. Every product in our collection is handpicked, tested, and verified by our team of technology experts before it reaches your hands.
              </p>
            </div>
            <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-10">
              <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mb-6">
                <Eye size={22} className="text-white/50" />
              </div>
              <h3 className="font-display text-2xl text-white mb-4">Our Vision</h3>
              <p className="text-white/40 text-[14px] leading-[1.8]">
                To become the world's most trusted destination for premium technology, setting the standard for curated e-commerce experiences that prioritize quality, authenticity, and exceptional customer care.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 bg-[#050505] border-y border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[10px] tracking-[0.35em] text-white/25 mb-3">WHAT DRIVES US</p>
          <h2 className="font-display text-3xl text-white mb-12">Our Core Values</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Gem, title: "Quality First", desc: "Every product undergoes rigorous quality testing. We partner only with brands that share our commitment to excellence." },
              { icon: Users, title: "Customer Obsessed", desc: "From personalized recommendations to white-glove support, every touchpoint is designed around your experience." },
              { icon: Target, title: "Innovation Driven", desc: "We stay ahead of the curve, constantly scouting emerging technologies that redefine what's possible." },
            ].map((item) => (
              <div key={item.title} className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-8">
                <item.icon size={20} className="text-white/40 mb-5" />
                <h4 className="text-[15px] font-medium text-white mb-3">{item.title}</h4>
                <p className="text-white/35 text-[13px] leading-[1.7]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { value: "50K+", label: "Happy Customers" },
              { value: "200+", label: "Premium Products" },
              { value: "35+", label: "Countries Served" },
              { value: "99.8%", label: "Satisfaction Rate" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-display text-4xl text-white mb-2">{stat.value}</p>
                <p className="text-[13px] text-white/30">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-[#050505] border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="font-display text-3xl text-white mb-4">Experience the Difference</h2>
          <p className="text-white/35 text-[14px] mb-8 max-w-lg mx-auto">
            Discover why thousands of technology enthusiasts trust NOVA for their most important purchases.
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 bg-white text-black text-[13px] font-medium tracking-wide rounded-full px-8 py-3.5 hover:bg-white/90 transition-all"
          >
            Shop Now
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}
