module.exports = {
  apps: [
    {
      name: 'therapease-api',
      script: './server/index.js',
      cwd: '/home/therapease/therapease',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      env_file: '/home/therapease/.env',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_file: './logs/api-combined.log',
      time: true,
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'therapease-public',
      script: './public-website/server.js',
      cwd: '/home/therapease/therapease',
      env: {
        NODE_ENV: 'production',
        PORT: 8080
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      error_file: './logs/public-error.log',
      out_file: './logs/public-out.log',
      log_file: './logs/public-combined.log',
      time: true,
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
