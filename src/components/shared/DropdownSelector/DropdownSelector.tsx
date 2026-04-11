import { useEffect, useRef, useState } from 'react';
import styles from './DropdownSelector.module.scss';

interface Option {
  id: string;
  label: string;
}

interface DropdownSelectorProps {
  options: Option[];
  selectedId: string | null;
  onChange: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function DropdownSelector({
  options,
  selectedId,
  onChange,
  disabled = false,
  placeholder = 'Choose a reaction',
}: DropdownSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.id === selectedId);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(id: string) {
    onChange(id);
    setIsOpen(false);
  }

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${disabled ? styles.disabled : ''}`}
    >
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={selectedOption ? styles.selectedLabel : styles.placeholder}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>
          &#9662;
        </span>
      </button>

      {isOpen && (
        <ul className={styles.menu} role="listbox">
          {options.map((option) => (
            <li
              key={option.id}
              role="option"
              aria-selected={option.id === selectedId}
              className={`${styles.menuItem} ${option.id === selectedId ? styles.menuItemSelected : ''}`}
              onClick={() => handleSelect(option.id)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
