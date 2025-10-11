import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const FullScreenImageViewer = ({ 
  isOpen, 
  onClose, 
  imageUrl, 
  imageAlt = "Full screen image",
  fileName = ""
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;


  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90"
      onClick={handleBackdropClick}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all duration-200"
        aria-label="Close image viewer"
      >
        <X size={24} />
      </button>


      {/* Image container */}
      <div className="relative max-w-full max-h-full p-4">
        <img
          src={imageUrl}
          alt={imageAlt}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          style={{ maxHeight: '90vh' }}
          onError={(e) => {
            console.error('Image load error:', e.target.src);
            e.target.style.display = 'none';
          }}
        />
      </div>

      {/* Image info */}
      {fileName && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg">
          <p className="text-sm">{fileName}</p>
        </div>
      )}
    </div>
  );
};

export default FullScreenImageViewer;
