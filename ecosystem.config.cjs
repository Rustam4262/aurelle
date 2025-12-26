// PM2 Configuration File for AURELLE
module.exports = {
  apps: [
    {
      name: 'aurelle',
      script: 'dist/index.cjs',
      instances: 'max', // Используем все доступные CPU
      exec_mode: 'cluster',

      // Environment variables
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },

      // Auto restart settings
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,

      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Advanced features
      autorestart: true,
      watch: false, // Don't watch in production
      ignore_watch: ['node_modules', 'logs', '.git'],

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/aurelle.git',
      path: '/var/www/aurelle',
      'post-deploy':
        'npm install && npm run build && pm2 reload ecosystem.config.cjs --env production && pm2 save',
      'pre-setup': 'apt-get install git -y',
    },
  },
};
