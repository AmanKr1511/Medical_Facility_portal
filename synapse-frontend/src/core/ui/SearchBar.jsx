import { useState } from 'react';
import Button from './Button';
import './ui.css';

/**
 * Text input + Search button. Calls onSearch(query) on submit (button or Enter).
 * Submitting an empty box clears the search.
 */
export default function SearchBar({ placeholder, label, onSearch }) {
  const [value, setValue] = useState('');

  return (
    <form
      className="search-bar"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(value.trim());
      }}
    >
      <input
        className="input"
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button type="submit">Search</Button>
    </form>
  );
}
