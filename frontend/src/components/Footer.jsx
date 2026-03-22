const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-wrapper">
        <div className="footer-logo">
          <h4>Knowledge Hub</h4>
        </div>

        <nav className="footer-nav">
          <a href="#/">Home</a>
          <span className="divider">•</span>
          <a href="#/">Resources</a>
          <span className="divider">•</span>
          <a href="#/">Categories</a>
        </nav>

        <div className="footer-credit">
          <p>
            © {currentYear} • Built by&nbsp;
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
