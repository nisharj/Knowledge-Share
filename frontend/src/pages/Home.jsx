import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Filter from "../components/Filter";
import Footer from "../components/Footer";
import LearningWebsites from "../components/LearningWebsites";
import Navbar from "../components/Navbar";
import ResourceCard from "../components/ResourceCard";
import { suggestedResourceTypes } from "../constants/resourceTypes";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const normalizeCategory = (value) => {
  const trimmed = String(value || "").trim();

  if (!trimmed || trimmed.toLowerCase() === "general") {
    return "General";
  }

  return trimmed;
};

const normalizeTag = (value) => String(value || "").trim().toLowerCase();

const matchesSearch = (resource, searchValue) => {
  if (!searchValue) {
    return true;
  }

  const searchableText = [
    resource.title,
    resource.description,
    resource.type,
    normalizeCategory(resource.category),
    ...(resource.tags || []),
  ]
    .join(" ")
    .toLowerCase();

  return searchableText.includes(searchValue);
};

const sortResources = (resources, sortBy) => {
  const sorted = [...resources];

  sorted.sort((left, right) => {
    if (sortBy === "popular") {
      const viewDiff = (right.views || 0) - (left.views || 0);
      if (viewDiff !== 0) {
        return viewDiff;
      }
    }

    if (sortBy === "alphabetical") {
      return left.title.localeCompare(right.title);
    }

    return new Date(right.createdAt || 0) - new Date(left.createdAt || 0);
  });

  return sorted;
};

