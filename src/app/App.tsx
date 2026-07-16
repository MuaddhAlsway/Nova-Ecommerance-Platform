import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from "react-router";
import { useState, useEffect, useRef } from "react";
import { ShoppingCart, Search, Menu, X, User, LogOut, LayoutDashboard, Shield } from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import FulfillmentPage from "./pages/FulfillmentPage";
import InventoryPage from "./pages/InventoryPage";
import SupplierPage from "./pages/SupplierPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import Careers from "./pages/Careers";
import Press from "./pages/Press";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import Shipping from "./pages/Shipping";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Cookies from "./pages/Cookies";

function Nav() {
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => { setMobileOpen(false); setUserMenuOpen(false); }, [location.pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setSearchOpen(false); };
    if (searchOpen) {
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }
  }, [searchOpen]);

  const NAV_LINKS = [
    { label: "Products", path: "/products" },
    { label: "About", path: "/#why-nova" },
    { label: "Support", path: "/#newsletter" },
  ];

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "backdrop-blur-2xl bg-black/80 border-b border-white/[0.06]" : ""}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="font-display text-lg tracking-[0.35em] text-white font-light select-none">NOVA</Link>

          <button onClick={() => { setSearchOpen(!searchOpen); setTimeout(() => searchRef.current?.focus(), 100); }} className="text-white/50 hover:text-white transition-colors" aria-label="Search">
            <Search size={17} />
          </button>

          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link key={link.path} to={link.path} className="text-[13px] text-white/50 hover:text-white/90 transition-colors tracking-wide">{link.label}</Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Link to="/cart" className="relative text-white/50 hover:text-white transition-colors" aria-label="Cart">
              <ShoppingCart size={17} />
            </Link>

            {user ? (
              <div className="relative">
                <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors">
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-medium text-white/80">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-white/[0.1] bg-[#0d0d0d] shadow-2xl shadow-black/50 p-2">
                    <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
                      <p className="text-[13px] text-white/80 font-medium">{user.name}</p>
                      <p className="text-[11px] text-white/30">{user.email}</p>
                    </div>
                    <Link to="/dashboard" className="flex items-center gap-3 px-3 py-2 text-[13px] text-white/50 hover:text-white/80 hover:bg-white/[0.04] rounded-xl transition-colors">
                      <LayoutDashboard size={14} /> My Dashboard
                    </Link>
                    {user.role === "admin" && (
                      <Link to="/admin" className="flex items-center gap-3 px-3 py-2 text-[13px] text-white/50 hover:text-white/80 hover:bg-white/[0.04] rounded-xl transition-colors">
                        <Shield size={14} /> Admin Panel
                      </Link>
                    )}
                    <button onClick={() => { logout(); navigate("/"); setUserMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 text-[13px] text-white/50 hover:text-white/80 hover:bg-white/[0.04] rounded-xl transition-colors">
                      <LogOut size={14} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="text-[13px] text-white/50 hover:text-white transition-colors tracking-wide">Sign In</Link>
            )}

            <button className="md:hidden text-white/50 hover:text-white transition-colors" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Menu size={17} />
            </button>
          </div>
        </div>
      </nav>

      {searchOpen && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-[#0d0d0d] border-b border-white/[0.07] backdrop-blur-2xl">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && searchQuery.trim()) { navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`); setSearchOpen(false); setSearchQuery(""); } if (e.key === "Escape") setSearchOpen(false); }}
                className="w-full bg-white/[0.05] border border-white/[0.08] text-white placeholder:text-white/25 rounded-xl pl-11 pr-4 py-3 text-[13px] outline-none focus:border-white/20 transition-colors"
              />
            </div>
          </div>
        </div>
      )}

      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black backdrop-blur-xl flex flex-col p-8 pt-6">
          <div className="flex items-center justify-between mb-16">
            <span className="font-display text-lg tracking-[0.35em] text-white font-light">NOVA</span>
            <button onClick={() => setMobileOpen(false)} className="text-white/50 hover:text-white" aria-label="Close menu"><X size={20} /></button>
          </div>
          <nav className="flex flex-col gap-8">
            {NAV_LINKS.map((link) => (
              <Link key={link.path} to={link.path} className="text-3xl text-white/70 hover:text-white transition-colors font-display font-normal" onClick={() => setMobileOpen(false)}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto pt-10 border-t border-white/[0.07] flex gap-4">
            {user ? (
              <>
                <Link to="/dashboard" className="text-sm text-white/40 hover:text-white transition-colors tracking-wide" onClick={() => setMobileOpen(false)}>Dashboard</Link>
                {user.role === "admin" && <Link to="/admin" className="text-sm text-white/40 hover:text-white transition-colors tracking-wide" onClick={() => setMobileOpen(false)}>Admin</Link>}
                <button onClick={() => { logout(); navigate("/"); setMobileOpen(false); }} className="text-sm text-white/40 hover:text-white transition-colors tracking-wide">Sign Out</button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm text-white/40 hover:text-white transition-colors tracking-wide" onClick={() => setMobileOpen(false)}>Sign In</Link>
                <Link to="/register" className="text-sm text-white/40 hover:text-white transition-colors tracking-wide" onClick={() => setMobileOpen(false)}>Create Account</Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Footer() {
  return (
    <footer className="bg-[#030303] border-t border-white/[0.05] pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-10 mb-14">
          <div className="col-span-2 lg:col-span-1">
            <span className="font-display text-lg tracking-[0.35em] text-white font-light">NOVA</span>
            <p className="text-white/25 text-[13px] mt-4 leading-relaxed max-w-[168px]">Premium technology, curated for the discerning buyer.</p>
            <div className="flex gap-2.5 mt-6">
              {["IG", "TW", "YT", "LI"].map((s) => (
                <button key={s} className="w-8 h-8 rounded-full border border-white/[0.08] flex items-center justify-center text-white/25 hover:text-white/65 hover:border-white/20 transition-all text-[9px] font-mono tracking-wider">{s}</button>
              ))}
            </div>
          </div>
          {Object.entries({
            NOVA: [
              { label: "About Us", path: "/about" },
              { label: "Careers", path: "/careers" },
              { label: "Press", path: "/press" },
            ],
            Products: [
              { label: "Laptops", path: "/products?category=1" },
              { label: "Smartphones", path: "/products?category=2" },
              { label: "Audio", path: "/products?category=4" },
              { label: "Gaming", path: "/products?category=5" },
            ],
            Support: [
              { label: "Contact Us", path: "/contact" },
              { label: "FAQ", path: "/faq" },
              { label: "Shipping & Returns", path: "/shipping" },
            ],
            Legal: [
              { label: "Privacy Policy", path: "/privacy" },
              { label: "Terms of Service", path: "/terms" },
              { label: "Cookies", path: "/cookies" },
            ],
          }).map(([section, items]) => (
            <div key={section}>
              <h4 className="text-[10px] text-white/25 tracking-[0.25em] mb-5 font-medium">{section.toUpperCase()}</h4>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.label}><Link to={item.path} className="text-[13px] text-white/20 hover:text-white/60 transition-colors">{item.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-8 border-t border-white/[0.05] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-white/18">&copy; 2026 NOVA Technologies, Inc. All rights reserved.</p>
          <div className="flex items-center gap-5 text-[11px] text-white/18">
            <span>Worldwide Shipping</span>
            <span className="w-1 h-1 rounded-full bg-white/15" />
            <span>SSL Secured</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#080808] min-h-screen antialiased">
      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0) rotate(-1deg); } 50% { transform: translateY(-18px) rotate(-1deg); } }
        @keyframes float-delayed { 0%, 100% { transform: translateY(0) rotate(2deg); } 50% { transform: translateY(-13px) rotate(2deg); } }
        @keyframes float-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
        .animate-float { animation: float 7s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 9s ease-in-out infinite 2s; }
        .animate-float-slow { animation: float-slow 11s ease-in-out infinite 4s; }
        .font-display { font-family: 'Gloock', Georgia, serif; }
        .font-code { font-family: 'JetBrains Mono', ui-monospace, monospace; }
        * { scrollbar-width: none; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
      <Nav />
      {children}
      <Footer />
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout><Home /></Layout>} />
      <Route path="/products" element={<Layout><Products /></Layout>} />
      <Route path="/product/:id" element={<Layout><ProductDetail /></Layout>} />
      <Route path="/cart" element={<Layout><Cart /></Layout>} />
      <Route path="/checkout" element={<Layout><Checkout /></Layout>} />
      <Route path="/login" element={<Layout><Login /></Layout>} />
      <Route path="/register" element={<Layout><Register /></Layout>} />
      <Route path="/dashboard" element={<Layout><UserDashboard /></Layout>} />
      <Route path="/admin" element={<Layout><AdminDashboard /></Layout>} />
      <Route path="/admin/fulfillment" element={<Layout><FulfillmentPage /></Layout>} />
      <Route path="/admin/inventory" element={<Layout><InventoryPage /></Layout>} />
      <Route path="/admin/suppliers" element={<Layout><SupplierPage /></Layout>} />
      <Route path="/admin/analytics" element={<Layout><AnalyticsPage /></Layout>} />
      <Route path="/about" element={<Layout><About /></Layout>} />
      <Route path="/careers" element={<Layout><Careers /></Layout>} />
      <Route path="/press" element={<Layout><Press /></Layout>} />
      <Route path="/contact" element={<Layout><Contact /></Layout>} />
      <Route path="/faq" element={<Layout><FAQ /></Layout>} />
      <Route path="/shipping" element={<Layout><Shipping /></Layout>} />
      <Route path="/privacy" element={<Layout><Privacy /></Layout>} />
      <Route path="/terms" element={<Layout><Terms /></Layout>} />
      <Route path="/cookies" element={<Layout><Cookies /></Layout>} />
      <Route path="*" element={<Layout><NotFound /></Layout>} />
    </Routes>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
