import { useState } from "react";
import { Mail, Phone, MapPin, MessageSquare, Send } from "lucide-react";

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Hero */}
      <section className="pt-32 pb-20 bg-[#050505] border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[10px] tracking-[0.35em] text-white/25 mb-3">GET IN TOUCH</p>
          <h1 className="font-display text-4xl md:text-6xl text-white font-normal mb-6 max-w-3xl">
            We'd Love to Hear From You
          </h1>
          <p className="text-white/40 text-[16px] leading-relaxed max-w-2xl">
            Whether you have a question about products, orders, or partnerships — our team is ready to assist.
          </p>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-[1fr_400px] gap-16">
            {/* Contact Form */}
            <div>
              <h2 className="font-display text-2xl text-white mb-8">Send Us a Message</h2>
              {submitted ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-10 text-center">
                  <MessageSquare size={32} className="text-emerald-400 mx-auto mb-4" />
                  <h3 className="text-[16px] font-medium text-white mb-2">Message Sent</h3>
                  <p className="text-white/40 text-[13px]">We'll get back to you within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[11px] text-white/30 tracking-wide mb-2">First Name</label>
                      <input type="text" required className="w-full bg-white/[0.05] border border-white/[0.08] text-white placeholder:text-white/20 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-white/20 transition-colors" placeholder="John" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-white/30 tracking-wide mb-2">Last Name</label>
                      <input type="text" required className="w-full bg-white/[0.05] border border-white/[0.08] text-white placeholder:text-white/20 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-white/20 transition-colors" placeholder="Doe" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-white/30 tracking-wide mb-2">Email</label>
                    <input type="email" required className="w-full bg-white/[0.05] border border-white/[0.08] text-white placeholder:text-white/20 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-white/20 transition-colors" placeholder="john@example.com" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-white/30 tracking-wide mb-2">Subject</label>
                    <select className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-3 text-[13px] outline-none focus:border-white/20 transition-colors cursor-pointer">
                      <option value="" className="bg-[#0d0d0d]">Select a topic</option>
                      <option value="order" className="bg-[#0d0d0d]">Order Support</option>
                      <option value="product" className="bg-[#0d0d0d]">Product Inquiry</option>
                      <option value="shipping" className="bg-[#0d0d0d]">Shipping & Delivery</option>
                      <option value="returns" className="bg-[#0d0d0d]">Returns & Exchanges</option>
                      <option value="partnership" className="bg-[#0d0d0d]">Partnership</option>
                      <option value="other" className="bg-[#0d0d0d]">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-white/30 tracking-wide mb-2">Message</label>
                    <textarea rows={5} required className="w-full bg-white/[0.05] border border-white/[0.08] text-white placeholder:text-white/20 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-white/20 transition-colors resize-none" placeholder="How can we help you?" />
                  </div>
                  <button
                    type="submit"
                    className="flex items-center gap-2 bg-white text-black text-[13px] font-medium tracking-wide rounded-full px-8 py-3.5 hover:bg-white/90 transition-all"
                  >
                    <Send size={14} />
                    Send Message
                  </button>
                </form>
              )}
            </div>

            {/* Contact Info */}
            <div className="space-y-6">
              <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-7">
                <Mail size={18} className="text-white/40 mb-4" />
                <h4 className="text-[14px] font-medium text-white mb-1">Email</h4>
                <p className="text-[13px] text-white/30">support@nova.tech</p>
                <p className="text-[13px] text-white/30">sales@nova.tech</p>
              </div>
              <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-7">
                <Phone size={18} className="text-white/40 mb-4" />
                <h4 className="text-[14px] font-medium text-white mb-1">Phone</h4>
                <p className="text-[13px] text-white/30">+1 (800) NOVA-TECH</p>
                <p className="text-[11px] text-white/20 mt-2">Mon-Fri 9am-6pm EST</p>
              </div>
              <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-7">
                <MapPin size={18} className="text-white/40 mb-4" />
                <h4 className="text-[14px] font-medium text-white mb-1">Headquarters</h4>
                <p className="text-[13px] text-white/30 leading-relaxed">
                  350 Fifth Avenue, Suite 7820<br />
                  New York, NY 10118<br />
                  United States
                </p>
              </div>
              <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-7">
                <MessageSquare size={18} className="text-white/40 mb-4" />
                <h4 className="text-[14px] font-medium text-white mb-1">Live Chat</h4>
                <p className="text-[13px] text-white/30">Available 24/7 for instant support</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
