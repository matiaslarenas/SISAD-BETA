function SearchBar({
  value,
  onChange,
  placeholder,
  label = "Buscar",
  id,
  ariaLabel,
}) {
  return (
    <input
      id={id}
      type="text"
      className="search-input search-control"
      placeholder={placeholder}
      aria-label={ariaLabel || label}
      value={value}
      onChange={(e) =>
        onChange(e.target.value)
      }
    />
  );
}

export default SearchBar;
