import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const initialForm = {
  title: "",
  description: "",
  link: "",
  type: "blog",
  category: "general",
  tags: "",
};

const Dashboard = () => {
  const { logout } = useAuth();
  const [resources, setResources] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchResources = async () => {
    const response = await api.get("/resources", {
      params: { page: 1, limit: 100 },
    });
    setResources(response.data.resources);
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const stats = useMemo(() => {
    const totalResources = resources.length;
    const totalViews = resources.reduce(
      (sum, resource) => sum + (resource.views || 0),
      0,
    );
    return { totalResources, totalViews };
  }, [resources]);

  const handleChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
    setError("");
  };

  const validateForm = () => {
    if (!form.title.trim()) {
      setError("Title is required");
      return false;
    }
    if (!form.description.trim()) {
      setError("Description is required");
      return false;
    }
    if (!form.link.trim()) {
      setError("Link is required");
      return false;
    }
    if (!form.type) {
      setError("Type is required");
      return false;
    }
    if (!form.category.trim()) {
      setError("Category is required");
      return false;
    }
    return true;
  };

  const submitResource = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (editingId) {
        await api.put(`/resources/${editingId}`, form);
        setSuccess("Resource updated successfully!");
      } else {
        await api.post("/resources", form);
        setSuccess("Resource published successfully!");
      }

      setForm(initialForm);
      setEditingId(null);
      await fetchResources();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Failed to save resource",
      );
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (resource) => {
    setEditingId(resource._id);
    setForm({
      title: resource.title,
      description: resource.description,
      link: resource.link,
      type: resource.type,
      category: resource.category,
      tags: (resource.tags || []).join(", "),
    });
    setError("");
    setSuccess("");
  };

  const removeResource = async (id) => {
    try {
      await api.delete(`/resources/${id}`);
      await fetchResources();
      setSuccess("Resource deleted successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete resource");
    }
  };

  return (
    <main className="dashboard-page">
      <aside className="sidebar">
        <h2>Admin Panel</h2>
        <nav>
          <a href="#stats">Dashboard</a>
          <a href="#editor">Add Resource</a>
          <a href="#manage">Manage Resources</a>
        </nav>
        <div className="sidebar-actions">
          <Link className="btn ghost" to="/">
            Home
          </Link>
          <button className="btn" onClick={logout}>
            Logout
          </button>
        </div>
      </aside>

      <section className="dashboard-main">
        <div id="stats" className="stats-grid">
          <article className="stat-card">
            <h3>Total Resources</h3>
            <p>{stats.totalResources}</p>
          </article>
          <article className="stat-card">
            <h3>Total Views</h3>
            <p>{stats.totalViews}</p>
          </article>
        </div>

        <form id="editor" className="editor" onSubmit={submitResource}>
          <h3>{editingId ? "Edit Resource" : "Add Resource"}</h3>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Title"
            required
          />
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Description"
            required
          />
          <input
            name="link"
            value={form.link}
            onChange={handleChange}
            placeholder="Link"
            required
          />

          <div className="editor-grid">
            <select name="type" value={form.type} onChange={handleChange}>
              <option value="blog">Blog</option>
              <option value="youtube">YouTube</option>
              <option value="course">Course</option>
            </select>
            <input
              name="category"
              value={form.category}
              onChange={handleChange}
              placeholder="Category"
              required
            />
            <input
              name="tags"
              value={form.tags}
              onChange={handleChange}
              placeholder="Tags (comma separated)"
              required
            />
          </div>

          <div className="editor-actions">
            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Saving..." : editingId ? "Update" : "Publish"}
            </button>
            {editingId ? (
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setEditingId(null);
                  setForm(initialForm);
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        <section id="manage" className="manage-table-wrap">
          <h3>Manage Resources</h3>
          <div className="manage-table">
            <div className="table-head">
              <span>Title</span>
              <span>Type</span>
              <span>Views</span>
              <span>Actions</span>
            </div>
            {resources.map((resource) => (
              <div className="table-row" key={resource._id}>
                <span>{resource.title}</span>
                <span>{resource.type}</span>
                <span>{resource.views || 0}</span>
                <span className="row-actions gap-5">
                  <button
                    className="btn ghost"
                    onClick={() => startEdit(resource)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn"
                    onClick={() => removeResource(resource._id)}
                  >
                    Delete
                  </button>
                </span>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
};

export default Dashboard;
