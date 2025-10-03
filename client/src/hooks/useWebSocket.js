import { useEffect, useRef, useState } from 'react';
import websocketService from '../services/websocketService';

export const useWebSocket = (token) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const listenersRef = useRef(new Map());

  useEffect(() => {
    if (!token) return;

    // Connect to WebSocket
    websocketService.connect(token);

    // Set up connection status listeners
    const handleConnection = (data) => {
      setIsConnected(data.status === 'connected');
      setConnectionState(websocketService.getConnectionState());
    };

    websocketService.on('connection', handleConnection);

    // Update connection state periodically
    const interval = setInterval(() => {
      setConnectionState(websocketService.getConnectionState());
      setIsConnected(websocketService.isConnected());
    }, 1000);

    return () => {
      websocketService.off('connection', handleConnection);
      clearInterval(interval);
    };
  }, [token]);

  return {
    isConnected,
    connectionState,
    websocketService
  };
};

export const useWebSocketEvent = (eventType, callback, deps = []) => {
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const wrappedCallback = (data) => {
      callbackRef.current(data);
    };

    websocketService.on(eventType, wrappedCallback);

    return () => {
      websocketService.off(eventType, wrappedCallback);
    };
  }, [eventType, ...deps]);
};

export const useRealtimeData = (queryKey, refetchFn) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Listen for data changes and trigger refetch
  useWebSocketEvent('appointment_change', () => {
    if (queryKey.includes('appointment')) {
      setIsRefreshing(true);
      refetchFn().finally(() => setIsRefreshing(false));
    }
  });

  useWebSocketEvent('patient_change', () => {
    if (queryKey.includes('patient')) {
      setIsRefreshing(true);
      refetchFn().finally(() => setIsRefreshing(false));
    }
  });

  useWebSocketEvent('daily_note_change', () => {
    if (queryKey.includes('daily') || queryKey.includes('note')) {
      setIsRefreshing(true);
      refetchFn().finally(() => setIsRefreshing(false));
    }
  });

  useWebSocketEvent('progress_change', () => {
    if (queryKey.includes('progress')) {
      setIsRefreshing(true);
      refetchFn().finally(() => setIsRefreshing(false));
    }
  });

  useWebSocketEvent('notification', () => {
    if (queryKey.includes('notification')) {
      setIsRefreshing(true);
      refetchFn().finally(() => setIsRefreshing(false));
    }
  });

  useWebSocketEvent('profile_change', () => {
    if (queryKey.includes('profile') || queryKey.includes('Profile') || queryKey.includes('user')) {
      setIsRefreshing(true);
      refetchFn().finally(() => setIsRefreshing(false));
    }
  });

  // Listen for settings changes
  useWebSocketEvent('settings_change', () => {
    if (queryKey.includes('settings')) {
      setIsRefreshing(true);
      refetchFn().finally(() => setIsRefreshing(false));
    }
  });

  // Listen for home exercise changes
  useWebSocketEvent('home_exercise_change', () => {
    if (queryKey.includes('exercise') || queryKey.includes('Exercise')) {
      setIsRefreshing(true);
      refetchFn().finally(() => setIsRefreshing(false));
    }
  });

  // Listen for proof changes
  useWebSocketEvent('proof_change', () => {
    if (queryKey.includes('proof') || queryKey.includes('Proof')) {
      setIsRefreshing(true);
      refetchFn().finally(() => setIsRefreshing(false));
    }
  });

  // Listen for exercise assignment
  useWebSocketEvent('exercise_assigned', () => {
    if (queryKey.includes('exercise') || queryKey.includes('Exercise')) {
      setIsRefreshing(true);
      refetchFn().finally(() => setIsRefreshing(false));
    }
  });

  // Listen for proof submission
  useWebSocketEvent('proof_submitted', () => {
    if (queryKey.includes('proof') || queryKey.includes('Proof')) {
      setIsRefreshing(true);
      refetchFn().finally(() => setIsRefreshing(false));
    }
  });

  // Listen for proof review
  useWebSocketEvent('proof_reviewed', () => {
    if (queryKey.includes('proof') || queryKey.includes('Proof')) {
      setIsRefreshing(true);
      refetchFn().finally(() => setIsRefreshing(false));
    }
  });

  return { isRefreshing };
};

export default useWebSocket;
