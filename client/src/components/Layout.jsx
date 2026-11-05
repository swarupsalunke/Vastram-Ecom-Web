import { Link, NavLink, useNavigate } from "react-router-dom";
import { ShoppingBag, UserRound, LogOut, LayoutDashboard, Package, Tags, Warehouse, ClipboardList, CreditCard, Users, MessageSquare, TicketPercent, BarChart3, Settings, Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

const adminLinks = [
  ["/admin/dashboard","Dashboard",LayoutDashboard],
  ["/admin/products","Product Management",Package],
  ["/admin/categories","Categories",Tags],
  ["/admin/inventory","Inventory / Stock",Warehouse],
  ["/admin/orders","Order Management",ClipboardList],
  ["/admin/payments","Payments",CreditCard],
  ["/admin/customers","Customers",Users],
  ["/admin/messages","Delivery Messages",MessageSquare],
  ["/admin/coupons","Coupons & Offers",TicketPercent],
  ["/admin/reports","Reports & Analytics",BarChart3],
  ["/admin/settings","Settings",Settings]
];
export default function Layout({ children }) {
  const { user, logout } = useAuth(); const { count } = useCart(); const [open, setOpen] = useState(false); const navigate = useNavigate();
  const admin = user?.role === "admin";
  const linkClass = ({ isActive }) => `nav-link ${isActive ? "active" : ""}`;
  const signOut = () => { logout(); navigate("/"); setOpen(false); };
  return <div className="app-shell">
    <header className="topbar">
      <button className="icon-button mobile-menu" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X/> : <Menu/>}</button>
      <Link to="/" className="brand">VASTRAM<span>.</span></Link>
      <nav className="top-actions">
        {!admin && <Link to="/cart" className="top-link"><ShoppingBag size={18}/> Cart ({count})</Link>}
        {user ? <>
          {admin ? <Link to="/admin/dashboard" className="top-link"><LayoutDashboard size={18}/> Admin</Link> : <Link to="/account" className="top-link"><UserRound size={18}/> My Account</Link>}
          <button className="top-link as-button" onClick={signOut}><LogOut size={17}/> Logout</button>
        </> : <><Link to="/login" className="top-link">Login</Link><Link to="/register" className="button small">Create account</Link></>}
      </nav>
    </header>
    {admin ? <div className="admin-layout">
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-label">ADMIN WORKSPACE</div>
        {adminLinks.map(([to, label, Icon]) => <NavLink key={to} to={to} className={linkClass} onClick={() => setOpen(false)}><Icon size={18}/><span>{label}</span></NavLink>)}
        <div className="sidebar-footer">Signed in as<br/><strong>{user.name}</strong></div>
      </aside>
      <main className="admin-main">{children}</main>
    </div> : <main className="store-main">{children}</main>}
    <footer className="footer"><span>© {new Date().getFullYear()} Vastram</span><span>Everyday style, made simple.</span></footer>
  </div>;
}
