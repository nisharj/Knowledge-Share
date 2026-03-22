const Filter = ({ value, onChange }) => (
  <select
    className="filter-select"
    value={value}
    onChange={(event) => onChange(event.target.value)}
  >
    <option value="">All Types</option>
    <option value="blog">Blog</option>
    <option value="youtube">YouTube</option>
    <option value="course">Course</option>
  </select>
);

export default Filter;
