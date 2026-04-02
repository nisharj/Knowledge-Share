const LearningWebsites = () => {
  const websites = [
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

  return (
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
      </div>
    </section>
  );
};

export default LearningWebsites;
