import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { authReady, isAdmin, isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleAuthAction = () => {
    if (isAuthenticated) {
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
        {!authReady ? null : isAuthenticated ? (
          <span className="nav-user">Hi, {user?.name?.split(" ")[0] || "there"}</span>
        ) : (
          <Link className="btn ghost" to="/signup">
            Sign up
          </Link>
        )}
        {isAdmin ? (
          <Link className="btn ghost" to="/dashboard">
            Dashboard
          </Link>
        ) : null}
        <button type="button" className="btn" onClick={handleAuthAction}>
          {isAuthenticated ? "Logout" : "Sign in"}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
