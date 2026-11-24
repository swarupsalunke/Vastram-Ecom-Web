import { Link, Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import { Protected, AdminOnly } from "./components/Guards";
import Notice from "./components/Notice";
import api from "./api";
import { useCart } from "./context/CartContext";
import Pagination from "./components/Pagination";
import AboutUs from "./pages/AboutUs";
import ContactUs from "./pages/ContactUs";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsConditions from "./pages/TermsConditions";
import ShippingPolicy from "./pages/ShippingPolicy";
import ReturnPolicy from "./pages/ReturnPolicy";
import RefundPolicy from "./pages/RefundPolicy";
import { Search, SlidersHorizontal, Plus, Pencil, Trash2, Package, ShoppingBag, Users, IndianRupee, X, Warehouse, Eye, CheckCircle, Clock, Truck, MessageSquare, TicketPercent, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

const money = n => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(n || 0));
const imageFallback = "https://placehold.co/600x750/f6f6f6/777?text=Vastram";
const isSizeFreeCategory = name => /^sarees?$/i.test(String(name || "").trim());
const categoryRequiresSize = category => typeof category?.requiresSize === "boolean" ? category.requiresSize : !isSizeFreeCategory(category?.name);
const productRequiresSize = product => typeof product?.requiresSize === "boolean" ? product.requiresSize : typeof product?.category?.requiresSize === "boolean" ? product.category.requiresSize : !isSizeFreeCategory(product?.categoryName);
const orderItemRequiresSize = item => typeof item?.requiresSize === "boolean" ? item.requiresSize : !isSizeFreeCategory(item?.categoryName);
const stockFromSizeText = value => String(value || "").split(",").reduce((total, entry) => total + Math.max(0, Number(entry.split(":")[1]) || 0), 0);
function useLoad(url, deps = []) {
  const [data, setData] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const reload = async () => { setLoading(true); setError(""); try { const r = await api.get(url); setData(r.data); } catch (e) { setError(e.response?.data?.message || "Could not load data."); } finally { setLoading(false); } };
  useEffect(() => { reload(); }, deps);
  return { data, setData, loading, error, reload };
}
function PageTitle({ title, subtitle, action }) { return <div className="page-title"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</div>; }

function Home() {
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState({ gender: params.get("gender") || "", category: params.get("category") || "", subcategory: params.get("subcategory") || "", size: params.get("size") || "", minPrice: params.get("minPrice") || "", maxPrice: params.get("maxPrice") || "", search: params.get("search") || "", sort: params.get("sort") || "" });
  const [categories, setCategories] = useState([]);
  const [activeHeroImage, setActiveHeroImage] = useState(0);
  const { add } = useCart();
  const { data: products, loading, error } = useLoad("/products?" + new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v))), [JSON.stringify(filters)]);
  const { data: heroBanner, error: heroBannerError } = useLoad("/hero-banners");
  const heroImages = heroBanner.images || [];
  useEffect(() => { api.get("/categories").then(r => setCategories(r.data)).catch(() => setCategories([])); }, []);
  useEffect(() => { setActiveHeroImage(0); }, [heroImages.length, heroImages[0]]);
  useEffect(() => {
    if (heroImages.length < 2) return undefined;
    const timer = window.setInterval(() => setActiveHeroImage(current => (current + 1) % heroImages.length), 5000);
    return () => window.clearInterval(timer);
  }, [heroImages.length]);
  const change = (k, v) => setFilters(p => ({ ...p, [k]: v, ...(k === "gender" ? { category: "", subcategory: "" } : {}), ...(k === "category" ? { subcategory: "" } : {}) }));
  const clear = () => setFilters({ gender: "", category: "", subcategory: "", size: "", minPrice: "", maxPrice: "", search: "", sort: "" });
  const selectedCategory = categories.find(category => category._id === filters.category);
  return <div className="page">
    {heroBannerError && <Notice message={`Home banner could not be loaded: ${heroBannerError}`} type="error" />}
    <section className="hero"><div><span className="eyebrow">THE NEW SEASON EDIT</span><h1>Find your<br /><em>everyday style.</em></h1><p>Thoughtful essentials for men and women. Discover pieces you’ll reach for again and again.</p><a href="#shop" className="button">Explore collection</a></div><div className={`hero-art ${heroImages.length ? "hero-art-with-image" : ""}`}>{heroImages.length ? <><img className="hero-banner-image" src={heroImages[activeHeroImage]} alt="Vastram featured collection" onError={e => { e.currentTarget.src = imageFallback; }} />{heroImages.length > 1 && <div className="hero-banner-controls"><button type="button" aria-label="Previous banner" onClick={() => setActiveHeroImage(current => (current - 1 + heroImages.length) % heroImages.length)}><ChevronLeft size={18} /></button>{heroImages.map((image, index) => <button key={`${image}-${index}`} type="button" className={`hero-banner-dot ${index === activeHeroImage ? "active" : ""}`} aria-label={`Show banner ${index + 1}`} aria-pressed={index === activeHeroImage} onClick={() => setActiveHeroImage(index)} />)}<button type="button" aria-label="Next banner" onClick={() => setActiveHeroImage(current => (current + 1) % heroImages.length)}><ChevronRight size={18} /></button></div>}</> : <><div className="hero-circle"></div><div className="hero-caption">NEW ARRIVALS<br /><strong>STYLE YOUR WAY</strong></div></>}</div></section>
    <div id="shop" className="section-heading"><div><span className="eyebrow">CURATED FOR YOU</span><h2>Shop the collection</h2></div><span className="muted">{products.length} products</span></div>
    <div className="shop-layout">
      <aside className="filter-panel"><div className="filter-head"><h3><SlidersHorizontal size={17} /> Filters</h3><button className="text-button" onClick={clear}>Reset</button></div>
        <label>Search products<input value={filters.search} onChange={e => change("search", e.target.value)} placeholder="Search clothes…" /></label>
        <label>Gender<select value={filters.gender} onChange={e => change("gender", e.target.value)}><option value="">Men & Women</option><option>Men</option><option>Women</option></select></label>
        <label>Category<select value={filters.category} onChange={e => change("category", e.target.value)}><option value="">All categories</option>{categories.filter(c => !filters.gender || c.gender === filters.gender).map(c => <option key={c._id} value={c._id}>{c.gender} · {c.name}</option>)}</select></label>
        {selectedCategory?.subcategories?.length > 0 && <label>Subcategory<select value={filters.subcategory} onChange={e => change("subcategory", e.target.value)}><option value="">All subcategories</option>{selectedCategory.subcategories.map(subcategory => <option key={subcategory}>{subcategory}</option>)}</select></label>}
        <label>Size<input value={filters.size} onChange={e => change("size", e.target.value)} placeholder="e.g. M, 30, Free Size" /></label>
        <div className="two-input"><label>Min price<input type="number" min="0" value={filters.minPrice} onChange={e => change("minPrice", e.target.value)} placeholder="₹ 0" /></label><label>Max price<input type="number" min="0" value={filters.maxPrice} onChange={e => change("maxPrice", e.target.value)} placeholder="₹ 5000" /></label></div>
        <label>Sort by<select value={filters.sort} onChange={e => change("sort", e.target.value)}><option value="">Newest</option><option value="price-asc">Price: Low to high</option><option value="price-desc">Price: High to low</option></select></label>
      </aside>
      <section className="product-results">{error && <Notice message={error} type="error" />}{loading ? <p>Loading products…</p> : products.length ? <div className="product-grid">{products.map(p => <ProductCard key={p._id} product={p} onAdd={add} />)}</div> : <div className="empty"><Package size={32} /><h3>No products found</h3><p>Try changing or resetting your filters.</p></div>}</section>
    </div>
  </div>;
}
function ProductCard({ product, onAdd }) {
  const [message, setMessage] = useState("");
  const [selection, setSelection] = useState({});
  const sizes = (product.sizes || []).filter(s => s.stock > 0);
  const size = selection.size || sizes[0]?.size || "";
  const sizeFree = !productRequiresSize(product);
  return <article className="product-card">
    <div className="product-image"><Link className="product-image-link" to={`/products/${product._id}`} aria-label={`View ${product.name}`}><img src={product.images?.[0] || imageFallback} alt={product.name} onError={e => { e.currentTarget.src = imageFallback; }} /></Link>{product.featured && <span className="image-tag">FEATURED</span>}</div>
    <div className="product-info"><div className="product-meta">{product.gender} · {product.categoryName}{product.subcategory && ` · ${product.subcategory}`}</div><h3><Link to={`/products/${product._id}`}>{product.name}</Link></h3><div className="price-row"><strong>{money(product.price)}</strong>{product.compareAtPrice > product.price && <del>{money(product.compareAtPrice)}</del>}</div>
      {!sizeFree && <div className="product-options"><select aria-label="Select size" value={size} onChange={e => setSelection(p => ({ ...p, size: e.target.value }))}><option value="">Select size</option>{sizes.map(s => <option key={s.size} value={s.size}>{s.size}</option>)}</select></div>}
      <button className="button full" disabled={!size || !sizes.length} onClick={() => { const added = onAdd(product, size); setMessage(added ? "Added to cart" : `Maximum available stock: ${sizes.find(item => item.size === size)?.stock || 0}`); setTimeout(() => setMessage(""), 2200); }}>{sizes.length ? "Add to cart" : "Out of stock"}</button>{message && <small className={message.startsWith("Added") ? "success-text" : "muted"}>{message}</small>}
    </div>
  </article>;
}

