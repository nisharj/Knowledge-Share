const LearningWebsites = () => {
  const websites = [
    {
      id: 1,
      name: "Udemy",
      description: "Learn anything with thousands of courses",
      url: "https://www.udemy.com",
      icon: "UD",
      color: "#A435F0",
    },
    {
      id: 2,
      name: "Coursera",
      description: "University-level courses and degrees",
      url: "https://www.coursera.org",
      icon: "CO",
      color: "#1F73E6",
    },
    {
      id: 3,
      name: "Khan Academy",
      description: "Free learning for everyone",
      url: "https://www.khanacademy.org",
      icon: "KA",
      color: "#14BF96",
    },
    {
      id: 4,
      name: "YouTube Learning",
      description: "Educational channels and tutorials",
      url: "https://www.youtube.com",
      icon: "YT",
      color: "#FF0000",
    },
    {
      id: 5,
      name: "LinkedIn Learning",
      description: "Professional development courses",
      url: "https://www.linkedin.com/learning",
      icon: "LI",
      color: "#0077B5",
    },
    {
      id: 6,
      name: "Skillshare",
      description: "Creative classes and community",
      url: "https://www.skillshare.com",
      icon: "SK",
      color: "#002333",
    },
  ];

  return (
    <section className="learning-websites-section" id="learning">
      <div className="learning-header">
        <h2>Popular Learning Websites</h2>
        <p>Explore these platforms to expand your knowledge</p>
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
