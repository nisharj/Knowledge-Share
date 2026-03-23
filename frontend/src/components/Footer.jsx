import { Link } from "react-router-dom";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-wrapper">
        <div className="footer-logo">
          <h4>CurioHub</h4>
        </div>

        <nav className="footer-nav">
          <Link to="/">Home</Link>
          <span className="divider">|</span>
          <a href="#browse">Resources</a>
          <span className="divider">|</span>
          <a href="#learning">Learning Sites</a>
        </nav>

        <div className="footer-credit">
          <p>
            (c) {currentYear} | Built by{" "}
            <a
              href="https://github.com/nisharj"
              target="_blank"
              rel="noopener noreferrer"
            >
              nisharj
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
