import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import api from "../api";
const CartContext = createContext(null);
function toCartItem(item) {
  const product = item.product || item;
  return { key: `${product._id}-${item.size}-${item.color || ""}`, productId: product._id, name: product.name, price: product.price, image: product.images?.[0] || "", gender: product.gender, size: item.size, color: item.color || "", quantity: item.quantity };
}
export function CartProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [cart, setCart] = useState(() => { try { return JSON.parse(localStorage.getItem("vastram_cart") || "[]"); } catch { return []; } });
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
      api.put("/cart", { items: items.map(x => ({ productId: x.productId, size: x.size, color: x.color, quantity: x.quantity })) }).catch(() => { });
    }
  };
  const add = (product, size, color) => {
    const key = `${product._id}-${size}-${color}`;
    const found = cart.find(x => x.key === key);
    const next = found ? cart.map(x => x.key === key ? { ...x, quantity: Math.min(20, x.quantity + 1) } : x)
      : [...cart, { key, productId: product._id, name: product.name, price: product.price, image: product.images?.[0] || "", gender: product.gender, size, color, quantity: 1 }];
    setCart(next); saveForUser(next);
  };
  const update = (key, quantity) => {
    const next = cart.map(x => x.key === key ? { ...x, quantity: Math.max(1, Math.min(20, Number(quantity) || 1)) } : x);
    setCart(next); saveForUser(next);
  };
  const remove = key => { const next = cart.filter(x => x.key !== key); setCart(next); saveForUser(next); };
  const clear = () => { setCart([]); saveForUser([]); };
  return <CartContext.Provider value={{ cart, add, update, remove, clear, count: cart.reduce((n, x) => n + x.quantity, 0), total: cart.reduce((n, x) => n + x.price * x.quantity, 0) }}>{children}</CartContext.Provider>;
}
export const useCart = () => useContext(CartContext);
