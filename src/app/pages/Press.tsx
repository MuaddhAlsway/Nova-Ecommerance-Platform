import { ExternalLink } from "lucide-react";

const pressReleases = [
  {
    date: "June 12, 2026",
    title: "NOVA Secures $40M Series B to Expand Global Premium Tech Marketplace",
    excerpt: "The funding round, led by Sequoia Capital, will fuel NOVA's expansion into 15 new markets across Europe and Asia-Pacific, along with investments in AI-powered product curation.",
    outlet: "TechCrunch",
  },
  {
    date: "April 3, 2026",
    title: "NOVA Launches Industry-First 'Try at Home' Program for Premium Electronics",
    excerpt: "Customers can now experience up to $10,000 worth of technology in their own homes for 14 days before making a purchase decision, redefining the online electronics shopping experience.",
    outlet: "Forbes",
  },
  {
    date: "February 18, 2026",
    title: "NOVA Named to Fast Company's Most Innovative Companies List for 2026",
    excerpt: "Recognized in the E-Commerce category for revolutionizing how premium technology is discovered, compared, and purchased online.",
    outlet: "Fast Company",
  },
  {
    date: "November 20, 2025",
    title: "NOVA Partners with Apple, Samsung, and Sony for Exclusive Holiday Collection",
    excerpt: "A curated selection of limited-edition products and bundles available exclusively through NOVA for the 2025 holiday season.",
    outlet: "The Verge",
  },
  {
    date: "August 5, 2025",
    title: "NOVA Reaches 1 Million Customers Milestone in Record Time",
    excerpt: "Just 18 months after launch, NOVA achieves a milestone that typically takes e-commerce companies five years, validating the demand for premium curated tech retail.",
    outlet: "Bloomberg",
  },
];

const coverage = [
  { outlet: "TechCrunch", quote: "NOVA is what happens when Apple Store meets Amazon — meticulous curation meets unbeatable convenience." },
  { outlet: "The Verge", quote: "The most beautifully designed e-commerce platform we've ever reviewed. Every pixel screams premium." },
  { outlet: "Forbes", quote: "A masterclass in luxury retail positioning. NOVA proves premium isn't just about price — it's about experience." },
  { outlet: "Wired", quote: "Finally, a tech retailer that respects its customers' time and intelligence. NOVA is the future of online electronics." },
];

export default function Press() {
  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Hero */}
      <section className="pt-32 pb-20 bg-[#050505] border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[10px] tracking-[0.35em] text-white/25 mb-3">PRESS & MEDIA</p>
          <h1 className="font-display text-4xl md:text-6xl text-white font-normal mb-6 max-w-3xl">
            NOVA in the News
          </h1>
          <p className="text-white/40 text-[16px] leading-relaxed max-w-2xl">
            Stay updated with the latest NOVA announcements, partnerships, and press coverage from leading technology and business publications.
          </p>
        </div>
      </section>

      {/* Press Coverage Quotes */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[10px] tracking-[0.35em] text-white/25 mb-3">AS SEEN IN</p>
          <h2 className="font-display text-3xl text-white mb-12">What They're Saying</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {coverage.map((c) => (
              <div key={c.outlet} className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-8">
                <p className="text-[10px] tracking-[0.25em] text-white/25 mb-4 font-medium">{c.outlet.toUpperCase()}</p>
                <p className="text-white/50 text-[14px] leading-[1.7] italic">"{c.quote}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Press Releases */}
      <section className="py-24 bg-[#050505] border-y border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[10px] tracking-[0.35em] text-white/25 mb-3">LATEST NEWS</p>
          <h2 className="font-display text-3xl text-white mb-12">Press Releases</h2>
          <div className="space-y-4">
            {pressReleases.map((pr) => (
              <div key={pr.title} className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-8 hover:border-white/[0.13] transition-all group">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[11px] text-white/30">{pr.date}</span>
                  <span className="w-1 h-1 rounded-full bg-white/15" />
                  <span className="text-[11px] text-white/30">{pr.outlet}</span>
                </div>
                <h3 className="text-[16px] font-medium text-white mb-3 group-hover:text-white/90 transition-colors">{pr.title}</h3>
                <p className="text-white/35 text-[13px] leading-[1.7]">{pr.excerpt}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Media Contact */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="font-display text-3xl text-white mb-4">Press Inquiries</h2>
          <p className="text-white/35 text-[14px] mb-6 max-w-lg mx-auto">
            For media inquiries, interview requests, or high-resolution assets, please contact our press team.
          </p>
          <a
            href="mailto:press@nova.tech"
            className="inline-flex items-center gap-2 bg-white text-black text-[13px] font-medium tracking-wide rounded-full px-8 py-3.5 hover:bg-white/90 transition-all"
          >
            press@nova.tech
            <ExternalLink size={13} />
          </a>
        </div>
      </section>
    </div>
  );
}
