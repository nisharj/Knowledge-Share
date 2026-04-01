export const suggestedResourceTypes = [
  "blog",
  "youtube",
  "course",
  "article",
  "tutorial",
  "documentation",
  "podcast",
  "ebook",
  "webinar",
  "github",
];

const explicitTypeLabels = {
  youtube: "YouTube",
  github: "GitHub",
  ebook: "eBook",
};

export const formatResourceTypeLabel = (value) => {
  const normalizedValue = String(value || "").trim().toLowerCase();

  if (!normalizedValue) {
    return "Unknown";
  }

  if (explicitTypeLabels[normalizedValue]) {
    return explicitTypeLabels[normalizedValue];
  }

  return normalizedValue
    .split(/[\s-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};
