import {
  formatResourceTypeLabel,
  suggestedResourceTypes,
} from "../constants/resourceTypes";

const Filter = ({ value, onChange, options = suggestedResourceTypes }) => (
  <select
    className="filter-select"
    value={value}
    onChange={(event) => onChange(event.target.value)}
  >
    <option value="">All Types</option>
    {options.map((typeOption) => (
      <option key={typeOption} value={typeOption}>
        {formatResourceTypeLabel(typeOption)}
      </option>
    ))}
  </select>
);

export default Filter;
