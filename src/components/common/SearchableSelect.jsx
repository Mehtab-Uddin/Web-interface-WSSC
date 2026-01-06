import { useState, useRef, useEffect } from 'react';
import { Form, InputGroup } from 'react-bootstrap';
import { Search, ChevronDown } from 'lucide-react';

export default function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  className = '',
  required = false,
  getOptionLabel = (option) => option.label || option.name || option,
  getOptionValue = (option) => option.value || option.id || option,
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);
  const searchInputRef = useRef(null);

  // Filter options based on search term
  const filteredOptions = options.filter(option => {
    const label = getOptionLabel(option).toLowerCase();
    return label.includes(searchTerm.toLowerCase());
  });

  // Get selected option label
  const selectedOption = options.find(opt => getOptionValue(opt) === value);
  const selectedLabel = selectedOption ? getOptionLabel(selectedOption) : placeholder;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus search input when dropdown opens
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (optionValue) => {
    const syntheticEvent = {
      target: {
        name: onChange.name || '',
        value: optionValue
      }
    };
    onChange(syntheticEvent);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div ref={wrapperRef} className="position-relative">
      <div
        className={`form-control form-control-custom d-flex align-items-center justify-content-between ${className}`}
        style={{ cursor: disabled ? 'not-allowed' : 'pointer', minHeight: '38px' }}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={value ? '' : 'text-muted'}>
          {selectedLabel}
        </span>
        <ChevronDown size={16} className={isOpen ? 'rotate-180' : ''} style={{ transition: 'transform 0.2s' }} />
      </div>

      {isOpen && !disabled && (
        <div
          className="position-absolute w-100 bg-white border rounded shadow-lg"
          style={{
            zIndex: 1050,
            maxHeight: '300px',
            overflow: 'hidden',
            marginTop: '4px'
          }}
        >
          <div className="p-2 border-bottom">
            <InputGroup size="sm">
              <InputGroup.Text>
                <Search size={14} />
              </InputGroup.Text>
              <Form.Control
                ref={searchInputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="border-0"
              />
            </InputGroup>
          </div>
          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-muted">
                No options found
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const optionValue = getOptionValue(option);
                const optionLabel = getOptionLabel(option);
                const isSelected = optionValue === value;

                return (
                  <div
                    key={index}
                    className={`p-2 px-3 ${isSelected ? 'bg-primary text-white' : 'hover-bg-light'}`}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#0d6efd' : 'transparent'
                    }}
                    onClick={() => handleSelect(optionValue)}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.target.style.backgroundColor = '#f8f9fa';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.target.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    {optionLabel}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Hidden select for form validation */}
      <Form.Select
        value={value || ''}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className="d-none"
      >
        <option value="">{placeholder}</option>
        {options.map((option, index) => {
          const optionValue = getOptionValue(option);
          const optionLabel = getOptionLabel(option);
          return (
            <option key={index} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}
      </Form.Select>
    </div>
  );
}

