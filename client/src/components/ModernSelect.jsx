import React, { useState, forwardRef } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { cn } from '../utils/cn';

const ModernSelect = forwardRef(({ 
  options = [],
  value,
  onChange,
  placeholder = 'Select an option',
  searchable = false,
  multiple = false,
  label,
  error,
  success,
  warning,
  disabled = false,
  className = '',
  size = 'md',
  ...props 
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedValues, setSelectedValues] = useState(multiple ? (value || []) : []);

  const baseClasses = cn(
    'relative w-full rounded-xl border-2 transition-all duration-200 ease-out',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  );

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg'
  };

  const variantClasses = {
    default: cn(
      'border-gray-200 bg-white',
      'focus:border-blue-500 focus:ring-blue-500',
      'hover:border-gray-300'
    ),
    error: cn(
      'border-red-300 bg-red-50',
      'focus:border-red-500 focus:ring-red-500'
    ),
    success: cn(
      'border-green-300 bg-green-50',
      'focus:border-green-500 focus:ring-green-500'
    ),
    warning: cn(
      'border-yellow-300 bg-yellow-50',
      'focus:border-yellow-500 focus:ring-yellow-500'
    )
  };

  const getVariant = () => {
    if (error) return 'error';
    if (success) return 'success';
    if (warning) return 'warning';
    return 'default';
  };

  const currentVariant = getVariant();

  const filteredOptions = searchable 
    ? options.filter(option => 
        option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        option.value.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  const handleSelect = (option) => {
    if (multiple) {
      const newValues = selectedValues.includes(option.value)
        ? selectedValues.filter(v => v !== option.value)
        : [...selectedValues, option.value];
      
      setSelectedValues(newValues);
      onChange?.(newValues);
    } else {
      onChange?.(option.value);
      setIsOpen(false);
    }
  };

  const getDisplayValue = () => {
    if (multiple) {
      if (selectedValues.length === 0) return placeholder;
      if (selectedValues.length === 1) {
        const option = options.find(opt => opt.value === selectedValues[0]);
        return option?.label || placeholder;
      }
      return `${selectedValues.length} items selected`;
    }
    
    const option = options.find(opt => opt.value === value);
    return option?.label || placeholder;
  };

  const isSelected = (optionValue) => {
    if (multiple) {
      return selectedValues.includes(optionValue);
    }
    return value === optionValue;
  };

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      <div className="relative">
        <button
          ref={ref}
          type="button"
          className={cn(
            baseClasses,
            sizeClasses[size],
            variantClasses[currentVariant],
            'flex items-center justify-between w-full text-left',
            'cursor-pointer',
            className
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          {...props}
        >
          <span className={cn(
            'truncate',
            value || (multiple && selectedValues.length > 0) ? 'text-gray-900' : 'text-gray-500'
          )}>
            {getDisplayValue()}
          </span>
          
          <ChevronDown 
            className={cn(
              'ml-2 transition-transform duration-200',
              isOpen && 'rotate-180'
            )} 
            size={size === 'sm' ? 16 : size === 'lg' ? 20 : 18} 
          />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-hidden">
            {searchable && (
              <div className="p-3 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search options..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                  No options found
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      'w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors duration-150',
                      'flex items-center justify-between',
                      isSelected(option.value) && 'bg-blue-50 text-blue-700'
                    )}
                    onClick={() => handleSelect(option)}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected(option.value) && (
                      <Check className="text-blue-600" size={16} />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}

      {success && (
        <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {success}
        </p>
      )}

      {warning && (
        <p className="mt-2 text-sm text-yellow-600 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {warning}
        </p>
      )}
    </div>
  );
});

ModernSelect.displayName = 'ModernSelect';

export default ModernSelect;

