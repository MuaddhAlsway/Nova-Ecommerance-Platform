import { useState } from "react";
import { ChevronDown } from "lucide-react";

const cookieSections = [
  {
    title: "Essential Cookies",
    desc: "These cookies are necessary for the Service to function and cannot be disabled. They enable core features like security, account authentication, shopping cart functionality, and checkout processing.",
    cookies: [
      { name: "nova_session", purpose: "Maintains your authenticated session across pages", duration: "Session", type: "First-party" },
      { name: "nova_token", purpose: "Stores your JWT authentication token", duration: "30 days", type: "First-party" },
      { name: "cart_id", purpose: "Identifies your shopping cart for guest users", duration: "30 days", type: "First-party" },
      { name: "csrf_token", purpose: "Protects against cross-site request forgery attacks", duration: "Session", type: "First-party" },
    ],
  },
  {
    title: "Analytics Cookies",
    desc: "These cookies help us understand how visitors interact with our Service by collecting anonymous usage data. This information helps us improve the user experience.",
    cookies: [
      { name: "_ga", purpose: "Google Analytics — distinguishes unique users", duration: "2 years", type: "Third-party (Google)" },
      { name: "_ga_*", purpose: "Google Analytics 4 — maintains session state", duration: "2 years", type: "Third-party (Google)" },
      { name: "_gid", purpose: "Google Analytics — distinguishes users", duration: "24 hours", type: "Third-party (Google)" },
      { name: "_hj*", purpose: "Hotjar — tracks user behavior for UX analysis", duration: "1 year", type: "Third-party (Hotjar)" },
    ],
  },
  {
    title: "Marketing Cookies",
    desc: "These cookies are used to deliver relevant advertisements and track the performance of our marketing campaigns. They may be set through our advertising partners.",
    cookies: [
      { name: "_fbp", purpose: "Facebook Pixel — measures ad effectiveness", duration: "90 days", type: "Third-party (Meta)" },
      { name: "_gcl_*", purpose: "Google Ads — tracks conversions from ads", duration: "90 days", type: "Third-party (Google)" },
      { name: "_pin_unauth", purpose: "Pinterest — tracks actions from ads", duration: "1 year", type: "Third-party (Pinterest)" },
    ],
  },
  {
    title: "Preference Cookies",
    desc: "These cookies allow the Service to remember choices you make and provide enhanced, personalized features. They may be set by us or third-party providers.",
    cookies: [
      { name: "nova_theme", purpose: "Stores your theme preference (dark/light)", duration: "1 year", type: "First-party" },
      { name: "nova_currency", purpose: "Remembers your preferred currency", duration: "1 year", type: "First-party" },
      { name: "nova_locale", purpose: "Stores your language preference", duration: "1 year", type: "First-party" },
    ],
  },
];

