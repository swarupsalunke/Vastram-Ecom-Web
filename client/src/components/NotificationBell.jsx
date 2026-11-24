import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import api from "../api";

export default function NotificationBell({ userId }) {
  const [messages, setMessages] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const unreadCount = messages.filter(message => !message.readAt).length;

  useEffect(() => {
    let active = true;
    const loadMessages = async () => {
      try {
        const { data } = await api.get("/messages/mine");
        if (active) {
          setMessages(data);
          setError("");
        }
      } catch (e) {
        if (active) setError(e.response?.data?.message || "Unable to load notifications.");
      }
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") loadMessages();
    };

    loadMessages();
    const interval = window.setInterval(loadMessages, 30000);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [userId]);

  const toggleNotifications = async () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (!willOpen || !unreadCount) return;

    try {
      await api.patch("/messages/read-all");
      const readAt = new Date().toISOString();
      setMessages(current => current.map(message => message.readAt ? message : { ...message, readAt }));
      setError("");
    } catch (e) {
      setError(e.response?.data?.message || "Unable to mark notifications as read.");
    }
  };

  return (
    <div className="notification-menu">
      <button
        type="button"
        className="top-link notification-button"
        onClick={toggleNotifications}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
      >
        <span className="notification-icon-wrap">
          <Bell size={19} />
          {unreadCount > 0 && <span className="notification-count-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
        </span>
      </button>
      {open && (
        <section className="notification-dropdown" aria-label="Notifications">
          <h2>Notifications</h2>
          {error && <p className="notification-error" role="alert">{error}</p>}
          {messages.length ? (
            <div className="notification-list">
              {messages.slice(0, 20).map(message => (
                <Link
                  to="/account"
                  className={`notification-item ${message.readAt ? "" : "unread"}`}
                  key={message._id}
                  onClick={() => setOpen(false)}
                >
                  <strong>{message.title}</strong>
                  <span>{message.message}</span>
                  <small>
                    {message.order?.orderNumber && `${message.order.orderNumber} · `}
                    {new Date(message.createdAt).toLocaleString()}
                  </small>
                </Link>
              ))}
            </div>
          ) : !error ? (
            <p className="notification-empty">No notifications yet.</p>
          ) : null}
        </section>
      )}
    </div>
  );
}
