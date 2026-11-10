import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

export interface SelectProps {
  label?: string;
  'aria-label'?: string;
  value?: string | number;
  options: SelectOption[];
  onChange?: (e: { target: { value: string } }) => void;
  error?: string;
  helperText?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  icon?: React.ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
  size?: 'sm' | 'md' | 'lg' | 'compact' | 'filter';
}

export const Select: React.FC<SelectProps> = ({
  label,
  'aria-label': ariaLabel,
  value,
  options,
  onChange,
  error,
  helperText,
  placeholder = 'Select an option',
  className = '',
  disabled = false,
  required = false,
  id,
  icon,
  searchable = true,
  searchPlaceholder = 'Type to search...',
  size = 'md',
}) => {
  const autoId = React.useId();
  const selectId = id || (label && typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : 'select-' + autoId);
  const errorId = selectId + '-error';
  const helperId = selectId + '-helper';
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  // Determine what text to display in the input
  const displayValue = isSearching
    ? searchQuery
    : selectedOption && selectedOption.value !== ''
    ? selectedOption.label
    : '';

  // Click outside to close and reset active search state
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsSearching(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (val: string) => {
    if (disabled) return;
    if (onChange) {
      onChange({ target: { value: val } });
    }
    setIsSearching(false);
    setSearchQuery('');
    setHighlightedIndex(-1);
    setIsOpen(false);
    if (searchable) {
      inputRef.current?.focus();
    } else {
      buttonRef.current?.focus();
    }
  };

  const filteredOptions = searchable && isSearching && searchQuery.trim()
    ? options.filter((opt) => {
        const q = searchQuery.toLowerCase().trim();
        // Hide empty/dummy placeholder options when actively typing a search query
        if (!opt.value && opt.label.toLowerCase().includes('select ')) return false;
        return (
          opt.label.toLowerCase().includes(q) ||
          (opt.sublabel && opt.sublabel.toLowerCase().includes(q)) ||
          String(opt.value).toLowerCase().includes(q)
        );
      })
    : options;

  // Auto-highlight first option when typing or reset on open
  useEffect(() => {
    if (isSearching) {
      setHighlightedIndex(filteredOptions.length > 0 ? 0 : -1);
    } else {
      const idx = filteredOptions.findIndex((opt) => String(opt.value) === String(value));
      setHighlightedIndex(idx >= 0 ? idx : -1);
    }
  }, [searchQuery, isSearching, value, options]);

  // Scroll active option into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const optionElements = listRef.current.querySelectorAll('[data-option-index]');
      const activeEl = optionElements[highlightedIndex] as HTMLElement | undefined;
      if (activeEl && typeof activeEl.scrollIntoView === 'function') {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const triggerSizeClasses: Record<'sm' | 'md' | 'lg' | 'compact' | 'filter', string> = {
    compact: 'h-8 py-0 text-[0.875rem] font-normal rounded-lg min-h-0',
    filter: 'h-[36px] min-h-[36px] max-h-[36px] py-0 text-[13px] font-medium rounded-lg min-h-0 leading-normal',
    sm: 'py-1.5 text-fs-body rounded-xl min-h-[36px]',
    md: 'py-2 text-fs-body font-medium rounded-xl min-h-[38px]',
    lg: 'py-2.5 sm:py-3 text-fs-body font-medium rounded-xl min-h-[44px]',
  };

  const triggerPaddingClasses: Record<'sm' | 'md' | 'lg' | 'compact' | 'filter', string> = {
    compact: icon ? 'pl-8 pr-7' : 'px-2.5 pr-7',
    filter: icon ? 'pl-8 pr-8' : 'px-3 pr-8',
    sm: icon ? 'pl-8 pr-8' : 'px-3 pr-8',
    md: icon ? 'pl-9 pr-9' : 'px-3.5 pr-9',
    lg: icon ? 'pl-11 pr-10' : 'px-4 pr-10',
  };

  const optionItemSizeClasses: Record<'sm' | 'md' | 'lg' | 'compact' | 'filter', string> = {
    compact: 'px-2.5 py-1 text-[0.875rem]',
    filter: 'px-3 py-1.5 text-[13px]',
    sm: 'px-2.5 py-1.5 text-fs-body',
    md: 'px-3 py-2 text-fs-body',
    lg: 'px-4 py-2.5 text-fs-body',
  };

  return (
    <div className={`w-full relative ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className="block font-normal text-slate-700 dark:text-slate-300 mb-1.5 text-fs-label"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Dropdown Trigger: Combobox Input when searchable, or Button Trigger when non-searchable */}
      {searchable ? (
        <div className="relative w-full">
          {icon && (
            <span
              className={`absolute inset-y-0 left-0 ${
                size === 'lg' ? 'pl-3.5' : 'pl-3'
              } flex items-center pointer-events-none text-slate-500 dark:text-slate-400 z-10`}
            >
              {icon}
            </span>
          )}
          <input
            ref={inputRef}
            type="text"
            id={id}
            disabled={disabled}
            value={displayValue}
            placeholder={placeholder || searchPlaceholder}
            onFocus={() => {
              if (!disabled) {
                setIsOpen(true);
                setTimeout(() => inputRef.current?.select(), 10);
              }
            }}
            onClick={() => {
              if (!disabled && !isOpen) {
                setIsOpen(true);
              }
            }}
            onChange={(e) => {
              setIsSearching(true);
              setSearchQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                setIsOpen(false);
                setIsSearching(false);
                setSearchQuery('');
                setHighlightedIndex(-1);
                inputRef.current?.focus();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (!isOpen) {
                  setIsOpen(true);
                } else if (filteredOptions.length > 0) {
                  setHighlightedIndex((prev) =>
                    prev < filteredOptions.length - 1 ? prev + 1 : 0
                  );
                }
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (!isOpen) {
                  setIsOpen(true);
                } else if (filteredOptions.length > 0) {
                  setHighlightedIndex((prev) =>
                    prev > 0 ? prev - 1 : filteredOptions.length - 1
                  );
                }
              } else if (e.key === 'Enter') {
                e.preventDefault();
                if (isOpen && filteredOptions.length > 0) {
                  const targetIdx =
                    highlightedIndex >= 0 && highlightedIndex < filteredOptions.length
                      ? highlightedIndex
                      : filteredOptions[0].value === '' && filteredOptions.length > 1
                      ? 1
                      : 0;
                  handleSelect(filteredOptions[targetIdx].value);
                }
              } else if (e.key === 'Tab') {
                if (isOpen) {
                  setIsOpen(false);
                  setIsSearching(false);
                  setSearchQuery('');
                  setHighlightedIndex(-1);
                }
              }
            }}
            autoComplete="off"
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-label={ariaLabel || label}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={`w-full ${triggerSizeClasses[size]} ${
              isSearching && searchQuery ? 'pr-14' : triggerPaddingClasses[size]
            } ${icon ? (size === 'lg' ? 'pl-11' : size === 'sm' || size === 'filter' ? 'pl-8' : 'pl-9') : (size === 'lg' ? 'pl-4' : 'pl-3.5')} border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-left focus:outline-none focus:ring-0 focus:border-teal-500 ${
              disabled
                ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800'
                : 'cursor-text'
            } ${
              error
                ? 'border-rose-300 dark:border-rose-800'
                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
            }`}
          />
          {isSearching && searchQuery && (
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                setSearchQuery('');
                inputRef.current?.focus();
              }}
              className="absolute inset-y-0 right-8 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              aria-label="Clear search query"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                if (isOpen) {
                  setIsOpen(false);
                  setIsSearching(false);
                  setSearchQuery('');
                  setHighlightedIndex(-1);
                } else {
                  setIsOpen(true);
                  inputRef.current?.focus();
                }
              }
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
          >
            <ChevronDown
              className="w-4 h-4 pointer-events-none"
              style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}
            />
          </button>
        </div>
      ) : (
        <button
          ref={buttonRef}
          type="button"
          id={id}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (!isOpen) {
                setIsOpen(true);
              } else if (filteredOptions.length > 0) {
                setHighlightedIndex((prev) =>
                  prev < filteredOptions.length - 1 ? prev + 1 : 0
                );
              }
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              if (!isOpen) {
                setIsOpen(true);
              } else if (filteredOptions.length > 0) {
                setHighlightedIndex((prev) =>
                  prev > 0 ? prev - 1 : filteredOptions.length - 1
                );
              }
            } else if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (!isOpen) {
                setIsOpen(true);
              } else if (filteredOptions.length > 0) {
                const targetIdx =
                  highlightedIndex >= 0 && highlightedIndex < filteredOptions.length
                    ? highlightedIndex
                    : 0;
                handleSelect(filteredOptions[targetIdx].value);
              }
            } else if (e.key === 'Escape') {
              e.preventDefault();
              if (isOpen) {
                setIsOpen(false);
                buttonRef.current?.focus();
              }
            } else if (e.key === 'Tab') {
              if (isOpen) {
                setIsOpen(false);
              }
            }
          }}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={ariaLabel || label}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={`w-full relative flex items-center justify-between ${triggerSizeClasses[size]} ${triggerPaddingClasses[size]} border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-left focus:outline-none focus:ring-0 focus:border-teal-500 ${
            disabled
              ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800'
              : 'cursor-pointer'
          } ${
            error
              ? 'border-rose-300 dark:border-rose-800'
              : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
          }`}
        >
          {icon && (
            <span
              className={`absolute inset-y-0 left-0 ${
                size === 'lg' ? 'pl-3.5' : 'pl-3'
              } flex items-center pointer-events-none text-slate-500 dark:text-slate-400`}
            >
              {icon}
            </span>
          )}
          <span
            className={`truncate ${
              selectedOption && selectedOption.value !== ''
                ? 'text-slate-900 dark:text-slate-100 font-medium'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            className="w-4 h-4 text-slate-500 dark:text-slate-400 ml-2 shrink-0 pointer-events-none"
            style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}
          />
        </button>
      )}

      {error && <p id={errorId} role="alert" className="mt-1 text-fs-label text-rose-600">{error}</p>}
      {helperText && !error && (
        <p id={helperId} className="mt-1 text-fs-label text-slate-500 dark:text-slate-400">{helperText}</p>
      )}

      {/* Custom Options Popover */}
      {isOpen && (
        <div
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel || label}
          className={`absolute left-0 mt-1.5 min-w-full w-max max-w-xs sm:max-w-md ${
            size === 'lg' ? 'max-h-80' : 'max-h-64'
          } overflow-y-auto bg-white dark:bg-slate-900 rounded-lg shadow-modal dark:shadow-none print:shadow-none border border-slate-200 dark:border-slate-700 py-1.5 z-50 animate-fadeIn`}
        >
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 text-center">
              {searchQuery ? `No options matching "${searchQuery}"` : 'No options available'}
            </div>
          ) : (
            filteredOptions.map((opt, idx) => {
              const isSelected = String(opt.value) === String(value);
              const isHighlighted = idx === highlightedIndex;
              return (
                <button
                  key={opt.value || `__empty_${idx}__`}
                  id={`${selectId}-opt-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  type="button"
                  data-option-index={idx}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onClick={() => handleSelect(opt.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      setIsOpen(false);
                      if (searchable) {
                        inputRef.current?.focus();
                      } else {
                        buttonRef.current?.focus();
                      }
                    }
                  }}
                  className={`w-full flex items-center justify-between ${optionItemSizeClasses[size]} text-left cursor-pointer ${
                    isSelected
                      ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-semibold'
                      : isHighlighted
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate min-w-0">
                    <span className="truncate">{opt.label}</span>
                    {opt.sublabel && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-normal shrink-0">
                        {opt.sublabel}
                      </span>
                    )}
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 ml-2" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

