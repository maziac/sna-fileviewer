//require('dotenv').config();  // Load environment variables from .env file

const esbuild = require('esbuild');
const {SourceMap} = require('module');
const {format} = require('path');

// Detect arguments
const watchMode = process.argv.includes('--watch');
const sourcemap = process.argv.includes('--sourcemap');

const buildOptions = {
    entryPoints: ['src/extension.ts'],
    bundle: true,
    outdir: 'out',
    external: ['vscode'],
    format: 'cjs',
    platform: 'node',
    sourcemap: sourcemap,
    define: {
        // Inject the environment variable into your code
        'process.env.USAGE_CONNECTION': JSON.stringify(process.env.SNAFILEVIEWER_USAGE_CONNECTION) ?? "''",
    },
};

if (watchMode) {
    esbuild.context(buildOptions).then(ctx => {
        ctx.watch();
        console.log('[watch] build finished, watching for changes...');
    }).catch(() => process.exit(1));
} else {
    esbuild.build(buildOptions)
        .then(() => console.log('✅ Build complete.'))
        .catch(() => process.exit(1));
}