function ProductDetail() {
  const { id } = useParams();
  const { add } = useCart();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [relatedError, setRelatedError] = useState("");
  const [selectedImage, setSelectedImage] = useState(0);
  const [size, setSize] = useState("");
  const [message, setMessage] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setRelatedError("");
    setProduct(null);
    setRelated([]);
    api.get(`/products/${id}`).then(async ({ data }) => {
      if (!active) return;
      setProduct(data);
      setSelectedImage(0);
      setSize((data.sizes || []).find(s => s.stock > 0)?.size || "");
      const categoryId = data.category?._id || data.category;
      if (!categoryId) return;
      try {
        const { data: products } = await api.get("/products", { params: { category: categoryId, gender: data.gender } });
        if (active) setRelated(products.filter(item => item._id !== data._id));
      } catch {
        if (active) setRelatedError("Related products could not be loaded.");
      }
    }).catch(e => {
      if (active) setError(e.response?.data?.message || "Could not load this product.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [id]);

  if (loading) return <div className="page"><p>Loading product…</p></div>;
  if (error || !product) return <div className="page"><Notice message={error || "Product not found."} type="error" /><Link className="button secondary" to="/"><ArrowLeft size={16} /> Back to shop</Link></div>;

  const sizes = (product.sizes || []).filter(item => item.stock > 0);
  const images = product.images?.length ? product.images : [imageFallback];
  const categoryId = product.category?._id || product.category;
  const sizeFree = !productRequiresSize(product);

  const addToCart = () => {
    setAdding(true);
    if (!add(product, size)) {
      setMessage(`Maximum available stock: ${sizes.find(item => item.size === size)?.stock || 0}`);
      setAdding(false);
      setTimeout(() => setMessage(""), 2200);
      return;
    }
    setMessage("Added to cart.");
    setTimeout(() => {
      setMessage("");
      setAdding(false);
    }, 1600);
  };

  return <div className="page">
    <Link className="back-link" to="/"><ArrowLeft size={16} /> Back to shop</Link>
    <section className="product-detail">
      <div className="detail-gallery">
        <div className="detail-main-image"><img src={images[selectedImage] || imageFallback} alt={product.name} onError={e => { e.currentTarget.src = imageFallback; }} /></div>
        {images.length > 1 && <div className="detail-thumbnails">{images.map((image, index) => <button key={`${image}-${index}`} className={`detail-thumbnail ${selectedImage === index ? "active" : ""}`} onClick={() => setSelectedImage(index)} aria-label={`View product image ${index + 1}`} aria-pressed={selectedImage === index}><img src={image} alt="" onError={e => { e.currentTarget.src = imageFallback; }} /></button>)}</div>}
      </div>
      <div className="detail-info">
        <div className="product-meta">{product.gender} · {product.categoryName}{product.subcategory && ` · ${product.subcategory}`}</div>
        <h1>{product.name}</h1>
        <div className="detail-price"><strong>{money(product.price)}</strong>{product.compareAtPrice > product.price && <del>{money(product.compareAtPrice)}</del>}</div>
        <p className="detail-description">{product.description || "A thoughtfully selected piece from our collection."}</p>
        <div className="detail-facts"><span>Category</span><strong>{product.categoryName}</strong>{product.subcategory && <><span>Subcategory</span><strong>{product.subcategory}</strong></>}<span>For</span><strong>{product.gender}</strong></div>
        {!sizeFree && <label>Size<select value={size} onChange={e => setSize(e.target.value)}><option value="">Select size</option>{sizes.map(item => <option key={item.size} value={item.size}>{item.size} · {item.stock} available</option>)}</select></label>}
        <button className="button full detail-add-button" disabled={!size || !sizes.length || adding} onClick={addToCart}>{sizes.length ? (adding ? "Added to cart" : "Add to cart") : "Out of stock"}</button>
        {message && <p className="success-text" role="status">{message}</p>}
        {!sizes.length && <p className="muted">{sizeFree ? "This product is currently out of stock." : "This product is currently unavailable in all sizes."}</p>}
      </div>
    </section>
    <section className="related-section">
      <div className="section-heading"><div><span className="eyebrow">MORE TO EXPLORE</span><h2>Related products</h2></div>{categoryId && <Link className="text-button" to={`/?gender=${encodeURIComponent(product.gender)}&category=${encodeURIComponent(categoryId)}#shop`}>Shop {product.categoryName}</Link>}</div>
      {relatedError && <Notice message={relatedError} type="error" />}
      {related.length ? <div className="product-grid">{related.map(item => <ProductCard key={item._id} product={item} onAdd={add} />)}</div> : <p className="muted">No other products are available in this category yet.</p>}
    </section>
  </div>;
}

function AuthPage({ mode }) {
  const { login, register } = useAuth(); const navigate = useNavigate(); const [form, setForm] = useState({ name: "", email: "", password: "" }); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async e => { e.preventDefault(); setError(""); setBusy(true); try { const user = mode === "register" ? await register(form.name, form.email, form.password) : await login(form.email, form.password); navigate(user.role === "admin" ? "/admin/dashboard" : "/", { replace: true }); } catch (e) { setError(e.response?.data?.message || "Unable to authenticate."); } finally { setBusy(false); } };
  return <div className="auth-wrap"><form className="auth-card" onSubmit={submit}><span className="eyebrow">WELCOME TO VASTRAM</span><h1>{mode === "register" ? "Create your account" : "Sign in to continue"}</h1><p className="muted">{mode === "register" ? "Join us and discover your style." : "Enter your details to access your account."}</p>{error && <Notice message={error} type="error" />}
    {mode === "register" && <label>Full name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoComplete="name" /></label>}
    <label>Email address<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} autoComplete="email" /></label>
    <label>Password<input required minLength="8" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} autoComplete={mode === "register" ? "new-password" : "current-password"} /></label>
    <button className="button full" disabled={busy}>{busy ? "Please wait…" : mode === "register" ? "Create account" : "Login"}</button>
    <p className="auth-switch">{mode === "register" ? "Already have an account?" : "New to Vastram?"} <a href={mode === "register" ? "/login" : "/register"}>{mode === "register" ? "Login" : "Register"}</a></p>
  </form></div>;
}

function CartPage() {
  const { cart, update, remove, total, clear } = useCart(); const { user } = useAuth(); const navigate = useNavigate();
  const [address, setAddress] = useState({ fullName: user?.name || "", phone: user?.phone || "", line1: "", line2: "", city: "", state: "", postalCode: "" });
  const [payment, setPayment] = useState("COD"); const [coupon, setCoupon] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const checkout = async e => {
    e.preventDefault(); setMessage(""); setBusy(true);
    let onlineOrderId = "";
    let verificationStarted = false;
    let releaseRequested = false;
    const releasePendingOrder = async reason => {
      if (!onlineOrderId || releaseRequested) return;
      releaseRequested = true;
      try {
        await api.patch(`/orders/${onlineOrderId}/cancel`, { reason });
        setMessage("Payment was not completed. Your order was cancelled and reserved stock released.");
      } catch (err) {
        setMessage(err.response?.data?.message || "Payment status could not be confirmed. Check My Orders before retrying.");
      }
    };
    try {
      if (!cart.length) throw new Error("Your cart is empty.");
      const { data } = await api.post("/orders", { items: cart.map(x => ({ productId: x.productId, size: x.size, quantity: x.quantity })), shippingAddress: address, paymentMethod: payment, couponCode: coupon || undefined });
      if (payment === "COD") { clear(); navigate("/account?placed=1"); return; }
      onlineOrderId = data.order._id;
      const { data: rp } = await api.post("/payments/razorpay/order", { orderId: data.order._id });
      if (!window.Razorpay) await loadRazorpay();
      const checkout = new window.Razorpay({
        key: rp.key, amount: rp.amount, currency: rp.currency, name: "Vastram", description: `Order ${data.order.orderNumber}`, order_id: rp.id,
        prefill: { name: address.fullName, contact: address.phone, email: user.email },
        handler: async response => {
          verificationStarted = true;
          try { await api.post("/payments/razorpay/verify", { orderId: data.order._id, ...response }); clear(); navigate("/account?placed=1"); }
          catch (err) { setMessage(err.response?.data?.message || "Payment verification failed. Contact the shop before retrying."); }
        },
        modal: { ondismiss: () => { if (!verificationStarted) releasePendingOrder("Payment window closed before payment completed."); } }
      });
      checkout.on("payment.failed", function (response) {
        console.error("Razorpay Payment Failed:", response.error);
        releasePendingOrder(response.error?.description || "Payment failed.");
      });

      checkout.open();
    } catch (e) {
      if (onlineOrderId && !verificationStarted) await releasePendingOrder(e.response?.data?.message || e.message || "Checkout failed.");
      else setMessage(e.response?.data?.message || e.message || "Checkout failed.");
    }
    finally { setBusy(false); }
  };
  return <div className="page narrow"><PageTitle title="Your cart" subtitle="Review your items and complete checkout." />
    {!cart.length ? <div className="empty"><ShoppingBag size={34} /><h3>Your cart is empty</h3><a className="button" href="/">Explore products</a></div> : <>
      <div className="cart-list">{cart.map(item => <div className="cart-item" key={item.key}><img src={item.image || imageFallback} alt={item.name} onError={e => e.currentTarget.src = imageFallback} /><div className="cart-item-info"><strong>{item.name}</strong><span>{item.gender}{orderItemRequiresSize(item) && ` · Size ${item.size}`}</span><small>{item.stock > 0 ? `${item.stock} available` : "Stock will be checked at checkout"}</small><b>{money(item.price)}</b><div className="inline-controls"><input aria-label="Quantity" type="number" min="1" max={Math.min(20, item.stock || 20)} value={item.quantity} onChange={e => update(item.key, e.target.value)} /><button className="text-button danger-text" onClick={() => remove(item.key)}>Remove</button></div></div><strong>{money(item.price * item.quantity)}</strong></div>)}</div>
      <form className="checkout-card" onSubmit={checkout}><h2>Delivery address</h2><div className="form-grid"><label>Full name<input required value={address.fullName} onChange={e => setAddress({ ...address, fullName: e.target.value })} /></label><label>Phone<input required value={address.phone} onChange={e => setAddress({ ...address, phone: e.target.value })} /></label><label className="span-2">Address line 1<input required value={address.line1} onChange={e => setAddress({ ...address, line1: e.target.value })} /></label><label className="span-2">Address line 2 (optional)<input value={address.line2} onChange={e => setAddress({ ...address, line2: e.target.value })} /></label><label>City<input required value={address.city} onChange={e => setAddress({ ...address, city: e.target.value })} /></label><label>State<input required value={address.state} onChange={e => setAddress({ ...address, state: e.target.value })} /></label><label>PIN code<input required inputMode="numeric" value={address.postalCode} onChange={e => setAddress({ ...address, postalCode: e.target.value })} /></label></div>
        <h2>Payment method</h2><div className="payment-options"><label><input type="radio" checked={payment === "COD"} onChange={() => setPayment("COD")} /> Cash on Delivery</label><label><input type="radio" checked={payment === "RAZORPAY"} onChange={() => setPayment("RAZORPAY")} /> Online payment (Razorpay)</label></div>
        <label>Coupon code (optional)<input value={coupon} onChange={e => setCoupon(e.target.value.toUpperCase())} placeholder="Enter coupon code" /></label>
        {message && <Notice message={message} type="error" />}
        <div className="checkout-total"><span>Estimated total (discount validated by server)</span><strong>{money(total)}</strong></div>
        <button className="button full" disabled={busy}>{busy ? "Processing…" : `Place order · ${money(total)}`}</button>
      </form>
    </>}
  </div>;
}
async function loadRazorpay() {
  await new Promise((resolve, reject) => { const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js"; script.onload = resolve; script.onerror = () => reject(new Error("Could not load Razorpay checkout.")); document.body.appendChild(script); });
}
function AccountPage() {
  const { user, setUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState({ name: user?.name || "", phone: user?.phone || "" });
  const [notice, setNotice] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const reload = async () => {
    try {
      const [o, m] = await Promise.all([api.get("/orders/mine"), api.get("/messages/mine")]);
      setOrders(o.data);
      setMessages(m.data);
    } catch (e) {
      setError(e.response?.data?.message || "Unable to load account.");
    }
  };

  useEffect(() => { reload(); }, []);

  const totalPages = Math.ceil(orders.length / pageSize);
  const paginatedOrders = orders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(page => Math.min(page, Math.max(1, totalPages)));
  }, [totalPages]);

  const cancel = async id => {
    if (!confirm("Cancel this order?")) return;
    try {
      await api.patch(`/orders/${id}/cancel`, { reason: "Cancelled by customer" });
      setNotice("Order cancelled.");
      reload();
    } catch (e) {
      setError(e.response?.data?.message || "Cancellation failed.");
    }
  };

  const saveProfile = async e => {
    e.preventDefault();
    try {
      const { data } = await api.patch("/auth/profile", profile);
      setUser(data.user);
      localStorage.setItem("vastram_user", JSON.stringify(data.user));
      setNotice("Profile updated.");
    } catch (e) {
      setError(e.response?.data?.message || "Could not update profile.");
    }
  };

  return <div className="page">
    <PageTitle title={`Hello, ${user?.name || "there"}`} subtitle="Manage your profile and orders." />
    {notice && <Notice message={notice} type="success" />}
    {error && <Notice message={error} type="error" />}

    <div className="account-grid">
      <form className="panel" onSubmit={saveProfile}>
        <h2>My profile</h2>
        <label>Name<input required value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} /></label>
        <label>Email<input value={user?.email || ""} disabled /></label>
        <label>Phone<input value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} /></label>
        <button className="button">Save profile</button>
      </form>
      <section className="panel">
        <h2>Delivery messages</h2>
        {messages.length ? messages.map(m => <div className="message-card" key={m._id}><strong>{m.title}</strong><p>{m.message}</p><small>{m.order?.orderNumber || ""} · {new Date(m.createdAt).toLocaleString()}</small></div>) : <p className="muted">No messages yet.</p>}
      </section>
    </div>

    <section className="panel orders-panel">
      <h2>My orders</h2>
      {orders.length ? <>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {paginatedOrders.map(o => <tr key={o._id}>
                <td>{o.orderNumber}</td>
                <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                <td>{o.items.map(i => `${i.name}${i.subcategory ? ` · ${i.subcategory}` : ""}${orderItemRequiresSize(i) ? ` (${i.size})` : ""} ×${i.quantity}`).join(", ")}</td>
                <td>{money(o.total)}</td>
                <td>{o.paymentMethod}<br /><small>{o.paymentStatus}</small></td>
                <td><span className={`status ${o.status.toLowerCase().replaceAll(" ", "-")}`}>{o.status}</span>{o.deliveryMessage && <small className="table-subtext">{o.deliveryMessage}</small>}</td>
                <td>{["Pending", "Confirmed", "Processing"].includes(o.status) ? <button className="text-button danger-text" onClick={() => cancel(o._id)}>Cancel</button> : "—"}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} totalItems={orders.length} pageSize={pageSize} onPageChange={setCurrentPage} />
      </> : <p className="muted">You have not placed any orders yet.</p>}
    </section>
  </div>;
}

function AdminDashboard() {
  const { data, loading, error } = useLoad("/admin/dashboard");
  return <div><PageTitle title="Dashboard" subtitle="Your store at a glance." />
    {error && <Notice message={error} type="error" />}
    <div className="stats-grid">{[[Package, "Active products", data.products || 0], [ShoppingBag, "Total orders", data.orders || 0], [Users, "Customers", data.customers || 0], [IndianRupee, "Paid revenue", money(data.revenue || 0)], [Warehouse, "Out of stock", data.lowStock || 0]].map(([Icon, label, value]) => <div className="stat-card" key={label}><span className="stat-icon"><Icon size={20} /></span><span>{label}</span><strong>{loading ? "…" : value}</strong></div>)}</div>
    <section className="panel"><h2>Recent orders</h2>{data.recentOrders?.length ? <div className="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead><tbody>{data.recentOrders.map(o => <tr key={o._id}><td>{o.orderNumber}</td><td>{o.customer?.name || "Customer"}</td><td>{money(o.total)}</td><td><span className="status">{o.status}</span></td></tr>)}</tbody></table></div> : <p className="muted">New orders will appear here.</p>}</section>
  </div>;
}
function AdminProducts() {
  const { data, loading, error, reload } = useLoad("/products/admin/all");
  const { data: cats } = useLoad("/categories/admin/all");
  const blank = { name: "", description: "", gender: "Women", category: "", subcategory: "", price: "", compareAtPrice: "", images: [], sizes: "S:0,M:0,L:0", stock: "0", featured: false };
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [modal, setModal] = useState(false);
  const [notice, setNotice] = useState("");
  const [selectedImages, setSelectedImages] = useState([]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const clearSelectedImages = () => setSelectedImages(current => { current.forEach(image => URL.revokeObjectURL(image.preview)); return []; });
  const closeModal = () => { clearSelectedImages(); setModal(false); };
  const openNew = () => { clearSelectedImages(); setEditing(null); setForm({ ...blank, category: cats.find(c => c.gender === "Women")?._id || "" }); setModal(true); };
  const edit = p => { clearSelectedImages(); setEditing(p._id); setForm({ name: p.name, description: p.description || "", gender: p.gender, category: p.category?._id || p.category, subcategory: p.subcategory || "", price: p.price, compareAtPrice: p.compareAtPrice || "", images: p.images || [], sizes: (p.sizes || []).map(s => `${s.size}:${s.stock}`).join(","), stock: String((p.sizes || []).reduce((total, size) => total + size.stock, 0)), featured: p.featured || false }); setModal(true); };
  const selectImages = event => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (selectedImages.length + files.length > 10) return setNotice("Could not select more than 10 new images at a time.");
    if (form.images.length + selectedImages.length + files.length > 30) return setNotice("Could not add more than 30 images to a product.");
    setNotice("");
    setSelectedImages(current => [...current, ...files.map(file => ({ file, preview: URL.createObjectURL(file) }))]);
  };
  const removeSelectedImage = index => setSelectedImages(current => current.filter((image, imageIndex) => {
    if (imageIndex !== index) return true;
    URL.revokeObjectURL(image.preview);
    return false;
  }));
  const save = async e => {
    e.preventDefault(); setNotice(""); setSaving(true);
    const sizeFree = !categoryRequiresSize(cats.find(category => category._id === form.category));
    const sizes = sizeFree ? [{ size: "One Size", stock: Number(form.stock) || 0 }] : form.sizes.split(",").map(x => { const [size, stock] = x.split(":"); return { size: size?.trim(), stock: Number(stock || 0) }; }).filter(x => x.size);
    try {
      let images = [...form.images];
      if (selectedImages.length) {
        const upload = new FormData();
        selectedImages.forEach(image => upload.append("images", image.file));
        const { data: uploaded } = await api.post("/products/images", upload);
        images = [...images, ...uploaded.images];
        setForm(current => ({ ...current, images }));
        clearSelectedImages();
      }
      const body = { ...form, price: Number(form.price), compareAtPrice: Number(form.compareAtPrice || 0), images, sizes };
      delete body.stock;
      if (editing) await api.put(`/products/${editing}`, body); else await api.post("/products", body);
      closeModal(); setNotice(editing ? "Product updated." : "Product added."); reload();
    } catch (e) {
      setNotice(`Could not save product: ${e.response?.data?.message || "Please review the product details."}`);
    } finally { setSaving(false); }
  };
  const remove = async id => { if (!confirm("Remove this product from the storefront? Historical order details will be preserved.")) return; try { await api.delete(`/products/${id}`); setNotice("Product removed from storefront."); reload(); } catch (e) { setNotice(e.response?.data?.message || "Could not remove product."); } };
  const filtered = data.filter(p => `${p.name} ${p.gender} ${p.categoryName} ${p.subcategory || ""}`.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedProducts = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(page => Math.min(page, Math.max(1, totalPages)));
  }, [totalPages]);

  return <div><PageTitle title="Product Management" subtitle="Add and manage clothing products." action={<button className="button" onClick={openNew}><Plus size={17} /> Add product</button>} />{notice && <Notice message={notice} type={notice.startsWith("Could") ? "error" : "success"} />}{error && <Notice message={error} type="error" />}
    <div className="toolbar"><div className="search-box"><Search size={17} /><input placeholder="Search products…" value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} /></div><span className="muted">{filtered.length} products</span></div>
    {loading ? <p>Loading…</p> : <><div className="table-wrap panel"><table><thead><tr><th>Product</th><th>Gender / Category</th><th>Price</th><th>Sizes & stock</th><th>Actions</th></tr></thead><tbody>{paginatedProducts.map(p => <tr key={p._id}><td><div className="table-product"><img src={p.images?.[0] || imageFallback} onError={e => e.currentTarget.src = imageFallback} alt={p.name} /><div><strong>{p.name}</strong><small>{p.isActive ? "Active" : "Archived"}</small></div></div></td><td>{p.gender} / {p.categoryName}{p.subcategory && ` / ${p.subcategory}`}</td><td>{money(p.price)}</td><td>{!productRequiresSize(p) ? `Stock: ${(p.sizes || []).reduce((total, size) => total + size.stock, 0)}` : (p.sizes || []).map(s => `${s.size}: ${s.stock}`).join(" · ")}</td><td><div className="action-row"><button className="icon-button" title="Edit" onClick={() => edit(p)}><Pencil size={16} /></button><button className="icon-button danger" title="Remove" onClick={() => remove(p._id)}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div><Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={pageSize} onPageChange={setCurrentPage} /></>}
    {modal && <Modal title={editing ? "Edit product" : "Add product"} onClose={closeModal}><form onSubmit={save} className="form-grid">
      <label>Product name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label>Gender<select value={form.gender} onChange={e => { const gender = e.target.value; setForm({ ...form, gender, category: cats.find(c => c.gender === gender)?._id || "", subcategory: "" }); }}>{["Women", "Men"].map(x => <option key={x}>{x}</option>)}</select></label>
      <label>Category<select required value={form.category} onChange={e => { const nextCategory = cats.find(category => category._id === e.target.value); setForm(current => ({ ...current, category: e.target.value, subcategory: "", stock: !categoryRequiresSize(nextCategory) ? String(stockFromSizeText(current.sizes)) : current.stock })); }}><option value="">Select category</option>{cats.filter(c => c.gender === form.gender).map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select></label>
      {cats.find(category => category._id === form.category)?.subcategories?.length > 0 && <label>Subcategory<select value={form.subcategory} onChange={e => setForm(current => ({ ...current, subcategory: e.target.value }))}><option value="">None</option>{cats.find(category => category._id === form.category).subcategories.map(subcategory => <option key={subcategory}>{subcategory}</option>)}</select></label>}
      <label>Price (INR)<input required min="0" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></label>
      <label>Compare-at price<input min="0" type="number" value={form.compareAtPrice} onChange={e => setForm({ ...form, compareAtPrice: e.target.value })} /></label>
      <label className="span-2">Upload product images<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={selectImages} /><small>JPG, PNG, or WebP; up to 10 files per save, 5 MB each.</small></label>
      {(form.images.length > 0 || selectedImages.length > 0) && <div className="image-upload-grid span-2">{form.images.map((image, index) => <div className="image-upload-card" key={`${image}-${index}`}><img src={image} alt={`Product image ${index + 1}`} onError={e => { e.currentTarget.src = imageFallback; }} /><button type="button" className="icon-button danger" aria-label="Remove image" onClick={() => setForm(current => ({ ...current, images: current.images.filter((_, imageIndex) => imageIndex !== index) }))}><X size={15} /></button></div>)}{selectedImages.map((image, index) => <div className="image-upload-card" key={image.preview}><img src={image.preview} alt={image.file.name} /><button type="button" className="icon-button danger" aria-label="Remove selected image" onClick={() => removeSelectedImage(index)}><X size={15} /></button></div>)}</div>}
      {!categoryRequiresSize(cats.find(category => category._id === form.category)) ? <label>Stock quantity<input required min="0" type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} /></label> : <label className="span-2">Sizes and stock (comma separated, SIZE:QTY)<input required value={form.sizes} onChange={e => setForm({ ...form, sizes: e.target.value })} placeholder="S:5,M:10,L:8 or 30:5,32:8" /></label>}
      <label className="span-2">Description<textarea rows="3" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
      <label className="checkbox-label span-2"><input type="checkbox" checked={form.featured} onChange={e => setForm({ ...form, featured: e.target.checked })} /> Featured product</label>
      <div className="form-actions span-2"><button type="button" className="button secondary" disabled={saving} onClick={closeModal}>Cancel</button><button className="button" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Add product"}</button></div>
    </form></Modal>}
  </div>;
}
function Modal({ title, children, onClose }) { return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section className="modal"><div className="modal-head"><h2>{title}</h2><button className="icon-button" onClick={onClose}><X /></button></div>{children}</section></div>; }


function AdminCategories() {
  const { data, loading, error, reload } = useLoad("/categories/admin/all");
  const blank = { name: "", gender: "Women", requiresSize: true, subcategories: "" };
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(data.length / pageSize);
  const paginatedCategories = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => { setCurrentPage(page => Math.min(page, Math.max(1, totalPages))); }, [totalPages]);

  const save = async e => { e.preventDefault(); const payload = { ...form, subcategories: form.subcategories.split(",").map(value => value.trim()).filter(Boolean) }; try { if (editing) await api.put(`/categories/${editing}`, payload); else await api.post("/categories", payload); setForm(blank); setEditing(null); setNotice({ message: "Category saved.", type: "success" }); setCurrentPage(1); reload(); } catch (e) { setNotice({ message: e.response?.data?.message || "Could not save category.", type: "error" }); } };
  const remove = async id => { if (!confirm("Delete this category?")) return; try { await api.delete(`/categories/${id}`); setNotice({ message: "Category deleted.", type: "success" }); reload(); } catch (e) { setNotice({ message: e.response?.data?.message || "Could not delete category.", type: "error" }); } };
  return <div><PageTitle title="Categories" subtitle="Organize products for Men and Women." />{notice && <Notice message={notice.message} type={notice.type} />}{error && <Notice message={error} type="error" />}
    <form className="panel inline-form" onSubmit={save}><label>Category name<input required value={form.name} onChange={e => setForm(current => ({ ...current, name: e.target.value, requiresSize: editing ? current.requiresSize : !isSizeFreeCategory(e.target.value) }))} placeholder="e.g. Sarees" /></label><label>Gender<select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}><option>Women</option><option>Men</option></select></label><label>Subcategories (comma separated)<input value={form.subcategories} onChange={e => setForm(current => ({ ...current, subcategories: e.target.value }))} placeholder="e.g. Kurtis, Tops, Dresses" /></label><label className="checkbox-label"><input type="checkbox" checked={form.requiresSize} onChange={e => setForm({ ...form, requiresSize: e.target.checked })} /> Requires size selection</label><button className="button">{editing ? "Update category" : "Add category"}</button>{editing && <button type="button" className="button secondary" onClick={() => { setEditing(null); setForm(blank); }}>Cancel</button>}</form>
    <div className="table-wrap panel"><table><thead><tr><th>Name</th><th>Gender</th><th>Subcategories</th><th>Size selection</th><th>Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan="5">Loading…</td></tr> : paginatedCategories.map(c => <tr key={c._id}><td>{c.name}</td><td>{c.gender}</td><td>{(c.subcategories || []).join(", ") || "—"}</td><td>{categoryRequiresSize(c) ? "Required" : "Not required"}</td><td><div className="action-row"><button className="icon-button" onClick={() => { setEditing(c._id); setForm({ name: c.name, gender: c.gender, requiresSize: categoryRequiresSize(c), subcategories: (c.subcategories || []).join(", ") }); }}><Pencil size={16} /></button><button className="icon-button danger" onClick={() => remove(c._id)}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>
    {!loading && <Pagination currentPage={currentPage} totalItems={data.length} pageSize={pageSize} onPageChange={setCurrentPage} />}
  </div>;
}


function AdminOrders() {
  const { data, loading, error, reload } = useLoad("/orders/admin/all");
  const [notice, setNotice] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(data.length / pageSize);
  const paginatedOrders = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => { setCurrentPage(page => Math.min(page, Math.max(1, totalPages))); }, [totalPages]);
  const update = async (o, status) => { try { await api.patch(`/orders/${o._id}/status`, { status }); setNotice(`Order ${o.orderNumber} updated.`); reload(); } catch (e) { setNotice(e.response?.data?.message || "Could not update order."); } };
  const cancel = async o => { if (!confirm("Cancel this order?")) return; try { await api.patch(`/orders/${o._id}/cancel`, { reason: "Cancelled by admin" }); setNotice("Order cancelled."); reload(); } catch (e) { setNotice(e.response?.data?.message || "Could not cancel order."); } };
  return <div><PageTitle title="Order Management" subtitle="Review orders and update fulfilment status." />{notice && <Notice message={notice} type={notice.startsWith("Could") ? "error" : "success"} />}{error && <Notice message={error} type="error" />}
    <div className="table-wrap panel"><table><thead><tr><th>Order</th><th>Customer</th><th>Items / Address</th><th>Total / Payment</th><th>Status</th><th>Update</th></tr></thead><tbody>{loading ? <tr><td colSpan="6">Loading…</td></tr> : paginatedOrders.map(o => <tr key={o._id}><td><strong>{o.orderNumber}</strong><small>{new Date(o.createdAt).toLocaleString()}</small></td><td>{o.customer?.name}<small>{o.customer?.email}</small></td><td>{o.items.map(i => `${i.name}${i.subcategory ? ` · ${i.subcategory}` : ""}${orderItemRequiresSize(i) ? ` (${i.size})` : ""} ×${i.quantity}`).join(", ")}<small>{o.shippingAddress?.fullName}, {o.shippingAddress?.line1}, {o.shippingAddress?.city}, {o.shippingAddress?.postalCode}</small></td><td>{money(o.total)}<small>{o.paymentMethod} · {o.paymentStatus}</small></td><td><span className="status">{o.status}</span></td><td>{o.status !== "Cancelled" && o.status !== "Delivered" ? <><select value={o.status} onChange={e => update(o, e.target.value)}>{["Pending", "Confirmed", "Processing", "Packed", "Shipped", "Out for Delivery", "Delivered"].map(s => <option key={s}>{s}</option>)}</select><button className="text-button danger-text" onClick={() => cancel(o)}>Cancel</button></> : "—"}</td></tr>)}</tbody></table></div>
    {!loading && <Pagination currentPage={currentPage} totalItems={data.length} pageSize={pageSize} onPageChange={setCurrentPage} />}
  </div>;
}


