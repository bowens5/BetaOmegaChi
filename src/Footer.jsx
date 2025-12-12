import React from "react";
import "./Footer.css";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="footer-logo" aria-hidden="true">BOX</span>
          <span className="footer-name">Beta Omega Chi</span>
        </div>

        <nav className="footer-links" aria-label="Social & Payments">
          <a
            href="https://instagram.com/huinstabox"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
            aria-label="Instagram (opens in a new tab)"
            title="Instagram @huinstabox"
          >
            {/* Instagram icon */}
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5m10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3m-5 3a5 5 0 1 1 0 10a5 5 0 0 1 0-10m0 2.2A2.8 2.8 0 1 0 14.8 12A2.8 2.8 0 0 0 12 9.2M18 6.8a1 1 0 1 1-1 1a1 1 0 0 1 1-1Z"/>
            </svg>
            <span>@huinstabox</span>
          </a>
          

          <a
            href="https://checkout.square.site/merchant/ML86ZRA45HVGS/checkout/NSNJ2J654V37U57ZOOI2YYZT"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link donate"
            aria-label="Square checkout (opens in a new tab)"
            title="Square Checkout"
          >
            {/* Card icon */}
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M2 7a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3zm2 1v2h16V8zm0 4v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5z"/>
            </svg>
            <span>Square Checkout</span>
          </a>
        </nav>
      </div>

      <div className="footer-bottom">
        <small>© 2004 Beta Omega Chi • Built On Christ</small>
      </div>
    </footer>
  );
}
