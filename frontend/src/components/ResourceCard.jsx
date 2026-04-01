import { useState } from "react";
import { formatResourceTypeLabel } from "../constants/resourceTypes";
import api from "../services/api";

const ResourceCard = ({
  resource,
  onOpen,
  canBookmark = false,
  isBookmarked = false,
  isBookmarkPending = false,
  activeTags = [],
  onTagSelect,
  onToggleBookmark,
}) => {
  const [copyState, setCopyState] = useState("idle");

  const openResource = async () => {
    try {
      await api.post(`/resources/${resource._id}/view`);
    } catch (_error) {
      // Silent fail for analytics update; we still open the resource.
    }

    window.open(resource.link, "_blank", "noopener,noreferrer");
    onOpen?.();
  };

  const copyLink = async () => {
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard unavailable");
      }

      await navigator.clipboard.writeText(resource.link);
      setCopyState("copied");
    } catch (_error) {
      setCopyState("failed");
    }

    window.setTimeout(() => setCopyState("idle"), 1800);
  };

  return (
    <article className="card">
      <div className="card-top">
        <div className="card-meta">
          <span className="badge">{formatResourceTypeLabel(resource.type)}</span>
          <span className="views">{resource.views || 0} views</span>
        </div>

        <button
          type="button"
          className={`bookmark-btn ${isBookmarked ? "active" : ""}`}
          onClick={onToggleBookmark}
          disabled={isBookmarkPending}
          aria-pressed={isBookmarked}
        >
          {isBookmarkPending
            ? "Saving..."
            : canBookmark
              ? isBookmarked
                ? "Saved"
                : "Save"
              : "Sign in to save"}
        </button>
      </div>

      <div className="card-content">
        <h3>{resource.title}</h3>
        <p className="card-description">{resource.description}</p>

        <div className="tags-wrap">
          {resource.tags?.map((tag) => {
            const normalizedTag = String(tag).trim().toLowerCase();

            return (
              <button
                key={tag}
                type="button"
                className={`tag-chip ${
                  activeTags.includes(normalizedTag) ? "active" : ""
                }`}
                onClick={() => onTagSelect?.(normalizedTag)}
              >
                #{normalizedTag}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card-actions">
        <button type="button" className="btn" onClick={openResource}>
          Open
        </button>
        <button type="button" className="btn ghost" onClick={copyLink}>
          {copyState === "copied"
            ? "Copied"
            : copyState === "failed"
              ? "Copy failed"
              : "Copy link"}
        </button>
      </div>
    </article>
  );
};

export default ResourceCard;
