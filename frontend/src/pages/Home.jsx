import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import ResourceCard from "../components/ResourceCard";
import Footer from "../components/Footer";
import api from "../services/api";

const Home = () => {
  const [allResources, setAllResources] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 350);

    return () => clearTimeout(timeout);
  }, [searchText]);

  // Fetch all resources
  const fetchAllResources = async () => {
    try {
      setLoading(true);
      const response = await api.get("/resources", {
        params: {
          q: debouncedSearch || undefined,
          page: 1,
          limit: 1000, // Get all resources for grouping
        },
      });
      setAllResources(response.data.resources);
    } catch (error) {
      console.error("Failed to fetch all resources:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all resources on mount and when search changes
  useEffect(() => {
    fetchAllResources();
  }, [debouncedSearch]);

  // Extract unique categories from resources and group them
  const { allCategories, groupedResources } = useMemo(() => {
    const categories = new Set(
      allResources
        .map((resource) => resource.category)
        .filter((cat) => cat && cat !== "general"),
    );
    const sorted = [...categories].sort((a, b) => a.localeCompare(b));

    // Group resources by category
    const grouped = {};
    sorted.forEach((cat) => {
      grouped[cat] = allResources.filter((r) => r.category === cat);
    });

    return {
      allCategories: sorted,
      groupedResources: grouped,
    };
  }, [allResources]);

  return (
    <main className="page">
      <Navbar searchText={searchText} onSearchChange={setSearchText} />

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
            ℹ️ Please note: Some resources may be expired or moved. If you find
            broken links, let us know!
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

      <section className="browse-section">
        <div className="sidebar">
          <h3 className="sidebar-title">CATEGORIES</h3>
          <nav className="category-list">
            {allCategories.map((category) => (
              <button key={category} className="category-btn">
                <span className="category-name">{category}</span>
                <span className="category-count">
                  {groupedResources[category]?.length || 0}
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div className="main-content">
          <div className="content-header">
            <h2>All Resources</h2>
            <input
              className="search-input-inline"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search resources..."
              aria-label="Search resources"
            />
          </div>

          {loading ? (
            <p className="state-text">Loading resources...</p>
          ) : allCategories.length === 0 ? (
            <p className="state-text">No resources found.</p>
          ) : (
            allCategories.map((category) => (
              <div key={category} className="category-section">
                <h3 className="category-title">{category}</h3>
                <div className="grid">
                  {groupedResources[category].map((resource) => (
                    <ResourceCard
                      key={resource._id}
                      resource={resource}
                      onOpen={() => {}}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default Home;