function AdminInventory() {
  const { data, loading, error, reload } = useLoad("/products/admin/all");
  const [notice, setNotice] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const inventoryRows = data.filter(p => p.isActive).flatMap(p => !productRequiresSize(p)
    ? [{ product: p, size: { size: "One Size", stock: (p.sizes || []).reduce((total, item) => total + item.stock, 0) }, key: `${p._id}-stock` }]
    : (p.sizes || []).map(s => ({ product: p, size: s, key: `${p._id}-${s.size}` })));
  const totalPages = Math.ceil(inventoryRows.length / pageSize);
  const paginatedRows = inventoryRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => { setCurrentPage(page => Math.min(page, Math.max(1, totalPages))); }, [totalPages]);
  const update = async (p, size, stock) => { const sizes = !productRequiresSize(p) ? [{ size: "One Size", stock: Number(stock) }] : p.sizes.map(s => s.size === size ? { ...s, stock: Number(stock) } : s); try { await api.put(`/products/${p._id}`, { sizes }); setNotice({ message: "Stock updated.", type: "success" }); reload(); } catch (e) { setNotice({ message: e.response?.data?.message || "Could not update stock.", type: "error" }); } };
  return <div><PageTitle title="Inventory / Stock" subtitle="Update stock by product size or item." />{notice && <Notice message={notice.message} type={notice.type} />}{error && <Notice message={error} type="error" />}
    <div className="table-wrap panel"><table><thead><tr><th>Product</th><th>Gender</th><th>Size / unit</th><th>Available stock</th><th>Save</th></tr></thead><tbody>{loading ? <tr><td colSpan="5">Loading…</td></tr> : paginatedRows.map(row => <InventoryRow key={row.key} product={row.product} size={row.size} onSave={update} />)}</tbody></table></div>
    {!loading && <Pagination currentPage={currentPage} totalItems={inventoryRows.length} pageSize={pageSize} onPageChange={setCurrentPage} />}
  </div>;
}

