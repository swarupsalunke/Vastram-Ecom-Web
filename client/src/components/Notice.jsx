export default function Notice({ message, type = "info" }) {
  if (!message) return null;
  return <div className={`notice ${type}`} role="status">{message}</div>;
}
