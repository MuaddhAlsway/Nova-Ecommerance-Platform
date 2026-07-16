import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { Star, Heart, ShoppingCart, ChevronRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { API_BASE } from "../config";

interface Product {
  id: number;
  name: string;
  subtitle: string;
  price: number;
  original_price?: number;
  rating: number;
  reviews: number;
  image: string;
  badge?: string;
}

interface Category {
  id: number;
  name: string;
  icon?: string;
  count?: number;
  color?: string;
}

function Stars({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          className={
            s <= Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "text-white/10 fill-white/5"
          }
        />
      ))}
    </div>
  );
}

function ProductCard({
  product,
  onAddToCart,
}: {
  product: Product;
  onAddToCart: (id: number) => void;
}) {
  const [wishlisted, setWishlisted] = useState(false);

  return (
    <Link to={`/product/${product.id}`} className="block">
      <div className="group relative rounded-2xl overflow-hidden border border-white/[0.07] bg-[#0d0d0d] hover:border-white/[0.13] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_28px_70px_rgba(0,0,0,0.55)]">
        <div className="relative aspect-square overflow-hidden bg-[#141414]">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />

          {product.badge && (
            <div className="absolute top-3 left-3 px-2.5 py-1 bg-white text-black text-[9px] font-bold tracking-[0.15em] rounded-full uppercase">
              {product.badge}
            </div>
          )}

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setWishlisted((w) => !w);
            }}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/70"
            aria-label="Add to wishlist"
          >
            <Heart
              size={13}
              className={
                wishlisted ? "fill-rose-400 text-rose-400" : "text-white/70"
              }
            />
          </button>

          <div className="absolute inset-x-3 bottom-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddToCart(product.id);
              }}
              className="w-full py-2.5 bg-white text-black text-[11px] font-semibold tracking-wide rounded-full hover:bg-white/90 transition-colors"
            >
              Add to Cart
            </button>
          </div>
        </div>

        <div className="p-4">
          <h3 className="text-[14px] font-medium text-white leading-tight mb-1">
            {product.name}
          </h3>
          <p className="text-[11px] text-white/30 mb-3">{product.subtitle}</p>

          <div className="flex items-center gap-2 mb-3">
            <Stars rating={product.rating} />
            <span className="text-[10px] text-white/20">
              ({product.reviews.toLocaleString()})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[15px] font-medium text-white">
              ${product.price.toLocaleString()}
            </span>
            {product.original_price && (
              <>
                <span className="text-[12px] text-white/20 line-through">
                  ${product.original_price.toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-400 font-medium ml-auto">
                  −${(product.original_price - product.price).toLocaleString()}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Products() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("category") || "";

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    fetch(`${API_BASE}/api/categories`)
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    params.set("page", String(currentPage));
    params.set("limit", "12");
    params.set("sort", sortBy);
    fetch(`${API_BASE}/api/products?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProducts(data);
          setTotalPages(1);
          setTotalProducts(data.length);
        } else {
          setProducts(data.products || []);
          setTotalPages(data.totalPages || 1);
          setTotalProducts(data.total || 0);
        }
      })
      .catch(() => {
        setProducts([]);
        setTotalPages(1);
        setTotalProducts(0);
      })
      .finally(() => setLoading(false));
  }, [activeCategory, searchParams, currentPage, sortBy]);

  const handleCategoryChange = (id: string | number) => {
    if (id) {
      setSearchParams({ category: String(id) });
    } else {
      setSearchParams({});
    }
  };

  const handleAddToCart = async (productId: number) => {
    if (!token) {
      window.location.href = "/login";
      return;
    }
    try {
      await fetch(`${API_BASE}/api/cart`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ product_id: productId }),
      });
    } catch {
      // silently fail
    }
  };

  return (
    <div className="bg-[#080808] min-h-screen antialiased">
      {/* Header */}
      <section className="pt-32 pb-12 bg-[#050505] border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[10px] tracking-[0.35em] text-white/25 mb-3">
            NOVA
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-white font-normal mb-2">
            All Products
          </h1>
          <p className="text-white/40 text-[15px]">
            Explore our curated collection of premium technology.
          </p>
        </div>
      </section>

      {/* Category Tabs */}
      <section className="sticky top-16 z-30 bg-[#080808]/90 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto py-4" style={{ scrollbarWidth: "none" }}>
            <button
              onClick={() => handleCategoryChange("")}
              className={`flex-none px-5 py-2 text-[13px] tracking-wide rounded-full border transition-all duration-300 ${
                !activeCategory
                  ? "bg-white text-black font-medium border-white"
                  : "bg-transparent text-white/40 border-white/[0.09] hover:text-white/70 hover:border-white/20"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`flex-none px-5 py-2 text-[13px] tracking-wide rounded-full border transition-all duration-300 ${
                  activeCategory === String(cat.id)
                    ? "bg-white text-black font-medium border-white"
                    : "bg-transparent text-white/40 border-white/[0.09] hover:text-white/70 hover:border-white/20"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-white/[0.07] bg-[#0d0d0d] overflow-hidden animate-pulse"
                >
                  <div className="aspect-square bg-white/[0.03]" />
                  <div className="p-4 space-y-3">
                    <div className="h-3 bg-white/[0.05] rounded w-3/4" />
                    <div className="h-2 bg-white/[0.04] rounded w-1/2" />
                    <div className="h-2 bg-white/[0.04] rounded w-1/4" />
                    <div className="h-3 bg-white/[0.05] rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-32">
              <p className="text-white/25 text-[15px]">
                No products found in this category.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <p className="text-[13px] text-white/35">{totalProducts} products</p>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-white/30">Sort by</span>
                  <select
                    value={sortBy}
                    onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
                    className="appearance-none bg-white/[0.05] border border-white/[0.08] text-white rounded-xl px-4 py-2 text-[12px] outline-none focus:border-white/20 transition-colors cursor-pointer"
                  >
                    <option value="newest" className="bg-[#0d0d0d]">Newest</option>
                    <option value="price_asc" className="bg-[#0d0d0d]">Price: Low to High</option>
                    <option value="price_desc" className="bg-[#0d0d0d]">Price: High to Low</option>
                    <option value="rating" className="bg-[#0d0d0d]">Top Rated</option>
                    <option value="name" className="bg-[#0d0d0d]">Name A–Z</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>
              {/* Sort & Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-8">
                  <p className="text-[12px] text-white/30">
                    Showing {(currentPage - 1) * 12 + 1}–{Math.min(currentPage * 12, totalProducts)} of {totalProducts}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 text-[12px] rounded-xl border border-white/[0.08] text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Prev
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-9 h-9 rounded-xl text-[12px] transition-all ${
                            currentPage === pageNum
                              ? "bg-white text-black font-medium"
                              : "border border-white/[0.08] text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 text-[12px] rounded-xl border border-white/[0.08] text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