function InventoryRow({ product, size, onSave }) { const [stock, setStock] = useState(size.stock); useEffect(() => setStock(size.stock), [size.stock]); return <tr><td>{product.name}</td><td>{product.gender}</td><td>{productRequiresSize(product) ? size.size : "—"}</td><td><input className="stock-input" type="number" min="0" value={stock} onChange={e => setStock(e.target.value)} /></td><td><button className="button small" onClick={() => onSave(product, size.size, stock)}>Update</button></td></tr>; }


function AdminCustomers() {
  const { data, loading, error } = useLoad("/admin/customers");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(data.length / pageSize);
  const paginatedCustomers = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => { setCurrentPage(page => Math.min(page, Math.max(1, totalPages))); }, [totalPages]);
  return <div><PageTitle title="Customers" subtitle="Customer account list and contact information." />{error && <Notice message={error} type="error" />}<div className="table-wrap panel"><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th></tr></thead><tbody>{loading ? <tr><td colSpan="4">Loading…</td></tr> : paginatedCustomers.map(u => <tr key={u._id}><td>{u.name}</td><td>{u.email}</td><td>{u.phone || "—"}</td><td>{new Date(u.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></div>{!loading && <Pagination currentPage={currentPage} totalItems={data.length} pageSize={pageSize} onPageChange={setCurrentPage} />}</div>;
}


function AdminPayments() {
  const { data, loading, error } = useLoad("/orders/admin/all");
  const rows = data.filter(o => o.paymentMethod === "RAZORPAY" || o.paymentStatus !== "Pending");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(rows.length / pageSize);
  const paginatedPayments = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => { setCurrentPage(page => Math.min(page, Math.max(1, totalPages))); }, [totalPages]);
  return <div><PageTitle title="Payments" subtitle="View payment method, amount and payment status." /><p className="notice info">Refunds are not automatically issued in this MVP. Prepaid cancellations are marked Refund Pending and must be processed in the payment provider dashboard or via a future refund API.</p>{error && <Notice message={error} type="error" />}<div className="table-wrap panel"><table><thead><tr><th>Order</th><th>Customer</th><th>Method</th><th>Amount</th><th>Status</th><th>Transaction ID</th></tr></thead><tbody>{loading ? <tr><td colSpan="6">Loading…</td></tr> : paginatedPayments.map(o => <tr key={o._id}><td>{o.orderNumber}</td><td>{o.customer?.name}</td><td>{o.paymentMethod}</td><td>{money(o.total)}</td><td>{o.paymentStatus}</td><td>{o.paymentId || o.paymentOrderId || "—"}</td></tr>)}</tbody></table></div>{!loading && <Pagination currentPage={currentPage} totalItems={rows.length} pageSize={pageSize} onPageChange={setCurrentPage} />}</div>;
}

function AdminMessages() {
  const { data, loading, error, reload } = useLoad("/messages/admin/all");
  const { data: orders } = useLoad("/orders/admin/all");
  const [form, setForm] = useState({ orderId: "", title: "Delivery update", message: "Your order has been packed and is now on its way. It is expected to arrive by the scheduled delivery time." });
  const [notice, setNotice] = useState("");
  const send = async e => { e.preventDefault(); try { await api.post("/messages", form); setNotice("Delivery message saved and shown in the customer account."); reload(); } catch (e) { setNotice(e.response?.data?.message || "Could not save message."); } };
  const remove = async id => { if (!confirm("Delete this message?")) return; try { await api.delete(`/messages/${id}`); reload(); } catch (e) { setNotice(e.response?.data?.message || "Could not delete message."); } };
  return <div><PageTitle title="Delivery Messages" subtitle="Send professional delivery updates in the customer account." />{notice && <Notice message={notice} type={notice.includes("Could") ? "error" : "success"} />}{error && <Notice message={error} type="error" />}
    <form className="panel form-stack" onSubmit={send}><h2>Create message</h2><label>Order<select required value={form.orderId} onChange={e => setForm({ ...form, orderId: e.target.value })}><option value="">Select order</option>{orders.filter(o => o.status !== "Cancelled").map(o => <option key={o._id} value={o._id}>{o.orderNumber} — {o.customer?.name}</option>)}</select></label><label>Title<input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label><label>Message<textarea rows="3" required value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} /></label><button className="button">Save delivery message</button></form>
    <section className="panel"><h2>Sent messages</h2>{loading ? "Loading…" : data.map(m => <div className="message-card" key={m._id}><div className="split"><strong>{m.title}</strong><button className="text-button danger-text" onClick={() => remove(m._id)}>Delete</button></div><p>{m.message}</p><small>{m.order?.orderNumber} · {m.customer?.name} · {new Date(m.createdAt).toLocaleString()}</small></div>)}</section>
  </div>;
}

function AdminCoupons() {
  const { data, loading, error, reload } = useLoad("/coupons/admin/all");
  const blank = { code: "", type: "percentage", value: "10", minOrderAmount: "0", maxDiscount: "0", expiresAt: "", isActive: true };
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(data.length / pageSize);
  const paginatedCoupons = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => { setCurrentPage(page => Math.min(page, Math.max(1, totalPages))); }, [totalPages]);
  const save = async e => { e.preventDefault(); const body = { ...form, value: Number(form.value), minOrderAmount: Number(form.minOrderAmount), maxDiscount: Number(form.maxDiscount), expiresAt: form.expiresAt || null }; try { if (editing) await api.put(`/coupons/${editing}`, body); else await api.post("/coupons", body); setForm(blank); setEditing(null); setNotice("Coupon saved."); setCurrentPage(1); reload(); } catch (e) { setNotice(e.response?.data?.message || "Could not save coupon."); } };
  const remove = async id => { if (!confirm("Delete coupon?")) return; try { await api.delete(`/coupons/${id}`); reload(); } catch (e) { setNotice(e.response?.data?.message || "Could not delete coupon."); } };
  return <div><PageTitle title="Coupons & Offers" subtitle="Create discount codes for customers." />{notice && <Notice message={notice} type={notice.includes("Could") ? "error" : "success"} />}{error && <Notice message={error} type="error" />}
    <form className="panel form-grid" onSubmit={save}><label>Code<input required value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} /></label><label>Discount type<select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="percentage">Percentage</option><option value="fixed">Fixed amount (₹)</option></select></label><label>Value<input required type="number" min="0.01" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} /></label><label>Minimum order (₹)<input type="number" min="0" value={form.minOrderAmount} onChange={e => setForm({ ...form, minOrderAmount: e.target.value })} /></label><label>Maximum discount (₹, 0 = no cap)<input type="number" min="0" value={form.maxDiscount} onChange={e => setForm({ ...form, maxDiscount: e.target.value })} /></label><label>Expiry date<input type="date" value={form.expiresAt?.slice?.(0, 10) || ""} onChange={e => setForm({ ...form, expiresAt: e.target.value })} /></label><div className="form-actions span-2"><button className="button">{editing ? "Update coupon" : "Create coupon"}</button>{editing && <button type="button" className="button secondary" onClick={() => { setEditing(null); setForm(blank); }}>Cancel</button>}</div></form>
    <div className="table-wrap panel"><table><thead><tr><th>Code</th><th>Discount</th><th>Minimum</th><th>Expires</th><th>Status</th><th>Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan="6">Loading…</td></tr> : paginatedCoupons.map(c => <tr key={c._id}><td>{c.code}</td><td>{c.type === "percentage" ? `${c.value}%` : money(c.value)}</td><td>{money(c.minOrderAmount)}</td><td>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "No expiry"}</td><td>{c.isActive ? "Active" : "Inactive"}</td><td><div className="action-row"><button className="icon-button" onClick={() => { setEditing(c._id); setForm({ ...c, expiresAt: c.expiresAt?.slice(0, 10) || "" }); }}><Pencil size={16} /></button><button className="icon-button danger" onClick={() => remove(c._id)}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>
    {!loading && <Pagination currentPage={currentPage} totalItems={data.length} pageSize={pageSize} onPageChange={setCurrentPage} />}
  </div>;
}

