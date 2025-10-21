#!/usr/bin/env node

/**
 * Fix script for dashboard performance and WebSocket issues
 * This script addresses multiple performance and connection issues
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 TherapEase Dashboard Performance Fix');
console.log('======================================');

// Paths to files that need fixing
const filesToFix = [
  'client/src/services/websocketService.js',
  'client/src/context/AuthContext.js',
  'server/services/websocketService.js'
];

console.log('\n🔍 Step 1: Fixing WebSocket connection issues...');

// Fix WebSocket service to prevent authentication loops
const websocketServicePath = path.join(__dirname, 'client', 'src', 'services', 'websocketService.js');

if (fs.existsSync(websocketServicePath)) {
  let content = fs.readFileSync(websocketServicePath, 'utf8');
  
  // Add better error handling and prevent infinite reconnection loops
  const fixedContent = content.replace(
    /scheduleReconnect\(token\) \{[\s\S]*?\}/,
    `scheduleReconnect(token) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('🔌 Max reconnection attempts reached, stopping reconnection');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s
    
    console.log(\`🔄 Attempting to reconnect (\${this.reconnectAttempts}/\${this.maxReconnectAttempts}) in \${delay}ms\`);
    
    setTimeout(() => {
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.connect(token);
      }
    }, delay);
  }`
  );
  
  // Add connection state management
  const enhancedContent = fixedContent.replace(
    /class WebSocketService \{[\s\S]*?constructor\(\) \{/,
    `class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3; // Reduced from 5 to 3
    this.isConnecting = false;
    this.connectionState = 'disconnected';
    this.listeners = new Map();
    this.lastToken = null; // Store last token to prevent auth loops`
  );
  
  fs.writeFileSync(websocketServicePath, enhancedContent);
  console.log('✅ WebSocket service enhanced with better error handling');
}

console.log('\n🔍 Step 2: Fixing AuthContext to prevent WebSocket loops...');

// Fix AuthContext to prevent WebSocket connection loops
const authContextPath = path.join(__dirname, 'client', 'src', 'context', 'AuthContext.js');

if (fs.existsSync(authContextPath)) {
  let content = fs.readFileSync(authContextPath, 'utf8');
  
  // Add WebSocket connection management
  const enhancedContent = content.replace(
    /\/\/ Initialize WebSocket connection\n\s*websocketService\.connect\(storedToken\);/,
    `// Initialize WebSocket connection with error handling
    try {
      websocketService.connect(storedToken);
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      // Don't fail login if WebSocket fails
    }`
  );
  
  // Add WebSocket connection management in login function
  const loginEnhanced = enhancedContent.replace(
    /\/\/ Initialize WebSocket connection\n\s*websocketService\.connect\(data\.data\.token\);/,
    `// Initialize WebSocket connection with error handling
    try {
      websocketService.connect(data.data.token);
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      // Don't fail login if WebSocket fails
    }`
  );
  
  fs.writeFileSync(authContextPath, loginEnhanced);
  console.log('✅ AuthContext enhanced with WebSocket error handling');
}

console.log('\n🔍 Step 3: Fixing server WebSocket authentication...');

// Fix server WebSocket service
const serverWebSocketPath = path.join(__dirname, 'server', 'services', 'websocketService.js');

if (fs.existsSync(serverWebSocketPath)) {
  let content = fs.readFileSync(serverWebSocketPath, 'utf8');
  
  // Add better JWT secret handling
  const enhancedContent = content.replace(
    /try \{\n\s*const decoded = jwt\.verify\(token, process\.env\.JWT_SECRET\);/,
    `try {
      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
      const decoded = jwt.verify(token, jwtSecret);`
  );
  
  // Add better error logging
  const errorEnhanced = enhancedContent.replace(
    /console\.error\('❌ WebSocket token verification failed:', error\.message\);/,
    `console.error('❌ WebSocket token verification failed:', error.message);
      console.error('JWT Secret available:', !!process.env.JWT_SECRET);
      console.error('Token length:', token ? token.length : 0);`
  );
  
  fs.writeFileSync(serverWebSocketPath, errorEnhanced);
  console.log('✅ Server WebSocket service enhanced with better JWT handling');
}

console.log('\n🔍 Step 4: Creating optimized API configuration...');

// Create optimized API configuration
const apiConfigPath = path.join(__dirname, 'client', 'src', 'config', 'apiConfig.js');

const apiConfigContent = `// Optimized API configuration for better performance
export const API_CONFIG = {
  // Reduce retry attempts to prevent performance issues
  retryAttempts: 2,
  retryDelay: 1000,
  
  // Optimize request timeouts
  timeout: 10000,
  
  // Disable WebSocket for non-critical features
  enableWebSocket: false,
  
  // Cache configuration
  cacheTime: 5 * 60 * 1000, // 5 minutes
  staleTime: 2 * 60 * 1000, // 2 minutes
  
  // Request optimization
  debounceTime: 300,
  maxConcurrentRequests: 5
};

// WebSocket configuration
export const WEBSOCKET_CONFIG = {
  maxReconnectAttempts: 3,
  reconnectDelay: 2000,
  connectionTimeout: 5000,
  enableHeartbeat: true,
  heartbeatInterval: 30000
};
`;

if (!fs.existsSync(path.dirname(apiConfigPath))) {
  fs.mkdirSync(path.dirname(apiConfigPath), { recursive: true });
}

fs.writeFileSync(apiConfigPath, apiConfigContent);
console.log('✅ API configuration created');

console.log('\n🔍 Step 5: Creating performance optimization script...');

// Create performance optimization script
const perfScriptPath = path.join(__dirname, 'optimize-dashboard-performance.js');

const perfScriptContent = `#!/usr/bin/env node

/**
 * Dashboard Performance Optimization Script
 * This script optimizes the dashboard for better performance
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Optimizing Dashboard Performance...');

// Optimize React Query configuration
const optimizeReactQuery = () => {
  const queryConfigPath = path.join(__dirname, 'client', 'src', 'config', 'queryConfig.js');
  
  const queryConfig = \`// Optimized React Query configuration
import { QueryClient } from 'react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reduce refetch frequency
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
      
      // Optimize caching
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 5 * 60 * 1000, // 5 minutes
      
      // Reduce retry attempts
      retry: 2,
      retryDelay: 1000,
      
      // Disable background refetch for better performance
      refetchInterval: false,
      refetchIntervalInBackground: false
    },
    mutations: {
      retry: 1,
      retryDelay: 1000
    }
  }
});
\`;
  
  if (!fs.existsSync(path.dirname(queryConfigPath))) {
    fs.mkdirSync(path.dirname(queryConfigPath), { recursive: true });
  }
  
  fs.writeFileSync(queryConfigPath, queryConfig);
  console.log('✅ React Query configuration optimized');
};

// Optimize WebSocket service
const optimizeWebSocket = () => {
  const wsServicePath = path.join(__dirname, 'client', 'src', 'services', 'websocketService.js');
  
  if (fs.existsSync(wsServicePath)) {
    let content = fs.readFileSync(wsServicePath, 'utf8');
    
    // Add performance optimizations
    const optimizedContent = content.replace(
      /this\.maxReconnectAttempts = 5;/,
      'this.maxReconnectAttempts = 3;'
    ).replace(
      /setTimeout\(\(\) => \{[\s\S]*?\}, 5000\);/,
      'setTimeout(() => { this.connect(token); }, 2000);'
    );
    
    fs.writeFileSync(wsServicePath, optimizedContent);
    console.log('✅ WebSocket service optimized');
  }
};

// Run optimizations
optimizeReactQuery();
optimizeWebSocket();

console.log('🏁 Dashboard performance optimization complete!');
`;

fs.writeFileSync(perfScriptPath, perfScriptContent);
fs.chmodSync(perfScriptPath, '755');
console.log('✅ Performance optimization script created');

console.log('\n🏁 Dashboard performance fix complete!');
console.log('\n📋 Summary of optimizations:');
console.log('1. ✅ Enhanced WebSocket error handling');
console.log('2. ✅ Reduced reconnection attempts (5 → 3)');
console.log('3. ✅ Added exponential backoff for reconnections');
console.log('4. ✅ Improved JWT secret handling');
console.log('5. ✅ Added API configuration for performance');
console.log('6. ✅ Created performance optimization script');
console.log('\n🔧 Next steps:');
console.log('1. Run: node optimize-dashboard-performance.js');
console.log('2. Rebuild frontend: npm run build');
console.log('3. Restart server: pm2 restart all');
console.log('4. Test dashboard performance');
console.log('\n📋 Expected improvements:');
console.log('- Faster dashboard loading');
console.log('- Reduced WebSocket connection errors');
console.log('- Better error handling');
console.log('- Improved user experience');
