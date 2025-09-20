import React, { forwardRef, useState, useEffect } from 'react';
import { cn } from '../utils/cn';

const ModernInput = forwardRef(({ 
  label,
  error,
  success,
  warning,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  className = '',
  variant = 'default',
  size = 'md',
  ...props 
}, ref) => {
  const [hasBeenFloated, setHasBeenFloated] = useState(false);
  const baseClasses = cn(
    'w-full rounded-[20px] border-2 transition-all duration-300 ease-out',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'peer placeholder-transparent',
    'bg-white/60 backdrop-blur-sm',
    'group-hover:border-slate-300 group-hover:shadow-md group-hover:shadow-slate-100',
    'focus:border-[#10b981] focus:shadow-lg focus:shadow-[#d1fae5]',
    'text-slate-800 font-medium'
  );

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg'
  };

  const variantClasses = {
    default: cn(
      'border-slate-200 bg-white/60',
      'focus:border-[#10b981] focus:ring-[#10b981]',
      'group-hover:border-slate-300 group-hover:shadow-slate-100'
    ),
    error: cn(
      'border-red-300 bg-red-50/80',
      'focus:border-red-500 focus:ring-red-500',
      'group-hover:border-red-400 group-hover:shadow-red-100'
    ),
    success: cn(
      'border-[#10b981] bg-[#d1fae5]/80',
      'focus:border-[#10b981] focus:ring-[#10b981]',
      'group-hover:border-[#10b981] group-hover:shadow-[#d1fae5]'
    ),
    warning: cn(
      'border-amber-300 bg-amber-50/80',
      'focus:border-amber-500 focus:ring-amber-500',
      'group-hover:border-amber-400 group-hover:shadow-amber-100'
    )
  };

  const labelClasses = cn(
    'absolute left-4 transition-all duration-300 ease-out pointer-events-none z-20',
    'font-semibold tracking-wide',
    'bg-transparent px-0',
    // Default state - centered
    !hasBeenFloated && 'top-1/2 -translate-y-1/2 text-sm text-slate-600',
    // Floated state - at top but not too high
    hasBeenFloated && 'text-xs text-[#10b981]',
    hasBeenFloated && size === 'sm' && 'top-2 -translate-y-0',
    hasBeenFloated && size === 'lg' && 'top-3 -translate-y-0',
    hasBeenFloated && size === 'md' && 'top-2.5 -translate-y-0'
  );

  const iconClasses = 'text-slate-400 transition-all duration-200 group-hover:text-slate-600 group-hover:scale-110';
  const leftIconClasses = cn(iconClasses, 'absolute left-4 top-1/2 -translate-y-1/2 z-10');
  const rightIconClasses = cn(iconClasses, 'absolute right-4 top-1/2 -translate-y-1/2 z-10');

  const getVariant = () => {
    if (error) return 'error';
    if (success) return 'success';
    if (warning) return 'warning';
    return variant;
  };

  const currentVariant = getVariant();

  // For date inputs, always keep label floated
  useEffect(() => {
    if (props.type === 'date') {
      setHasBeenFloated(true);
    }
  }, [props.type]);

  const handleMouseEnter = () => {
    setHasBeenFloated(true);
  };

  const handleMouseLeave = (e) => {
    // For date inputs, always keep label floated
    if (e.target.type === 'date') {
      setHasBeenFloated(true);
      return;
    }
    
    // Only reset if the field is empty and not focused
    if (!e.target.value && document.activeElement !== e.target) {
      setHasBeenFloated(false);
    }
  };

  const handleFocus = () => {
    setHasBeenFloated(true);
  };

  const handleBlur = (e) => {
    // For date inputs, always keep label floated
    if (e.target.type === 'date') {
      setHasBeenFloated(true);
      return;
    }
    
    // Only reset if the field is truly empty
    if (!e.target.value) {
      setHasBeenFloated(false);
    }
  };

  return (
    <div className="relative group">
      {label && (
        <label className={cn(labelClasses, LeftIcon && 'left-12')}>
          {label}
        </label>
      )}
      
      {LeftIcon && (
        <LeftIcon 
          className={leftIconClasses} 
          size={size === 'sm' ? 16 : size === 'lg' ? 20 : 18} 
        />
      )}
      
      <input
        ref={ref}
        className={cn(
          baseClasses,
          sizeClasses[size],
          variantClasses[currentVariant],
          LeftIcon && 'pl-12',
          RightIcon && 'pr-12',
          hasBeenFloated && 'pt-5',
          hasBeenFloated && size === 'sm' && 'pt-4',
          hasBeenFloated && size === 'lg' && 'pt-6',
          className
        )}
        placeholder=" "
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
      
      {RightIcon && (
        <RightIcon 
          className={rightIconClasses} 
          size={size === 'sm' ? 16 : size === 'lg' ? 20 : 18} 
        />
      )}
      
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

ModernInput.displayName = 'ModernInput';

export default ModernInput;