function AdminReports() {
  const { data, loading, error } = useLoad("/orders/admin/all");
  const paid = data.filter(o => o.paymentStatus === "Paid");
  const csv = () => {
    const rows = [["Order", "Date", "Customer", "Total", "Payment Method", "Payment Status", "Order Status"], ...data.map(o => [o.orderNumber, new Date(o.createdAt).toISOString(), o.customer?.name || "", o.total, o.paymentMethod, o.paymentStatus, o.status])];
    const blob = new Blob([rows.map(r => r.map(v => `"${String(v ?? "").replaceAll('"', '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "vastram-orders-report.csv"; a.click(); URL.revokeObjectURL(a.href);
  };
  return <div><PageTitle title="Reports & Analytics" subtitle="Order summaries and downloadable CSV." action={<button className="button" onClick={csv}>Export orders CSV</button>} />{error && <Notice message={error} type="error" />}<div className="stats-grid"><div className="stat-card"><span>All orders</span><strong>{loading ? "…" : data.length}</strong></div><div className="stat-card"><span>Paid orders</span><strong>{loading ? "…" : paid.length}</strong></div><div className="stat-card"><span>Paid revenue</span><strong>{loading ? "…" : money(paid.reduce((s, o) => s + o.total, 0))}</strong></div></div><p className="muted">Revenue shown here is based on orders marked Paid. COD payment is marked paid by the admin when the order is marked Delivered.</p></div>;
}
function AdminHeroBanners() {
  const [images, setImages] = useState([]);
  const [selectedImages, setSelectedImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let active = true;
    api.get("/hero-banners").then(({ data }) => {
      if (active) setImages(data.images || []);
    }).catch(error => {
      if (active) setLoadError(error.response?.data?.message || "Could not load home banner settings.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const clearSelectedImages = () => setSelectedImages(current => {
    current.forEach(image => URL.revokeObjectURL(image.preview));
    return [];
  });
  const selectImages = event => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (images.length + selectedImages.length + files.length > 10) {
      setNotice({ message: "A maximum of 10 banner images is allowed.", type: "error" });
      return;
    }
    setNotice(null);
    setSelectedImages(current => [...current, ...files.map(file => ({ file, preview: URL.createObjectURL(file) }))]);
  };
  const removeSelectedImage = index => setSelectedImages(current => current.filter((image, imageIndex) => {
    if (imageIndex !== index) return true;
    URL.revokeObjectURL(image.preview);
    return false;
  }));
  const save = async () => {
    setSaving(true);
    setNotice(null);
    try {
      let nextImages = images;
      if (selectedImages.length) {
        const upload = new FormData();
        selectedImages.forEach(image => upload.append("images", image.file));
        const { data: uploaded } = await api.post("/products/images", upload);
        nextImages = [...images, ...uploaded.images];
        setImages(nextImages);
        clearSelectedImages();
      }
      const { data } = await api.put("/hero-banners", { images: nextImages });
      setImages(data.images);
      setNotice({ message: "Home banner updated.", type: "success" });
    } catch (error) {
      setNotice({ message: error.response?.data?.message || "Could not update the home banner.", type: "error" });
    } finally {
      setSaving(false);
    }
  };
  const removeImage = index => setImages(current => current.filter((_, imageIndex) => imageIndex !== index));
  const allImages = [
    ...images.map((src, index) => ({ src, key: `saved-${src}-${index}`, savedIndex: index })),
    ...selectedImages.map((image, index) => ({ src: image.preview, key: image.preview, selectedIndex: index }))
  ];

  return <div>
    <PageTitle title="Home Banners" subtitle="Upload and manage the images shown in the storefront hero." />
    {loadError && <Notice message={loadError} type="error" />}
    {notice && <Notice message={notice.message} type={notice.type} />}
    <section className="panel form-stack">
      <label>Upload banner images<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={loading || saving || Boolean(loadError)} onChange={selectImages} /><small>JPG, PNG, or WebP; up to 10 banner images, 5 MB each. Multiple images rotate automatically on the storefront.</small></label>
      {loading ? <p className="muted">Loading banner settings…</p> : allImages.length ? <div className="image-upload-grid hero-banner-upload-grid">{allImages.map(image => <div className="image-upload-card" key={image.key}><img src={image.src} alt="Home banner preview" onError={e => { e.currentTarget.src = imageFallback; }} /><button type="button" className="icon-button danger" disabled={saving} aria-label="Remove banner image" onClick={() => image.savedIndex !== undefined ? removeImage(image.savedIndex) : removeSelectedImage(image.selectedIndex)}><X size={15} /></button></div>)}</div> : <p className="muted">No banner images yet. The storefront will show its default hero artwork until you add one.</p>}
      {!loading && !loadError && <button className="button" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save banner images"}</button>}
    </section>
  </div>;
}
function AdminSettings() {
  const { user, setUser } = useAuth(); const [name, setName] = useState(user?.name || ""); const [phone, setPhone] = useState(user?.phone || ""); const [notice, setNotice] = useState("");
  const save = async e => { e.preventDefault(); try { const { data } = await api.patch("/auth/profile", { name, phone }); setUser(data.user); localStorage.setItem("vastram_user", JSON.stringify(data.user)); setNotice("Admin profile updated."); } catch (e) { setNotice(e.response?.data?.message || "Could not update profile."); } };
  return <div><PageTitle title="Settings" subtitle="Manage your admin profile." />{notice && <Notice message={notice} type={notice.includes("Could") ? "error" : "success"} />}<form className="panel form-stack" onSubmit={save}><label>Admin name<input required value={name} onChange={e => setName(e.target.value)} /></label><label>Email<input disabled value={user?.email || ""} /></label><label>Phone<input value={phone} onChange={e => setPhone(e.target.value)} /></label><button className="button">Save settings</button></form><p className="muted">Store branding, tax and shipping settings can be added when the business requirements are confirmed.</p></div>;
}

export default function App() {
  const { user } = useAuth();
  return <Layout><Routes>
    <Route path="/" element={user?.role === "admin" ? <Navigate to="/admin/dashboard" replace /> : <Home />} />
    <Route path="/products/:id" element={<ProductDetail />} />
    <Route path="/login" element={user ? <Navigate to={user.role === "admin" ? "/admin/dashboard" : "/"} replace /> : <AuthPage mode="login" />} />
    <Route path="/register" element={user ? <Navigate to={user.role === "admin" ? "/admin/dashboard" : "/"} replace /> : <AuthPage mode="register" />} />
    <Route path="/cart" element={<Protected><CartPage /></Protected>} />
    <Route path="/account" element={<Protected><AccountPage /></Protected>} />
    <Route path="/admin/dashboard" element={<AdminOnly><AdminDashboard /></AdminOnly>} />
    <Route path="/admin/products" element={<AdminOnly><AdminProducts /></AdminOnly>} />
    <Route path="/admin/categories" element={<AdminOnly><AdminCategories /></AdminOnly>} />
    <Route path="/admin/inventory" element={<AdminOnly><AdminInventory /></AdminOnly>} />
    <Route path="/admin/orders" element={<AdminOnly><AdminOrders /></AdminOnly>} />
    <Route path="/admin/payments" element={<AdminOnly><AdminPayments /></AdminOnly>} />
    <Route path="/admin/customers" element={<AdminOnly><AdminCustomers /></AdminOnly>} />
    <Route path="/admin/messages" element={<AdminOnly><AdminMessages /></AdminOnly>} />
    <Route path="/admin/coupons" element={<AdminOnly><AdminCoupons /></AdminOnly>} />
    <Route path="/admin/reports" element={<AdminOnly><AdminReports /></AdminOnly>} />
    <Route path="/admin/banners" element={<AdminOnly><AdminHeroBanners /></AdminOnly>} />
    <Route path="/admin/settings" element={<AdminOnly><AdminSettings /></AdminOnly>} />
    <Route path="/about" element={<AboutUs />} />
    <Route path="/contact" element={<ContactUs />} />
    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
    <Route path="/terms-and-conditions" element={<TermsConditions />} />
    <Route path="/shipping-policy" element={<ShippingPolicy />} />
    <Route path="/return-policy" element={<ReturnPolicy />} />
    <Route path="/refund-policy" element={<RefundPolicy />} />
    <Route path="*" element={<div className="page empty"><h2>Page not found</h2><a className="button" href="/">Return home</a></div>} />
  </Routes></Layout>;
}
