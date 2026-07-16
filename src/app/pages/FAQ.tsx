import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqCategories = [
  {
    title: "Orders & Payment",
    items: [
      { q: "How do I place an order?", a: "Simply browse our curated collection, add items to your cart, and proceed to checkout. You can pay with credit/debit cards, Apple Pay, or Google Pay. All transactions are secured with 256-bit SSL encryption." },
      { q: "Can I modify or cancel my order after placing it?", a: "Orders can be modified or cancelled within 2 hours of placement. After that, our fulfillment team begins processing. Contact support@nova.tech immediately if you need changes." },
      { q: "What payment methods do you accept?", a: "We accept all major credit cards (Visa, Mastercard, Amex, Discover), Apple Pay, and Google Pay. All payments are processed securely through Stripe." },
      { q: "Do you offer financing or installment plans?", a: "Yes! We partner with Affirm to offer 0% APR financing for 6-12 months on orders over $500. Select Affirm at checkout to see your options." },
    ],
  },
  {
    title: "Account & Security",
    items: [
      { q: "How do I create an account?", a: "Click 'Sign In' in the top navigation and select 'Create Account'. You'll need your email address and a password. You can also sign in with your Google or Apple ID." },
      { q: "How do I reset my password?", a: "Click 'Sign In' and then 'Forgot Password'. Enter your email address and we'll send you a secure reset link valid for 1 hour." },
      { q: "Is my personal information safe?", a: "Absolutely. We use enterprise-grade encryption, never store full credit card numbers, and never sell your data. Read our Privacy Policy for complete details." },
    ],
  },
  {
    title: "Shipping & Delivery",
    items: [
      { q: "How long does shipping take?", a: "Standard shipping takes 5-7 business days. Express (2-3 business days) and Next Day delivery options are available at checkout. International orders typically arrive within 7-14 business days." },
      { q: "Do you ship internationally?", a: "Yes! We ship to over 35 countries worldwide. Shipping rates and delivery times vary by destination. Enter your address at checkout for exact pricing." },
      { q: "How can I track my order?", a: "Once your order ships, you'll receive a tracking number via email. You can also track your order in real-time from your Dashboard under 'Orders'." },
      { q: "Which carriers do you use?", a: "We partner with USPS, UPS, FedEx, and DHL through Shippo, a multi-carrier shipping platform. Rates are discounted and the best carrier is selected based on your location and chosen shipping speed. See our Shipping page for full details." },
    ],
  },
  {
    title: "Returns & Exchanges",
    items: [
      { q: "What is your return policy?", a: "We offer a 30-day hassle-free return policy. Items must be in original condition with all packaging. Refunds are processed within 3-5 business days of receiving the return." },
      { q: "How do I start a return?", a: "Log into your Dashboard, go to Orders, select the order containing the item you want to return, and click 'Request Return'. We'll provide a prepaid shipping label." },
      { q: "Can I exchange an item instead of returning it?", a: "Yes! During the return process, select 'Exchange' and choose your desired replacement item. We'll ship the new item as soon as we receive your return." },
      { q: "Are return shipping costs covered?", a: "For defective or incorrect items, return shipping is fully covered. For change-of-mind returns, a flat $15 return shipping fee is deducted from your refund." },
    ],
  },
  {
    title: "Warranty & Repairs",
    items: [
      { q: "Do products come with a warranty?", a: "Every product sold on NOVA includes a minimum 2-year manufacturer warranty. Many brands offer extended warranty options at checkout." },
      { q: "How do I file a warranty claim?", a: "Contact our support team at support@nova.tech with your order number and a description of the issue. We'll guide you through the claim process." },
      { q: "Do you offer repair services?", a: "Yes, for select products we offer authorized repair services. Contact our support team to check availability for your specific product." },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/[0.07] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-[14px] text-white/80 font-medium pr-4">{q}</span>
        <ChevronDown
          size={16}
          className={`text-white/30 shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-6 pb-5">
          <p className="text-[13px] text-white/35 leading-[1.7]">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Hero */}
      <section className="pt-32 pb-20 bg-[#050505] border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[10px] tracking-[0.35em] text-white/25 mb-3">HELP CENTER</p>
          <h1 className="font-display text-4xl md:text-6xl text-white font-normal mb-6 max-w-3xl">
            Frequently Asked Questions
          </h1>
          <p className="text-white/40 text-[16px] leading-relaxed max-w-2xl">
            Find answers to the most common questions about orders, shipping, returns, and more.
          </p>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6">
          <div className="space-y-12">
            {faqCategories.map((cat) => (
              <div key={cat.title}>
                <h2 className="font-display text-2xl text-white mb-6">{cat.title}</h2>
                <div className="space-y-3">
                  {cat.items.map((item) => (
                    <FAQItem key={item.q} q={item.q} a={item.a} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Still need help */}
      <section className="py-16 bg-[#050505] border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h3 className="text-[16px] font-medium text-white mb-2">Still have questions?</h3>
          <p className="text-white/35 text-[13px] mb-6">Our support team is available 24/7</p>
          <a
            href="mailto:support@nova.tech"
            className="inline-flex items-center gap-2 bg-white text-black text-[13px] font-medium tracking-wide rounded-full px-8 py-3.5 hover:bg-white/90 transition-all"
          >
            Contact Support
          </a>
        </div>
      </section>
    </div>
  );
}
