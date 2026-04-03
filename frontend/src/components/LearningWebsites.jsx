import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

const CUSTOM_PLATFORMS_KEY = "kh_custom_platforms";

const defaultWebsites = [
  {
    id: 1,
    name: "Khan Academy",
    description: "Free learning for everyone",
    url: "https://www.khanacademy.org",
    icon: "KA",
    color: "#14BF96",
  },
  {
    id: 2,
    name: "freeCodeCamp",
    description: "Free coding courses and certifications",
    url: "https://www.freecodecamp.org",
    icon: "FC",
    color: "#0A0A23",
  },
  {
    id: 3,
    name: "YouTube Learning",
    description: "Educational channels and tutorials",
    url: "https://www.youtube.com",
    icon: "YT",
    color: "#FF0000",
  },
  {
    id: 4,
    name: "MDN Web Docs",
    description: "Free web development documentation and guides",
    url: "https://developer.mozilla.org",
    icon: "MD",
    color: "#111827",
  },
  {
    id: 5,
    name: "MIT OpenCourseWare",
    description: "Free university course materials from MIT",
    url: "https://ocw.mit.edu",
    icon: "MIT",
    color: "#8C1515",
  },
  {
    id: 6,
    name: "W3Schools",
    description: "Free beginner-friendly coding tutorials and references",
    url: "https://www.w3schools.com",
    icon: "W3",
    color: "#059669",
  },
];

const initialPlatformForm = {
  name: "",
  description: "",
  url: "",
};

const getStoredPlatforms = () => {
  try {
    const saved = localStorage.getItem(CUSTOM_PLATFORMS_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
};

const buildPlatformIcon = (name) => {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "++";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
};

const LearningWebsites = () => {
  const { isAdmin } = useAuth();
  const [customPlatforms, setCustomPlatforms] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(initialPlatformForm);
  const [error, setError] = useState("");

  useEffect(() => {
    setCustomPlatforms(getStoredPlatforms());
  }, []);

  useEffect(() => {
    if (!isModalOpen) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isModalOpen]);

  const websites = useMemo(
    () => [...defaultWebsites, ...customPlatforms],
    [customPlatforms],
  );

  const closeModal = () => {
    setIsModalOpen(false);
    setForm(initialPlatformForm);
    setError("");
  };

  const handleChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
    setError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const name = form.name.trim();
    const description = form.description.trim();
    const url = form.url.trim();

    if (!name || !description || !url) {
      setError("Complete all platform fields before saving.");
      return;
    }

    try {
      new URL(url);
    } catch (_error) {
      setError("Enter a valid platform URL.");
      return;
    }

    const nextPlatform = {
      id: `custom-${Date.now()}`,
      name,
      description,
      url,
      icon: buildPlatformIcon(name),
      color: "#2563EB",
    };

    const nextPlatforms = [...customPlatforms, nextPlatform];
    setCustomPlatforms(nextPlatforms);
    localStorage.setItem(CUSTOM_PLATFORMS_KEY, JSON.stringify(nextPlatforms));
    closeModal();
  };

  return (
    <>
      <section className="learning-websites-section" id="learning">
        <div className="learning-header">
          <h2>Free Learning Websites</h2>
          <p>Explore free platforms to expand your knowledge</p>
        </div>

        <div className="learning-grid">
          {websites.map((website) => (
            <a
              key={website.id}
              href={website.url}
              target="_blank"
              rel="noopener noreferrer"
              className="learning-card"
              style={{ "--card-color": website.color }}
            >
              <div className="learning-icon">{website.icon}</div>
              <h3 className="learning-name">{website.name}</h3>
              <p className="learning-description">{website.description}</p>
              <div className="learning-link">{"Visit site ->"}</div>
            </a>
          ))}

          {isAdmin ? (
            <button
              type="button"
              className="learning-card learning-card-add"
              onClick={() => setIsModalOpen(true)}
              aria-label="Add platform"
            >
              <span className="learning-add-icon" aria-hidden="true">
                +
              </span>
              <span className="learning-add-text">Add Platform</span>
            </button>
          ) : null}
        </div>
      </section>

      {isAdmin && isModalOpen ? (
        <div
          className="platform-modal-backdrop"
          role="presentation"
          onClick={closeModal}
        >
          <div
            className="platform-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-platform-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="platform-modal-header">
              <div>
                <h3 id="add-platform-title">Add Platform</h3>
                <p className="platform-modal-subtitle">
                  Add another free learning site to this grid.
                </p>
              </div>
              <button
                type="button"
                className="platform-modal-close"
                onClick={closeModal}
                aria-label="Close add platform form"
              >
                Close
              </button>
            </div>

            {error ? <div className="alert alert-error">{error}</div> : null}

            <form className="platform-form" onSubmit={handleSubmit}>
              <label className="platform-field">
                <span className="filter-label">Platform name</span>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Coursera"
                  required
                />
              </label>

              <label className="platform-field">
                <span className="filter-label">Description</span>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Short description for learners"
                  required
                />
              </label>

              <label className="platform-field">
                <span className="filter-label">Website URL</span>
                <input
                  name="url"
                  value={form.url}
                  onChange={handleChange}
                  placeholder="https://example.com"
                  required
                />
              </label>

              <div className="platform-form-actions">
                <button type="submit" className="btn">
                  Save Platform
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={closeModal}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default LearningWebsites;
