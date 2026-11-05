import crypto from "crypto";
export default function orderNumber() {
  return "VST-" + Date.now().toString().slice(-8) + crypto.randomBytes(2).toString("hex").toUpperCase();
}
