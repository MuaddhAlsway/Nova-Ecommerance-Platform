import { MapPin, Clock, ChevronRight } from "lucide-react";

const openings = [
  { title: "Senior Full-Stack Engineer", department: "Engineering", location: "Remote", type: "Full-time" },
  { title: "Product Designer", department: "Design", location: "New York, NY", type: "Full-time" },
  { title: "Growth Marketing Manager", department: "Marketing", location: "Remote", type: "Full-time" },
  { title: "Supply Chain Analyst", department: "Operations", location: "San Francisco, CA", type: "Full-time" },
  { title: "Customer Experience Lead", department: "Support", location: "London, UK", type: "Full-time" },
  { title: "DevOps Engineer", department: "Engineering", location: "Remote", type: "Full-time" },
];

const benefits = [
  { title: "Health & Wellness", desc: "Comprehensive medical, dental, and vision coverage for you and your family." },
  { title: "Remote Flexible", desc: "Work from anywhere. We believe great work happens when you're comfortable." },
  { title: "Learning Budget", desc: "$2,500 annual stipend for courses, conferences, and professional development." },
  { title: "Product Discounts", desc: "Exclusive 40% discount on all NOVA products and early access to new releases." },
  { title: "Equity Options", desc: "Competitive equity packages for all full-time employees." },
  { title: "Paid Time Off", desc: "Unlimited PTO policy with a minimum 3-week annual requirement." },
];

export default function Careers() {
  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Hero */}
      <section className="pt-32 pb-20 bg-[#050505] border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[10px] tracking-[0.35em] text-white/25 mb-3">CAREERS</p>
          <h1 className="font-display text-4xl md:text-6xl text-white font-normal mb-6 max-w-3xl">
            Build the Future of Commerce
          </h1>
          <p className="text-white/40 text-[16px] leading-relaxed max-w-2xl">
            Join a team of passionate individuals who are reshaping how people discover and acquire premium technology. We value creativity, ownership, and relentless pursuit of excellence.
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[10px] tracking-[0.35em] text-white/25 mb-3">WHY NOVA</p>
          <h2 className="font-display text-3xl text-white mb-12">Benefits & Perks</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((b) => (
              <div key={b.title} className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-8">
                <h4 className="text-[15px] font-medium text-white mb-3">{b.title}</h4>
                <p className="text-white/35 text-[13px] leading-[1.7]">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Openings */}
      <section className="py-24 bg-[#050505] border-y border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[10px] tracking-[0.35em] text-white/25 mb-3">OPEN ROLES</p>
          <h2 className="font-display text-3xl text-white mb-12">Current Openings</h2>
          <div className="space-y-3">
            {openings.map((job) => (
              <div
                key={job.title}
                className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-6 flex items-center justify-between hover:border-white/[0.13] transition-all group cursor-pointer"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                  <div>
                    <h4 className="text-[15px] font-medium text-white group-hover:text-white/90 transition-colors">{job.title}</h4>
                    <p className="text-[12px] text-white/30 mt-0.5">{job.department}</p>
                  </div>
                  <div className="flex items-center gap-4 text-[12px] text-white/30">
                    <span className="flex items-center gap-1.5"><MapPin size={12} /> {job.location}</span>
                    <span className="flex items-center gap-1.5"><Clock size={12} /> {job.type}</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-white/20 group-hover:text-white/50 transition-colors" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="font-display text-3xl text-white mb-4">Don't See Your Role?</h2>
          <p className="text-white/35 text-[14px] mb-6 max-w-lg mx-auto">
            We're always looking for exceptional people. Send us your resume and tell us how you'd make an impact at NOVA.
          </p>
          <a
            href="mailto:careers@nova.tech"
            className="inline-flex items-center gap-2 bg-white text-black text-[13px] font-medium tracking-wide rounded-full px-8 py-3.5 hover:bg-white/90 transition-all"
          >
            Contact Us at careers@nova.tech
          </a>
        </div>
      </section>
    </div>
  );
}
