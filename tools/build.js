const { build } = require('esbuild')

const define = {
  DEBUG: 'false',
}

build({
  define,
  color: true,
  entryPoints: ['./src/index.ts'],
  outfile: './dist/index.js',
  // minify: true,
  bundle: true,
  sourcemap: true,
  tsconfig: './tsconfig.bundle',
  platform: 'node',
  logLevel: 'error',
  external: ['node_modules/*'],
}).catch(() => process.exit(1))
