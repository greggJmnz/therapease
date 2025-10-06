import { useState, useCallback } from 'react';

// Global navigation state to prevent conflicts between components
let globalNavigationState = {
  isNavigating: false,
  targetRoute: null,
  timestamp: null
};

export const useNavigationState = () => {
  const [isNavigating, setIsNavigating] = useState(false);

  const startNavigation = useCallback((targetRoute) => {
    const now = Date.now();
    
    // If there's already a navigation in progress, check if it's recent
    if (globalNavigationState.isNavigating) {
      const timeDiff = now - globalNavigationState.timestamp;
      // If the previous navigation was less than 500ms ago, ignore this one
      if (timeDiff < 500) {
        console.log('Navigation already in progress, ignoring duplicate');
        return false;
      }
    }

    // Start new navigation
    globalNavigationState = {
      isNavigating: true,
      targetRoute,
      timestamp: now
    };
    
    setIsNavigating(true);
    return true;
  }, []);

  const completeNavigation = useCallback(() => {
    globalNavigationState = {
      isNavigating: false,
      targetRoute: null,
      timestamp: null
    };
    setIsNavigating(false);
  }, []);

  const canNavigate = useCallback(() => {
    return !globalNavigationState.isNavigating;
  }, []);

  return {
    isNavigating,
    startNavigation,
    completeNavigation,
    canNavigate
  };
};