const Home = () => {
  const navigate = useNavigate();
  const { authReady, isAuthenticated, toggleBookmark, user } = useAuth();
  const [allResources, setAllResources] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookmarkLoadingId, setBookmarkLoadingId] = useState("");
  const [error, setError] = useState("");
  const [bookmarkNotice, setBookmarkNotice] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [typeFilter, setTypeFilter] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState("recent");
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);

  useEffect(() => {
    const fetchAllResources = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/resources", {
          params: {
            page: 1,
            limit: 500,
          },
        });

        setAllResources(response.data.resources);
        if (response.data.degraded) {
          setError(
            response.data.message ||
              "Resources are temporarily unavailable right now.",
          );
        }
      } catch (requestError) {
        console.error("Failed to fetch all resources:", requestError);
        setError(
          requestError.response?.data?.message ||
            "Unable to load resources right now. Please try again shortly.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAllResources();
  }, []);

  const bookmarkedIds = user?.bookmarks || [];
  const bookmarkedSet = useMemo(() => new Set(bookmarkedIds), [bookmarkedIds]);
  const searchValue = searchText.trim().toLowerCase();

  const tagSourceResources = useMemo(
    () =>
      allResources.filter((resource) => {
        if (!matchesSearch(resource, searchValue)) {
          return false;
        }

        if (typeFilter && resource.type !== typeFilter) {
          return false;
        }

        if (showBookmarkedOnly && !bookmarkedSet.has(resource._id)) {
          return false;
        }

        if (
          activeCategory !== "all" &&
          normalizeCategory(resource.category) !== activeCategory
        ) {
          return false;
        }

        return true;
      }),
    [allResources, activeCategory, bookmarkedSet, searchValue, showBookmarkedOnly, typeFilter],
  );

  const availableTags = useMemo(() => {
    const counts = new Map();

    tagSourceResources.forEach((resource) => {
      (resource.tags || []).forEach((tag) => {
        const normalizedTag = normalizeTag(tag);

        if (!normalizedTag) {
          return;
        }

        counts.set(normalizedTag, (counts.get(normalizedTag) || 0) + 1);
      });
    });

    return [...counts.entries()]
      .sort((left, right) => {
        if (right[1] !== left[1]) {
          return right[1] - left[1];
        }

        return left[0].localeCompare(right[0]);
      })
      .map(([tag, count]) => ({ tag, count }));
  }, [tagSourceResources]);

  const availableTypes = useMemo(() => {
    const customTypes = allResources
      .map((resource) => String(resource.type || "").trim().toLowerCase())
      .filter(Boolean)
      .filter((type) => !suggestedResourceTypes.includes(type))
      .sort((left, right) => left.localeCompare(right));

    return [...new Set([...suggestedResourceTypes, ...customTypes])];
  }, [allResources]);

  const resourcesBeforeCategory = useMemo(
    () =>
      allResources.filter((resource) => {
        if (!matchesSearch(resource, searchValue)) {
          return false;
        }

        if (typeFilter && resource.type !== typeFilter) {
          return false;
        }

        if (showBookmarkedOnly && !bookmarkedSet.has(resource._id)) {
          return false;
        }

        if (
          selectedTags.length > 0 &&
          !selectedTags.every((tag) =>
            (resource.tags || []).map(normalizeTag).includes(tag),
          )
        ) {
          return false;
        }

        return true;
      }),
    [
      allResources,
      bookmarkedSet,
      searchValue,
      selectedTags,
      showBookmarkedOnly,
      typeFilter,
    ],
  );

  const { allCategories, categoryCounts, groupedResources, visibleCount } =
    useMemo(() => {
      const counts = {};

      resourcesBeforeCategory.forEach((resource) => {
        const category = normalizeCategory(resource.category);
        counts[category] = (counts[category] || 0) + 1;
      });

      const filteredResources =
        activeCategory === "all"
          ? resourcesBeforeCategory
          : resourcesBeforeCategory.filter(
              (resource) =>
                normalizeCategory(resource.category) === activeCategory,
            );

      const grouped = {};
      sortResources(filteredResources, sortBy).forEach((resource) => {
        const category = normalizeCategory(resource.category);

        if (!grouped[category]) {
          grouped[category] = [];
        }

        grouped[category].push(resource);
      });

      return {
        allCategories: Object.keys(counts).sort((left, right) =>
          left.localeCompare(right),
        ),
        categoryCounts: counts,
        groupedResources: grouped,
        visibleCount: filteredResources.length,
      };
    }, [activeCategory, resourcesBeforeCategory, sortBy]);

  useEffect(() => {
    if (activeCategory !== "all" && !allCategories.includes(activeCategory)) {
      setActiveCategory("all");
    }
  }, [activeCategory, allCategories]);

  useEffect(() => {
    if (!isAuthenticated) {
      setShowBookmarkedOnly(false);
    }
  }, [isAuthenticated]);

  const visibleCategories =
    activeCategory === "all"
      ? allCategories
      : allCategories.filter((category) => groupedResources[category]?.length);

  const requestAccountForBookmarks = () => {
    setBookmarkNotice("Create an account or sign in to save bookmarks securely.");
    navigate("/signup");
  };

  const handleBookmarkToggle = async (resourceId) => {
    if (!isAuthenticated) {
      requestAccountForBookmarks();
      return;
    }

    try {
      setBookmarkLoadingId(resourceId);
      setBookmarkNotice("");
      await toggleBookmark(resourceId);
    } catch (requestError) {
      setBookmarkNotice(
        requestError.response?.data?.message ||
          "Unable to update bookmarks right now.",
      );
    } finally {
      setBookmarkLoadingId("");
    }
  };

  const toggleTag = (tag) => {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((entry) => entry !== tag)
        : [...current, tag],
    );
  };

  const clearFilters = () => {
    setSearchText("");
    setTypeFilter("");
    setSelectedTags([]);
    setSortBy("recent");
    setShowBookmarkedOnly(false);
    setActiveCategory("all");
  };

  return (
    <main className="page" id="top">
      <Navbar />

      <section className="hero">
        <div className="hero-badge">CURATED COLLECTION</div>
        <h1>
          Free Learning <span className="italic">Resources</span>
        </h1>
        <p>
          High-quality resources curated by admin. Explore by category, save
          bookmarks with your account, and combine filters to find exactly what
          you need.
        </p>
        <div className="resource-notice">
          <p className="notice-text">
            Some links may expire or move over time. If you spot a broken
            resource, let the admin know so it can be refreshed.
          </p>
        </div>
        <div className="hero-stats">
          <div className="stat">
            <div className="stat-number">{allResources.length}</div>
            <div className="stat-label">RESOURCES</div>
          </div>
          <div className="stat">
            <div className="stat-number">{allCategories.length}</div>
            <div className="stat-label">CATEGORIES</div>
          </div>
          <div className="stat">
            <div className="stat-number">
              {isAuthenticated ? bookmarkedIds.length : "--"}
            </div>
            <div className="stat-label">BOOKMARKS</div>
          </div>
          <div className="stat">
            <div className="stat-number">{visibleCount}</div>
            <div className="stat-label">MATCHING NOW</div>
          </div>
        </div>
      </section>

      <section className="browse-section" id="browse">
        <aside className="sidebar browse-sidebar">
          <div className="sidebar-block">
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
                <span className="category-count">
                  {resourcesBeforeCategory.length}
                </span>
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
                    {categoryCounts[category] || 0}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          <div className="sidebar-block">
            <div className="filter-panel-header">
              <h3 className="sidebar-title">POPULAR TAGS</h3>
              {selectedTags.length > 0 ? (
                <button
                  type="button"
                  className="text-btn"
                  onClick={() => setSelectedTags([])}
                >
                  Clear tags
                </button>
              ) : null}
            </div>

            <div className="tag-cloud">
              {availableTags.length === 0 ? (
                <p className="state-text compact-text">
                  No tags match the current filters.
                </p>
              ) : (
                availableTags.slice(0, 18).map(({ tag, count }) => (
                  <button
                    key={tag}
                    type="button"
                    className={`tag-chip ${
                      selectedTags.includes(tag) ? "active" : ""
                    }`}
                    onClick={() => toggleTag(tag)}
                    aria-pressed={selectedTags.includes(tag)}
                  >
                    #{tag} <span className="tag-count">{count}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        <section className="main-content">
          <div className="content-header">
            <div>
              <h2>
                {activeCategory === "all"
                  ? "All resources"
                  : `${activeCategory} resources`}
              </h2>
              <p className="results-meta">
                {visibleCount} result{visibleCount === 1 ? "" : "s"} with the
                current filters
              </p>
            </div>

            <div className="content-actions">
              <button
                type="button"
                className={`bookmark-toggle ${
                  showBookmarkedOnly ? "active" : ""
                }`}
                onClick={() => {
                  if (!isAuthenticated) {
                    requestAccountForBookmarks();
                    return;
                  }

                  setShowBookmarkedOnly((current) => !current);
                }}
                aria-pressed={showBookmarkedOnly}
              >
                {showBookmarkedOnly ? "Showing bookmarked" : "Bookmarked only"}
              </button>
              <button type="button" className="btn ghost" onClick={clearFilters}>
                Reset all
              </button>
            </div>
          </div>

          <div className="filters-panel">
            <div className="filters-grid">
              <label className="filter-field filter-field-wide">
                <span className="filter-label">Search</span>
                <input
                  className="search-input-inline"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search title, description, type, or tag"
                  aria-label="Search resources"
                />
              </label>

              <label className="filter-field">
                <span className="filter-label">Type</span>
                <Filter
                  value={typeFilter}
                  onChange={setTypeFilter}
                  options={availableTypes}
                />
              </label>

              <label className="filter-field">
                <span className="filter-label">Sort</span>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                >
                  <option value="recent">Newest first</option>
                  <option value="popular">Most viewed</option>
                  <option value="alphabetical">A to Z</option>
                </select>
              </label>
            </div>

            {!authReady ? null : isAuthenticated ? (
              <p className="auth-inline-note">
                Signed in as {user?.email}. Your bookmarks are saved to your
                account.
              </p>
            ) : (
              <p className="auth-inline-note">
                Sign in or create an account to save bookmarks securely.
              </p>
            )}

            {selectedTags.length > 0 ? (
              <div className="active-filters">
                {selectedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="filter-pill"
                    onClick={() => toggleTag(tag)}
                  >
                    #{tag} x
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {bookmarkNotice ? (
            <div className="alert alert-error">{bookmarkNotice}</div>
          ) : null}
          {error ? <div className="alert alert-error">{error}</div> : null}

          {loading ? (
            <p className="state-text">Loading resources...</p>
          ) : visibleCategories.length === 0 ? (
            <div className="empty-state">
              <h3>No resources found</h3>
              <p className="state-text">
                Try adjusting the search, type, tags, category, or bookmark
                filters.
              </p>
            </div>
          ) : (
            visibleCategories.map((category) => (
              <div key={category} className="category-section">
                <h3 className="category-title">{category}</h3>
                <div className="grid">
                  {groupedResources[category].map((resource) => (
                    <ResourceCard
                      key={resource._id}
                      resource={resource}
                      canBookmark={isAuthenticated}
                      isBookmarked={bookmarkedSet.has(resource._id)}
                      isBookmarkPending={bookmarkLoadingId === resource._id}
                      activeTags={selectedTags}
                      onToggleBookmark={() => handleBookmarkToggle(resource._id)}
                      onTagSelect={toggleTag}
                    />
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
