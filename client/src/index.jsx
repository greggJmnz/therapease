import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// Global error handlers for iOS Safari debugging
// Catch CSP violations and other errors that might cause white page
window.addEventListener('error', (event) => {
  console.error('Global Error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
    stack: event.error?.stack
  });
  
  // Check if it's a CSP violation
  if (event.message && (
    event.message.includes('Content Security Policy') ||
    event.message.includes('CSP') ||
    event.message.includes('violates') ||
    event.message.includes('Refused to')
  )) {
    console.error('🚨 CSP VIOLATION DETECTED:', event.message);
    console.error('This is likely causing the white page on iOS');
  }
}, true);

// Catch unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', {
    reason: event.reason,
    message: event.reason?.message,
    stack: event.reason?.stack
  });
  
  // Check if it's a CSP-related rejection
  if (event.reason?.message && (
    event.reason.message.includes('Content Security Policy') ||
    event.reason.message.includes('CSP') ||
    event.reason.message.includes('violates') ||
    event.reason.message.includes('Refused to')
  )) {
    console.error('🚨 CSP VIOLATION IN PROMISE:', event.reason.message);
  }
});

// Safely render the app with error handling for iOS Safari
try {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  const root = ReactDOM.createRoot(rootElement);
  
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  // If React rendering fails, show a fallback message
  console.error('Failed to render React app:', error);
  
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div>
          <h1 style="color: #ef4444; margin-bottom: 16px;">Unable to Load Application</h1>
          <p style="color: #6b7280; margin-bottom: 24px;">An error occurred while loading the application. Please try refreshing the page.</p>
          <p style="color: #9ca3af; font-size: 0.875rem; margin-bottom: 16px;">Error: ${error.message}</p>
          <button onclick="window.location.reload()" style="background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 16px;">
            Refresh Page
          </button>
        </div>
      </div>
    `;
  }
}
