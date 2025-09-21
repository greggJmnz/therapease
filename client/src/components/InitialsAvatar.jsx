import React from 'react';

const InitialsAvatar = ({ 
  name, 
  size = 'md', 
  className = '', 
  backgroundColor = null,
  textColor = '#ffffff',
  fontSize = null
}) => {
  // Extract initials from name
  const getInitials = (fullName) => {
    if (!fullName) return '?';
    
    const names = fullName.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  // Generate background color based on name if not provided
  const generateBackgroundColor = (name) => {
    if (backgroundColor) return backgroundColor;
    
    const colors = [
      '#10b981', // emerald-500
      '#3b82f6', // blue-500
      '#8b5cf6', // violet-500
      '#f59e0b', // amber-500
      '#ef4444', // red-500
      '#06b6d4', // cyan-500
      '#84cc16', // lime-500
      '#f97316', // orange-500
      '#ec4899', // pink-500
      '#6366f1', // indigo-500
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Size configurations
  const sizeConfig = {
    xs: { size: '24px', fontSize: '10px' },
    sm: { size: '32px', fontSize: '12px' },
    md: { size: '40px', fontSize: '14px' },
    lg: { size: '48px', fontSize: '16px' },
    xl: { size: '64px', fontSize: '20px' },
    '2xl': { size: '80px', fontSize: '24px' },
    '3xl': { size: '96px', fontSize: '28px' },
  };

  const config = sizeConfig[size] || sizeConfig.md;
  const initials = getInitials(name);
  const bgColor = generateBackgroundColor(name);
  const finalFontSize = fontSize || config.fontSize;

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full font-semibold ${className}`}
      style={{
        width: config.size,
        height: config.size,
        backgroundColor: bgColor,
        color: textColor,
        fontSize: finalFontSize,
        minWidth: config.size,
        minHeight: config.size,
      }}
      title={name}
    >
      {initials}
    </div>
  );
};

export default InitialsAvatar;
