import { useState } from "react";
import api from "../services/api";

const typeLabel = {
  blog: "Blog",
  youtube: "YouTube",
  course: "Course",
};

const ResourceCard = ({ resource, onOpen }) => {
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
        <span className="badge">
          {typeLabel[resource.type] || resource.type}
        </span>
        <span className="views">{resource.views || 0} views</span>
      </div>

      <h3>{resource.title}</h3>
      <p>{resource.description}</p>

      <div className="tags-wrap">
        {resource.tags?.map((tag) => (
          <button key={tag} type="button" className="tag-chip">
            #{tag}
          </button>
        ))}
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
