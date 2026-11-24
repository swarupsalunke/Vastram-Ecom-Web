
import { Instagram, Mail, MessageSquare } from "lucide-react";

export default function ContactUs() {
  return (
    <div className="page policy-page">
      <div className="policy-container">
        <span className="eyebrow">WE ARE HERE TO HELP</span>
        <h1>Contact Us</h1>

        <p>
          Have a question about your order, products, delivery, or
          returns? Feel free to reach out to us. We will be happy
          to assist you.
        </p>

        <div className="contact-info">
          <div className="contact-item">
            <h2>Customer Support</h2>
            <p>
              For any shopping-related queries, order assistance,
              or general questions, please contact our support team.
            </p>
          </div>

          <div className="contact-item">
            <h2>Email</h2>
            <a href="mailto:swarupsalunke01@gmail.com" className="contact-link">
              <Mail size={18} />
              swarupsalunke01@gmail.com
            </a>
          </div>

          <div className="contact-item">
            <h2>WhatsApp</h2>
            <a
              href="https://wa.me/919529624837"
              target="_blank"
              rel="noreferrer"
              className="contact-link"
            >
              <MessageSquare size={18} />
              Chat on WhatsApp
            </a>
          </div>

          <div className="contact-item">
            <h2>Instagram</h2>
            <a
              href="https://www.instagram.com/salunkeswarup8/"
              target="_blank"
              rel="noreferrer"
              className="contact-link"
            >
              <Instagram size={18} />
              @salunkeswarup8
            </a>
          </div>

          <div className="contact-item">
            <h2>Business Hours</h2>
            <p>Monday to Saturday</p>
            <p>10:00 AM – 6:00 PM</p>
          </div>
        </div>
      </div>
    </div>
  );
}
