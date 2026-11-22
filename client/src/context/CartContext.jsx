import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import api from "../api";
const CartContext = createContext(null);
function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem("vastram_cart") || "[]");
    const grouped = new Map();
    for (const item of Array.isArray(saved) ? saved : []) {
      if (!item.productId || !item.size) continue;
      const key = `${item.productId}-${item.size}`;
      const existing = grouped.get(key);
      const quantity = Math.min(20, Math.max(1, Number(item.quantity) || 1));
      if (existing) existing.quantity = Math.min(20, existing.quantity + quantity);
      else {
        const normalized = { ...item, key, quantity };
        delete normalized.color;
        grouped.set(key, normalized);
      }
    }
    return [...grouped.values()];
  } catch {
    return [];
  }
}
function toCartItem(item) {
  const product = item.product || item;
  const stock = product.sizes?.find(size => size.size === item.size)?.stock || 0;
  const requiresSize = product.requiresSize ?? product.category?.requiresSize ?? !/^sarees?$/i.test(String(product.categoryName || "").trim());
  return { key: `${product._id}-${item.size}`, productId: product._id, name: product.name, price: product.price, image: product.images?.[0] || "", gender: product.gender, categoryName: product.categoryName, requiresSize, size: item.size, stock, quantity: Math.min(item.quantity, stock) };
}
export function CartProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [cart, setCart] = useState(loadCart);
  const [serverLoadedFor, setServerLoadedFor] = useState("");
  useEffect(() => {
    if (authLoading) return;
    if (!user) { setServerLoadedFor("guest"); return; }
    let active = true;
    setServerLoadedFor("");
    api.get("/cart").then(({ data }) => {
      if (active) { setCart((data.items || []).map(toCartItem)); setServerLoadedFor(String(user.id)); }
    }).catch(() => { if (active) setServerLoadedFor(String(user.id)); });
    return () => { active = false; };
  }, [user?.id, authLoading]);
  useEffect(() => { localStorage.setItem("vastram_cart", JSON.stringify(cart)); }, [cart]);
  const saveForUser = (items) => {
    if (user && serverLoadedFor === String(user.id)) {
      api.put("/cart", { items: items.map(x => ({ productId: x.productId, size: x.size, quantity: x.quantity })) }).catch(() => { });
    }
  };
  const add = (product, size) => {
    const key = `${product._id}-${size}`;
    const found = cart.find(x => x.key === key);
    const stock = product.sizes?.find(item => item.size === size)?.stock || 0;
    const maxQuantity = Math.min(20, stock);
    if (maxQuantity < 1) return false;
    if (found?.quantity >= maxQuantity) {
      const synced = cart.map(item => item.key === key ? { ...item, stock, quantity: maxQuantity } : item);
      setCart(synced); saveForUser(synced); return false;
    }
    const next = found ? cart.map(x => x.key === key ? { ...x, stock, quantity: Math.min(maxQuantity, x.quantity + 1) } : x)
      : [...cart, { key, productId: product._id, name: product.name, price: product.price, image: product.images?.[0] || "", gender: product.gender, categoryName: product.categoryName, requiresSize: product.requiresSize ?? product.category?.requiresSize ?? !/^sarees?$/i.test(String(product.categoryName || "").trim()), size, stock, quantity: 1 }];
    setCart(next); saveForUser(next); return true;
  };
  const update = (key, quantity) => {
    const next = cart.map(x => x.key === key ? { ...x, quantity: Math.max(1, Math.min(20, x.stock > 0 ? x.stock : 20, Number(quantity) || 1)) } : x);
    setCart(next); saveForUser(next);
  };
  const remove = key => { const next = cart.filter(x => x.key !== key); setCart(next); saveForUser(next); };
  const clear = () => { setCart([]); saveForUser([]); };
  return <CartContext.Provider value={{ cart, add, update, remove, clear, count: cart.reduce((n, x) => n + x.quantity, 0), total: cart.reduce((n, x) => n + x.price * x.quantity, 0) }}>{children}</CartContext.Provider>;
}
export const useCart = () => useContext(CartContext);
