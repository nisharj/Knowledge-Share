const buildPageUrl = (path) => {
  const baseUrl = String(
    process.env.CLIENT_URL || "http://localhost:5173",
  ).replace(/\/$/, "");

  return `${baseUrl}${path}`;
};

export const getStaticKnowledgeBase = () => [
  {
    id: "home_page",
    title: "Home page",
    url: buildPageUrl("/"),
    content:
      "Knowledge Hub is a website that curates free learning resources. Visitors can browse resources, search by keywords, filter by type and category, explore tags, and sort results by newest, popularity, or alphabetical order.",
  },
  {
    id: "resource_catalog",
    title: "Free resource catalog",
    url: buildPageUrl("/#browse"),
    content:
      "The website catalog is intended for free resources only. Resources are grouped by category and may include tags, descriptions, view counts, and direct links to external learning material.",
  },
  {
    id: "bookmarks",
    title: "Bookmarks",
    url: buildPageUrl("/#browse"),
    content:
      "Signed-in users can save bookmarks and later filter the catalog to show bookmarked resources only. Visitors who are not signed in are prompted to create an account or sign in before saving bookmarks.",
  },
  {
    id: "accounts",
    title: "Account access",
    url: buildPageUrl("/login"),
    content:
      "Visitors can sign up for an account, log in, and manage their saved bookmarks. Authentication is required for bookmark storage, while browsing public resources does not require signing in.",
  },
  {
    id: "admin_dashboard",
    title: "Admin dashboard",
    url: buildPageUrl("/dashboard"),
    content:
      "Admins can add, edit, optimize, and delete resources from the dashboard. The admin editor is intended for publishing free resources only, along with categories, types, tags, and descriptions.",
  },
  {
    id: "chatbot_feedback",
    title: "Chatbot feedback handoff",
    url: buildPageUrl("/"),
    content:
      "The chatbot can answer questions about the website and can also collect user feedback, suggested knowledge, or additional information. When users share enough detail, the chatbot can package the name, topic, and message and send it to the admin email address.",
  },
  {
    id: "website_owner",
    title: "Website owner and creator",
    url: "https://github.com/nisharj",
    content:
      "The website owner, admin, and creator is Mohamednishar J. He created this website to help people discover useful free learning resources more easily in one place and make learning more accessible. His GitHub profile is https://github.com/nisharj.",
  },
];
