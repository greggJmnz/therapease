module.exports = {
  apps: [
    {
      name: 'therapease-api',
      script: 'server/index.js',
      cwd: '/home/therapease_user/therapease', // Explicit working directory
      instances: 1, // Single instance for better WebSocket compatibility and resource efficiency
      exec_mode: 'fork',
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_file: './logs/api-combined.log',
      time: true,
      merge_logs: true,
      // Advanced PM2 features for production
      watch: false,
      ignore_watch: ['node_modules', 'logs', '*.log'],
      autorestart: true,
      // Optimize for production
      node_args: [
        '--max-old-space-size=1024',
        '--optimize-for-size'
      ]
    },
    {
      name: 'therapease-public',
      script: 'public-website/server.js',
      cwd: '/home/therapease_user/therapease', // Explicit working directory
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/public-error.log',
      out_file: './logs/public-out.log',
      log_file: './logs/public-combined.log',
      time: true,
      merge_logs: true,
      watch: false,
      autorestart: true
    }
  ]
};
