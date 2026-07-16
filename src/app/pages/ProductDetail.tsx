import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import {
  Star,
  ShoppingCart,
  Heart,
  ChevronRight,
  Minus,
  Plus,
  Truck,
  Shield,
  RotateCcw,
  Check,
} from "lucide-react";
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
  images?: string;
  description: string;
  specs?: string;
  badge?: string;
  stock: number;
  category_id: number;
}

interface Category {
  id: number;
  name: string;
}

interface Review {
  id: number;
  user_id: number;
  rating: number;
  title: string;
  comment: string;
  created_at: string;
  reviewer_name: string;
  reviewer_avatar: string;
}

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
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

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [addingCart, setAddingCart] = useState(false);
  const [addingWishlist, setAddingWishlist] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState({ average: 0, count: 0 });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const gallery: string[] = product
    ? ((): string[] => {
        try {
          const parsed = JSON.parse(product.images || "[]");
          return Array.isArray(parsed) && parsed.length > 0
            ? parsed
            : [product.image];
        } catch {
          return [product.image];
        }
      })()
    : [];

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    window.scrollTo(0, 0);

    Promise.all([
      fetch(`${API_BASE}/api/products/${id}`).then((r) => r.json()),
      fetch(`${API_BASE}/api/categories`).then((r) => r.json()),
    ])
      .then(([productData, categoriesData]) => {
        setProduct(productData);
        setCategories(categoriesData);
        if (productData.category_id) {
          fetch(
            `${API_BASE}/api/products?category=${productData.category_id}&limit=4`
          )
            .then((r) => r.json())
            .then((data) => setRelatedProducts(Array.isArray(data) ? data : data.products || []))
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!product) return;
    fetch(`${API_BASE}/api/reviews/${product.id}`)
      .then(r => r.ok ? r.json() : { reviews: [], average: 0, count: 0 })
      .then(data => { setReviews(data.reviews || []); setReviewStats({ average: data.average || 0, count: data.count || 0 }); })
      .catch(() => {});
    if (token) {
      fetch(`${API_BASE}/api/reviews/user/check/${product.id}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : { reviewed: false })
        .then(data => { if (data.reviewed && data.review) setUserReview(data.review); })
        .catch(() => {});
      fetch(`${API_BASE}/api/wishlist`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          const list = Array.isArray(data) ? data : data.wishlist || [];
          setWishlisted(list.some((w: any) => w.product_id === product.id));
        })
        .catch(() => {});
    }
  }, [product, token]);

  const category = product
    ? categories.find((c) => c.id === product.category_id)
    : null;

  const handleAddToCart = async () => {
    if (!token) return;
    setAddingCart(true);
    try {
      const res = await fetch(`${API_BASE}/api/cart`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ product_id: product!.id, quantity }),
      });
      if (res.ok) {
        setAddedToCart(true);
        setTimeout(() => setAddedToCart(false), 2000);
      }
    } catch {
    } finally {
      setAddingCart(false);
    }
  };

  const handleWishlist = async () => {
    if (!token) return;
    setAddingWishlist(true);
    try {
      const res = await fetch(`${API_BASE}/api/wishlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ product_id: product!.id }),
      });
      if (res.ok) {
        setWishlisted((w) => !w);
      }
    } catch {
    } finally {
      setAddingWishlist(false);
    }
  };

  const submitReview = async () => {
    if (!product || !token) return;
    setReviewSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ product_id: product.id, rating: reviewRating, title: reviewTitle, comment: reviewComment }),
      });
      if (res.ok) {
        const rr = await fetch(`${API_BASE}/api/reviews/${product.id}`);
        if (rr.ok) { 
          const d = await rr.json(); 
          setReviews(d.reviews || []); 
          setReviewStats({ average: d.average || 0, count: d.count || 0 }); 
        }
        setShowReviewForm(false);
        setReviewTitle("");
        setReviewComment("");
        setReviewRating(5);
      }
    } catch {}
    setReviewSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-6 h-6 border border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <p className="text-white/40 text-sm">Product not found.</p>
      </div>
    );
  }

  const specs: { label: string; value: string }[] = (() => {
    try {
      return JSON.parse(product.specs || "[]");
    } catch {
      return [];
    }
  })();

  return (
    <div className="min-h-screen bg-[#080808]">
      <div className="max-w-7xl mx-auto px-6 pt-28 pb-20">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[12px] text-white/30 mb-10">
          <Link to="/" className="hover:text-white/60 transition-colors">
            Home
          </Link>
          <ChevronRight size={12} />
          {category && (
            <>
              <Link
                to={`/products?category=${category.id}`}
                className="hover:text-white/60 transition-colors"
              >
                {category.name}
              </Link>
              <ChevronRight size={12} />
            </>
          )}
          <span className="text-white/50 truncate max-w-[200px]">
            {product.name}
          </span>
        </nav>

        {/* Two columns */}
        <div className="grid lg:grid-cols-2 gap-12 xl:gap-16">
          {/* Left – Image Gallery */}
          <div>
            <div className="aspect-square rounded-2xl overflow-hidden border border-white/[0.07] bg-[#0d0d0d] mb-4">
              <img
                src={gallery[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {gallery.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {gallery.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`flex-none w-20 h-20 rounded-xl overflow-hidden border transition-all ${
                      i === selectedImage
                        ? "border-white/30 ring-1 ring-white/20"
                        : "border-white/[0.07] opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right – Product Info */}
          <div>
            {product.badge && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-white/[0.04] text-[10px] text-white/50 tracking-[0.2em] mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {product.badge.toUpperCase()}
              </div>
            )}

            <h1 className="font-display text-4xl text-white font-normal mb-2">
              {product.name}
            </h1>

            {product.subtitle && (
              <p className="text-white/30 text-sm mb-5">{product.subtitle}</p>
            )}

            {/* Rating */}
            <div className="flex items-center gap-3 mb-6">
              <Stars rating={product.rating} />
              <span className="text-white/40 text-[12px]">
                {product.rating.toFixed(1)}
              </span>
              <span className="text-white/15 text-[12px]">
                ({product.reviews.toLocaleString()} reviews)
              </span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6">
              <span className="font-display text-3xl text-white">
                ${product.price.toLocaleString()}
              </span>
              {product.original_price && (
                <span className="text-white/25 text-lg line-through">
                  ${product.original_price.toLocaleString()}
                </span>
              )}
              {product.original_price && (
                <span className="text-[11px] text-emerald-400 font-medium ml-auto">
                  Save ${(product.original_price - product.price).toLocaleString()}
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-white/45 text-[15px] leading-[1.8] mb-8">
              {product.description}
            </p>

            {/* Specs */}
            {specs.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-8">
                {specs.map((spec) => (
                  <div
                    key={spec.label}
                    className="px-4 py-3 rounded-xl border border-white/[0.07] bg-white/[0.02]"
                  >
                    <p className="text-[9px] text-white/25 tracking-[0.2em] mb-1">
                      {spec.label.toUpperCase()}
                    </p>
                    <p className="text-[13px] text-white font-medium">
                      {spec.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Stock */}
            <div className="flex items-center gap-2 mb-6">
              {product.stock > 0 ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[12px] text-emerald-400/70">
                    In Stock ({product.stock} available)
                  </span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-rose-400" />
                  <span className="text-[12px] text-rose-400/70">
                    Out of Stock
                  </span>
                </>
              )}
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-4 mb-6">
              <span className="text-[12px] text-white/40 tracking-wide">
                QUANTITY
              </span>
              <div className="flex items-center border border-white/[0.1] rounded-full">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={product.stock === 0}
                  className="w-10 h-10 flex items-center justify-center text-white/50 hover:text-white transition-colors disabled:opacity-30"
                >
                  <Minus size={14} />
                </button>
                <span className="w-10 text-center text-[14px] text-white font-medium">
                  {quantity}
                </span>
                <button
                  onClick={() =>
                    setQuantity((q) => Math.min(product.stock, q + 1))
                  }
                  disabled={quantity >= product.stock}
                  className="w-10 h-10 flex items-center justify-center text-white/50 hover:text-white transition-colors disabled:opacity-30"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 mb-10">
              <button
                onClick={handleAddToCart}
                disabled={product.stock === 0 || !token || addingCart}
                className="flex-1 min-w-[160px] py-3.5 bg-white text-black text-[13px] font-medium tracking-wide rounded-full hover:bg-white/90 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
              >
                {addedToCart ? (
                  <>
                    <Check size={15} />
                    Added
                  </>
                ) : (
                  <>
                    <ShoppingCart size={15} />
                    Add to Cart
                  </>
                )}
              </button>
              <button className="flex-1 min-w-[120px] py-3.5 border border-white/15 text-white text-[13px] font-medium tracking-wide rounded-full hover:bg-white/[0.05] hover:border-white/30 transition-all">
                Buy Now
              </button>
              <button
                onClick={handleWishlist}
                disabled={!token || addingWishlist}
                className="w-11 h-11 rounded-full border border-white/[0.1] flex items-center justify-center text-white/40 hover:text-rose-400 hover:border-rose-400/30 transition-all disabled:opacity-30"
              >
                <Heart
                  size={15}
                  className={
                    wishlisted ? "fill-rose-400 text-rose-400" : ""
                  }
                />
              </button>
            </div>

            {/* Trust */}
            <div className="flex flex-wrap gap-6 pt-6 border-t border-white/[0.06]">
              {[
                { icon: Truck, text: "Free shipping on orders over $200" },
                { icon: Shield, text: "2-year warranty included" },
                { icon: RotateCcw, text: "30-day easy returns" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.text} className="flex items-center gap-2">
                    <Icon size={14} className="text-white/25" />
                    <span className="text-[11px] text-white/30">
                      {item.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-24">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-[10px] tracking-[0.35em] text-white/25 mb-3">
                  YOU MAY ALSO LIKE
                </p>
                <h2 className="font-display text-3xl text-white font-normal">
                  Related Products
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {relatedProducts
                .filter((p) => p.id !== product.id)
                .slice(0, 4)
                .map((p) => (
                  <Link
                    key={p.id}
                    to={`/product/${p.id}`}
                    className="group rounded-2xl overflow-hidden border border-white/[0.07] bg-[#0d0d0d] hover:border-white/[0.13] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_28px_70px_rgba(0,0,0,0.55)]"
                  >
                    <div className="aspect-square overflow-hidden bg-[#141414]">
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="text-[14px] font-medium text-white leading-tight mb-1">
                        {p.name}
                      </h3>
                      <p className="text-[11px] text-white/30 mb-3">
                        {p.subtitle}
                      </p>
                      <div className="flex items-center gap-2">
                        <Star
                          size={10}
                          className="fill-amber-400 text-amber-400"
                        />
                        <span className="text-[10px] text-white/20">
                          {p.rating.toFixed(1)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[15px] font-medium text-white">
                          ${p.price.toLocaleString()}
                        </span>
                        {p.original_price && (
                          <span className="text-[12px] text-white/20 line-through">
                            ${p.original_price.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </section>
        )}

        {/* Reviews Section */}
        <div className="mt-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-2xl text-white">Customer Reviews</h2>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={14} className={s <= Math.round(reviewStats.average) ? "fill-amber-400 text-amber-400" : "text-white/15"} />
                  ))}
                </div>
                <span className="text-white/50 text-[13px]">{(reviewStats.average || 0).toFixed(1)} ({reviewStats.count} {reviewStats.count === 1 ? "review" : "reviews"})</span>
              </div>
            </div>
            {token && !userReview && (
              <button onClick={() => setShowReviewForm(!showReviewForm)} className="px-5 py-2.5 bg-white text-black text-[13px] font-medium rounded-full hover:bg-white/90 transition-colors">
                Write a Review
              </button>
            )}
          </div>

          {showReviewForm && (
            <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-6 mb-6">
              <h3 className="text-[15px] font-medium text-white mb-4">Your Review</h3>
              <div className="flex items-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setReviewRating(s)}>
                    <Star size={20} className={s <= reviewRating ? "fill-amber-400 text-amber-400" : "text-white/15"} />
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Review title"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/[0.08] text-white placeholder:text-white/20 rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors mb-3"
              />
              <textarea
                placeholder="Write your review..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={3}
                className="w-full bg-white/[0.05] border border-white/[0.08] text-white placeholder:text-white/20 rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-white/20 transition-colors resize-none mb-4"
              />
              <div className="flex gap-3">
                <button onClick={() => setShowReviewForm(false)} className="px-5 py-2.5 text-[13px] text-white/50 rounded-full border border-white/[0.08] hover:border-white/[0.15] transition-all">Cancel</button>
                <button onClick={submitReview} disabled={reviewSubmitting || !reviewTitle.trim()} className="px-6 py-2.5 bg-white text-black text-[13px] font-medium rounded-full hover:bg-white/90 transition-colors disabled:opacity-40">
                  {reviewSubmitting ? "Submitting..." : "Submit Review"}
                </button>
              </div>
            </div>
          )}

          {userReview && (
            <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-medium text-white/80">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div>
                  <p className="text-[13px] text-white/80 font-medium">Your Review</p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={12} className={s <= userReview.rating ? "fill-amber-400 text-amber-400" : "text-white/15"} />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-[13px] text-white/60 font-medium mb-1">{userReview.title}</p>
              <p className="text-[13px] text-white/40">{userReview.comment}</p>
            </div>
          )}

          <div className="space-y-4">
            {reviews.length === 0 && !showReviewForm && (
              <p className="text-white/25 text-[13px] py-8 text-center">No reviews yet. Be the first to review this product.</p>
            )}
            {reviews.map((review) => (
              <div key={review.id} className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-medium text-white/80">
                    {review.reviewer_name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] text-white/80 font-medium">{review.reviewer_name}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={11} className={s <= review.rating ? "fill-amber-400 text-amber-400" : "text-white/15"} />
                        ))}
                      </div>
                      <span className="text-[11px] text-white/25">{new Date(review.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                {review.title && <p className="text-[13px] text-white/60 font-medium mb-1">{review.title}</p>}
                <p className="text-[13px] text-white/40">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