function CookieSection({ section, defaultOpen = false }: { section: typeof cookieSections[0]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/[0.07] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div>
          <h3 className="text-[15px] font-medium text-white mb-1">{section.title}</h3>
          <p className="text-[12px] text-white/30">{section.cookies.length} cookies</p>
        </div>
        <ChevronDown
          size={16}
          className={`text-white/30 shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-6 pb-6">
          <p className="text-[13px] text-white/35 leading-[1.7] mb-5">{section.desc}</p>
          <div className="bg-[#080808] border border-white/[0.05] rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  <th className="px-4 py-3 text-[10px] text-white/20 tracking-wider font-medium">COOKIE</th>
                  <th className="px-4 py-3 text-[10px] text-white/20 tracking-wider font-medium">PURPOSE</th>
                  <th className="px-4 py-3 text-[10px] text-white/20 tracking-wider font-medium">DURATION</th>
                  <th className="px-4 py-3 text-[10px] text-white/20 tracking-wider font-medium">TYPE</th>
                </tr>
              </thead>
              <tbody>
                {section.cookies.map((c) => (
                  <tr key={c.name} className="border-b border-white/[0.03] last:border-0">
                    <td className="px-4 py-3 text-[12px] text-white/60 font-mono">{c.name}</td>
                    <td className="px-4 py-3 text-[12px] text-white/35">{c.purpose}</td>
                    <td className="px-4 py-3 text-[12px] text-white/35">{c.duration}</td>
                    <td className="px-4 py-3 text-[12px] text-white/35">{c.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Cookies() {
  return (
    <div className="min-h-screen bg-[#080808]">
      <section className="pt-32 pb-16 bg-[#050505] border-b border-white/[0.05]">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-[10px] tracking-[0.35em] text-white/25 mb-3">LEGAL</p>
          <h1 className="font-display text-4xl text-white font-normal mb-3">Cookie Policy</h1>
          <p className="text-[13px] text-white/30">Effective Date: January 1, 2026 &nbsp;|&nbsp; Last Updated: June 1, 2026</p>
        </div>
      </section>
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-6 space-y-10">
          <div>
            <h2 className="font-display text-xl text-white mb-4">What Are Cookies?</h2>
            <p className="text-[14px] text-white/40 leading-[1.8]">
              Cookies are small text files that are stored on your device when you visit a website. They are widely used to make websites work efficiently, provide a better user experience, and supply information to the website owners. Cookies can be "first-party" (set by the website you are visiting) or "third-party" (set by other websites or services).
            </p>
          </div>
          <div>
            <h2 className="font-display text-xl text-white mb-4">How We Use Cookies</h2>
            <p className="text-[14px] text-white/40 leading-[1.8] mb-4">
              We use cookies for several purposes:
            </p>
            <ul className="text-[14px] text-white/40 leading-[1.8] space-y-2 list-disc list-inside">
              <li><span className="text-white/60">Essential:</span> Required for the Service to function (authentication, security, shopping cart)</li>
              <li><span className="text-white/60">Analytics:</span> Help us understand how visitors use our Service</li>
              <li><span className="text-white/60">Marketing:</span> Used to deliver relevant ads and measure campaign effectiveness</li>
              <li><span className="text-white/60">Preferences:</span> Remember your settings and personalize your experience</li>
            </ul>
          </div>
          <div>
            <h2 className="font-display text-xl text-white mb-4">Cookie Consent</h2>
            <p className="text-[14px] text-white/40 leading-[1.8]">
              When you first visit our Service, you will be presented with a cookie consent banner. You can choose to accept all cookies or customize your preferences. Essential cookies cannot be disabled as they are necessary for the Service to function. You can change your cookie preferences at any time by contacting us at privacy@nova.tech.
            </p>
          </div>

          {/* Cookie Table */}
          <div>
            <h2 className="font-display text-xl text-white mb-6">Cookie Details</h2>
            <div className="space-y-4">
              {cookieSections.map((section, i) => (
                <CookieSection key={section.title} section={section} defaultOpen={i === 0} />
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-display text-xl text-white mb-4">Managing Cookies in Your Browser</h2>
            <div className="text-[14px] text-white/40 leading-[1.8]">
              <p className="mb-3">You can control and manage cookies through your browser settings. Popular browsers allow you to:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>View and delete cookies</li>
                <li>Block all cookies or only third-party cookies</li>
                <li>Set preferences for specific websites</li>
                <li>Receive notifications when cookies are set</li>
              </ul>
              <p className="mt-3">Note: Disabling essential cookies may affect the functionality of our Service. Here are links to cookie management for major browsers:</p>
              <ul className="space-y-1 list-disc list-inside mt-2">
                <li>Google Chrome: chrome://settings/cookies</li>
                <li>Mozilla Firefox: about:preferences#privacy</li>
                <li>Safari: Preferences &gt; Privacy</li>
                <li>Microsoft Edge: edge://settings/privacy</li>
              </ul>
            </div>
          </div>
          <div>
            <h2 className="font-display text-xl text-white mb-4">Changes to This Policy</h2>
            <p className="text-[14px] text-white/40 leading-[1.8]">
              We may update this Cookie Policy from time to time to reflect changes in technology, legislation, or our business practices. Any changes will be posted on this page with an updated "Last Updated" date.
            </p>
          </div>
          <div>
            <h2 className="font-display text-xl text-white mb-4">Contact Us</h2>
            <p className="text-[14px] text-white/40 leading-[1.8]">
              If you have questions about our use of cookies, contact us at privacy@nova.tech or NOVA Technologies, Inc., 350 Fifth Avenue, Suite 7820, New York, NY 10118.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
