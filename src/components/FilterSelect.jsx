function FilterSelect({
  value,
  onChange,
  options,
  id,
  ariaLabel,
}) {
  return (
    <select
      id={id}
      value={value}
      aria-label={ariaLabel}
      onChange={(e) =>
        onChange(e.target.value)
      }
      className="filter-select"
    >
      {options.map((option) => (
        <option
          key={option}
          value={option}
        >
          {option}
        </option>
      ))}
    </select>
  );
}

export default FilterSelect;
