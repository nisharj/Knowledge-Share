const SearchBar = ({ value, onChange }) => (
  <input
    className="search-input"
    value={value}
    onChange={(event) => onChange(event.target.value)}
    placeholder="Search by title, tags, or description"
    aria-label="Search resources"
  />
);

export default SearchBar;
