import React from 'react';
import { cn } from '../utils/cn';

const ModernCard = ({ 
  children, 
  className = '', 
  variant = 'default',
  hover = true,
  padding = 'p-6',
  shadow = 'shadow-lg',
  border = 'border border-gray-200/50',
  background = 'bg-white/80 backdrop-blur-sm',
  ...props 
}) => {
  const baseClasses = cn(
    'rounded-[20px] transition-all duration-300 ease-out',
    padding,
    shadow,
    border,
    background,
    hover && 'hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)] hover:scale-[1.02] hover:-translate-y-2',
    className
  );

  const variantClasses = {
    default: 'bg-white border-gray-200/50 shadow-[0_4px_20px_rgba(0,0,0,0.08)]',
    glass: 'bg-white/20 backdrop-blur-md border-white/30',
    elevated: 'bg-white shadow-[0_20px_40px_rgba(0,0,0,0.15)] border-gray-100',
    subtle: 'bg-gray-50/80 border-gray-100',
    accent: 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200/50',
    success: 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200/50',
    warning: 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200/50',
    danger: 'bg-gradient-to-br from-red-50 to-pink-50 border-red-200/50'
  };

  return (
    <div 
      className={cn(baseClasses, variantClasses[variant])}
      {...props}
    >
      {children}
    </div>
  );
};

export default ModernCard;

