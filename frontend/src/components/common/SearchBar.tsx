import React from 'react';
import { SearchIcon, CloseIcon } from './Icons';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
}) => {
  return (
    <div className={`relative flex items-center ${className}`}>
      <span className="absolute left-3.5 text-forest-text-muted pointer-events-none">
        <SearchIcon size={14} />
      </span>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2 rounded-xl border border-sage-border bg-white text-forest-text text-xs placeholder:text-forest-text-muted focus:outline-none focus:border-sage-mint-dark/50 transition-colors shadow-subtle"
      />

      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 text-forest-text-muted hover:text-forest-text transition-colors p-0.5"
          aria-label="Clear search"
        >
          <CloseIcon size={12} />
        </button>
      )}
    </div>
  );
};
