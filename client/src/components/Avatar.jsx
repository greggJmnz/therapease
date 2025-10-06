import React from 'react';
import InitialsAvatar from './InitialsAvatar';

const Avatar = ({ 
  name, 
  profileImage = null,
  size = 'md', 
  className = '', 
  backgroundColor = null,
  textColor = '#ffffff',
  fontSize = null
}) => {
  // If profile image is available, show the image
  if (profileImage) {
    const sizeConfig = {
      xs: '24px',
      sm: '32px',
      md: '40px',
      lg: '48px',
      xl: '64px',
      '2xl': '80px',
      '3xl': '96px',
    };

    const imageSize = sizeConfig[size] || sizeConfig.md;

    return (
      <img 
        src={profileImage} 
        alt={name || 'Profile'} 
        className={`rounded-full object-cover ${className}`}
        style={{
          width: imageSize,
          height: imageSize,
          minWidth: imageSize,
          minHeight: imageSize,
        }}
        title={name}
        onError={(e) => {
          // If image fails to load, fall back to initials
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'flex';
        }}
      />
    );
  }

  // Fall back to initials avatar
  return (
    <InitialsAvatar 
      name={name}
      size={size}
      className={className}
      backgroundColor={backgroundColor}
      textColor={textColor}
      fontSize={fontSize}
    />
  );
};

export default Avatar;
