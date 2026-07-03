module.exports = {
    apps: [
        {
            name: 'lingocon',
            script: 'node_modules/next/dist/bin/next',
            args: 'start',
            instances: 'max',
            exec_mode: 'cluster',
            env: {
                NODE_ENV: 'production',
                PORT: 3000
            }
        },
        {
            name: 'lingocon-worker',
            script: 'node_modules/.bin/tsx',
            args: 'scripts/worker.ts',
            instances: 1,
            exec_mode: 'fork',
            // PM2's default ~1.6s SIGKILL window is too short to let an
            // in-flight job finish. 30s covers Wave 0 handlers; anything
            // beyond that is protected by the queue's stale-claim reclaim.
            kill_timeout: 30000,
            env: {
                NODE_ENV: 'production'
            }
        }
    ]
};
