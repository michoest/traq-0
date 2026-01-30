module.exports = {
    apps: [{
        name: 'traq-0-api',
        script: 'src/index.js',
        env: {
            NODE_ENV: 'production',
            PORT: 3002,
        },
        // Restart behavior
        exp_backoff_restart_delay: 100,
        max_memory_restart: '100M'
    }]
};
