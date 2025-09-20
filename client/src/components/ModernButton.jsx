import React from 'react';
import { cn } from '../utils/cn';

const ModernButton = ({ 
  children, 
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  ...props 
}) => {
  const baseClasses = cn(
    'inline-flex items-center justify-center font-medium rounded-[50px] transition-all duration-300 ease-out',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
    'active:scale-95'
  );

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm gap-2',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-3',
    xl: 'px-8 py-4 text-lg gap-3'
  };

  const variantClasses = {
    primary: cn(
      'bg-[#10b981] text-white',
      'hover:bg-[#059669] hover:-translate-y-0.5',
      'focus:ring-[#10b981]',
      'shadow-lg hover:shadow-[0_10px_25px_rgba(16,185,129,0.3)]'
    ),
    secondary: cn(
      'bg-gray-100 text-gray-700 border border-gray-200',
      'hover:bg-gray-200 hover:border-gray-300',
      'focus:ring-gray-500'
    ),
    success: cn(
      'bg-[#10b981] text-white',
      'hover:bg-[#059669] hover:-translate-y-0.5',
      'focus:ring-[#10b981]',
      'shadow-lg hover:shadow-[0_10px_25px_rgba(16,185,129,0.3)]'
    ),
    warning: cn(
      'bg-gradient-to-r from-yellow-500 to-orange-500 text-white',
      'hover:from-yellow-600 hover:to-orange-600 hover:-translate-y-0.5',
      'focus:ring-yellow-500',
      'shadow-lg hover:shadow-xl'
    ),
    danger: cn(
      'bg-gradient-to-r from-red-600 to-pink-600 text-white',
      'hover:from-red-700 hover:to-pink-700 hover:-translate-y-0.5',
      'focus:ring-red-500',
      'shadow-lg hover:shadow-xl'
    ),
    outline: cn(
      'bg-transparent border-2 border-[#2563eb] text-[#2563eb]',
      'hover:bg-[#2563eb] hover:text-white hover:-translate-y-0.5',
      'focus:ring-[#2563eb]'
    ),
    ghost: cn(
      'bg-transparent text-gray-700 hover:bg-gray-100',
      'focus:ring-gray-500'
    )
  };

  const iconClasses = cn(
    'transition-transform duration-200',
    loading && 'animate-spin'
  );

  return (
    <button
      className={cn(
        baseClasses,
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      
      {!loading && Icon && iconPosition === 'left' && (
        <Icon className={iconClasses} size={size === 'sm' ? 16 : size === 'lg' ? 20 : 18} />
      )}
      
      {children}
      
      {!loading && Icon && iconPosition === 'right' && (
        <Icon className={iconClasses} size={size === 'sm' ? 16 : size === 'lg' ? 20 : 18} />
      )}
    </button>
  );
};

export default ModernButton;

