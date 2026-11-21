import { Link, NavLink, useNavigate } from "react-router-dom";
import { ShoppingBag, UserRound, LogOut, LayoutDashboard, Package, Tags, Warehouse, ClipboardList, CreditCard, Users, MessageSquare, TicketPercent, BarChart3, Settings, Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

const adminLinks = [
  ["/admin/dashboard", "Dashboard", LayoutDashboard],
  ["/admin/products", "Product Management", Package],
  ["/admin/categories", "Categories", Tags],
  ["/admin/inventory", "Inventory / Stock", Warehouse],
  ["/admin/orders", "Order Management", ClipboardList],
  ["/admin/payments", "Payments", CreditCard],
  ["/admin/customers", "Customers", Users],
  ["/admin/messages", "Delivery Messages", MessageSquare],
  ["/admin/coupons", "Coupons & Offers", TicketPercent],
  ["/admin/reports", "Reports & Analytics", BarChart3],
  ["/admin/settings", "Settings", Settings]
];
export default function Layout({ children }) {
  const { user, logout } = useAuth(); const { count } = useCart(); const [open, setOpen] = useState(false); const navigate = useNavigate();
  const admin = user?.role === "admin";
  const linkClass = ({ isActive }) => `nav-link ${isActive ? "active" : ""}`;
  const signOut = () => { logout(); navigate("/"); setOpen(false); };
  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="icon-button mobile-menu"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X /> : <Menu />}
        </button>

        <Link to="/" className="brand">
          VASTRAM<span>.</span>
        </Link>

        {/* Information Pages Navigation */}
        <nav className={`info-nav ${open ? "info-nav-open" : ""}`}>
          <Link to="/" onClick={() => setOpen(false)}>Home</Link>
          <Link to="/about" onClick={() => setOpen(false)}>About Us</Link>
          <Link to="/contact" onClick={() => setOpen(false)}>Contact Us</Link>
          <Link to="/privacy-policy" onClick={() => setOpen(false)}>Privacy Policy</Link>
          <Link to="/terms-and-conditions" onClick={() => setOpen(false)}>Terms & Conditions</Link>
          <Link to="/shipping-policy" onClick={() => setOpen(false)}>Shipping Policy</Link>
          <Link to="/return-policy" onClick={() => setOpen(false)}>Return Policy</Link>
          <Link to="/refund-policy" onClick={() => setOpen(false)}>Refund Policy</Link>
        </nav>

        <nav className="top-actions">
          {!admin && (
            <Link to="/cart" className="top-link">
              <ShoppingBag size={18} /> Cart ({count})
            </Link>
          )}

          {user ? (
            <>
              {admin ? (
                <Link to="/admin/dashboard" className="top-link">
                  <LayoutDashboard size={18} /> Admin
                </Link>
              ) : (
                <Link to="/account" className="top-link">
                  <UserRound size={18} /> My Account
                </Link>
              )}

              <button className="top-link as-button" onClick={signOut}>
                <LogOut size={17} /> Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="top-link">Login</Link>
              <Link to="/register" className="button small">Create account</Link>
            </>
          )}
        </nav>
      </header>

      {admin ? (
        <div className="admin-layout">
          <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
            <div className="sidebar-label">ADMIN WORKSPACE</div>

            {adminLinks.map(([to, label, Icon]) => (
              <NavLink
                key={to}
                to={to}
                className={linkClass}
                onClick={() => setOpen(false)}
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            ))}

            <div className="sidebar-footer">
              Signed in as
              <br />
              <strong>{user.name}</strong>
            </div>
          </aside>

          <main className="admin-main">{children}</main>
        </div>
      ) : (
        <main className="store-main">{children}</main>
      )}

      {admin ? (
        <footer className="admin-footer">
          <span>© {new Date().getFullYear()} Vastram</span>
          <span>Admin dashboard</span>
        </footer>
      ) : (
        <footer className="footer store-footer">
          <div className="store-footer-main">
            <div className="store-footer-brand">
              <Link to="/" className="store-footer-logo">VASTRAM<span>.</span></Link>
              <p>Thoughtful essentials for your everyday style.</p>
            </div>

            <div className="store-footer-group">
              <h2>Explore</h2>
              <Link to="/">Home</Link>
              <Link to="/about">About Us</Link>
              <Link to="/contact">Contact Us</Link>
            </div>

            <div className="store-footer-group">
              <h2>Customer Care</h2>
              <Link to="/shipping-policy">Shipping Policy</Link>
              <Link to="/return-policy">Return Policy</Link>
              <Link to="/refund-policy">Refund Policy</Link>
            </div>

            <div className="store-footer-group">
              <h2>Legal</h2>
              <Link to="/privacy-policy">Privacy Policy</Link>
              <Link to="/terms-and-conditions">Terms & Conditions</Link>
            </div>
          </div>

          <div className="store-footer-bottom">
            <span>© {new Date().getFullYear()} Vastram. All rights reserved.</span>
            <span>Everyday style, made simple.</span>
          </div>
        </footer>
      )}
    </div>
  );
}
