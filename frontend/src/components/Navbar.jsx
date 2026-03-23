import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const handleAuthAction = () => {
    if (token) {
      logout();
      navigate("/");
      return;
    }

    navigate("/login");
  };

  return (
    <nav className="navbar">
      <Link className="brand" to="/">
        CurioHub
      </Link>

      <div className="nav-actions">
        {token ? (
          <Link className="btn ghost" to="/dashboard">
            Dashboard
          </Link>
        ) : null}
        <button type="button" className="btn" onClick={handleAuthAction}>
          {token ? "Logout" : "Login"}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
