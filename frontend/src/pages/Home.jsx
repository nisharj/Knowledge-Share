import { useEffect, useMemo, useState } from "react";
import Footer from "../components/Footer";
import LearningWebsites from "../components/LearningWebsites";
import Navbar from "../components/Navbar";
import ResourceCard from "../components/ResourceCard";
import api from "../services/api";

const normalizeCategory = (value) => {
  const trimmed = String(value || "").trim();

  if (!trimmed || trimmed.toLowerCase() === "general") {
    return "General";
  }

  return trimmed;
};

const Home = () => {
  const [allResources, setAllResources] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [searchText]);

  useEffect(() => {
    const fetchAllResources = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/resources", {
          params: {
            q: debouncedSearch || undefined,
            page: 1,
            limit: 500,
          },
        });

        setAllResources(response.data.resources);
      } catch (requestError) {
        console.error("Failed to fetch all resources:", requestError);
        setError("Unable to load resources right now. Please try again shortly.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllResources();
  }, [debouncedSearch]);

  const { allCategories, groupedResources } = useMemo(() => {
    const grouped = {};

    allResources.forEach((resource) => {
      const category = normalizeCategory(resource.category);

      if (!grouped[category]) {
        grouped[category] = [];
      }

      grouped[category].push(resource);
    });

    return {
      allCategories: Object.keys(grouped).sort((a, b) => a.localeCompare(b)),
      groupedResources: grouped,
    };
  }, [allResources]);

  useEffect(() => {
    if (activeCategory !== "all" && !allCategories.includes(activeCategory)) {
      setActiveCategory("all");
    }
  }, [activeCategory, allCategories]);

  const visibleCategories =
    activeCategory === "all"
      ? allCategories
      : allCategories.filter((category) => category === activeCategory);

  return (
    <main className="page" id="top">
      <Navbar />

      <section className="hero">
        <div className="hero-badge">CURATED COLLECTION</div>
        <h1>
          Free Learning <span className="italic">Resources</span>
        </h1>
        <p>
          High-quality resources curated by admin. Explore by category to find
          exactly what you need.
        </p>
        <div className="resource-notice">
          <p className="notice-text">
            Some links may expire or move over time. If you spot a broken
            resource, let the admin know so it can be refreshed.
          </p>
        </div>
        <div className="hero-stats">
          <div className="stat">
            <div className="stat-number">{allResources.length}+</div>
            <div className="stat-label">RESOURCES</div>
          </div>
          <div className="stat">
            <div className="stat-number">{allCategories.length}</div>
            <div className="stat-label">CATEGORIES</div>
          </div>
          <div className="stat">
            <div className="stat-number">100%</div>
            <div className="stat-label">CURATED</div>
          </div>
        </div>
      </section>

      <section className="browse-section" id="browse">
        <aside className="sidebar browse-sidebar">
          <h3 className="sidebar-title">CATEGORIES</h3>
          <nav className="category-list" aria-label="Resource categories">
            <button
              type="button"
              className={`category-btn ${
                activeCategory === "all" ? "active" : ""
              }`}
              onClick={() => setActiveCategory("all")}
              aria-pressed={activeCategory === "all"}
            >
              <span className="category-name">All categories</span>
              <span className="category-count">{allResources.length}</span>
            </button>
            {allCategories.map((category) => (
              <button
                key={category}
                type="button"
                className={`category-btn ${
                  activeCategory === category ? "active" : ""
                }`}
                onClick={() => setActiveCategory(category)}
                aria-pressed={activeCategory === category}
              >
                <span className="category-name">{category}</span>
                <span className="category-count">
                  {groupedResources[category]?.length || 0}
                </span>
              </button>
            ))}
          </nav>
        </aside>

        <section className="main-content">
          <div className="content-header">
            <h2>
              {activeCategory === "all"
                ? "All resources"
                : `${activeCategory} resources`}
            </h2>
            <input
              className="search-input-inline"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search resources..."
              aria-label="Search resources"
            />
          </div>

          {error ? <div className="alert alert-error">{error}</div> : null}

          {loading ? (
            <p className="state-text">Loading resources...</p>
          ) : visibleCategories.length === 0 ? (
            <p className="state-text">No resources found.</p>
          ) : (
            visibleCategories.map((category) => (
              <div key={category} className="category-section">
                <h3 className="category-title">{category}</h3>
                <div className="grid">
                  {groupedResources[category].map((resource) => (
                    <ResourceCard key={resource._id} resource={resource} />
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      </section>

      <LearningWebsites />
      <Footer />
    </main>
  );
};

export default Home;
