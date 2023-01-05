const { build } = require('estrella')

const define = {
  DEBUG: 'false',
}

build({
  define,
  color: true,
  entryPoints: ['./src/index.ts'],
  outfile: './esbuild/index.js',
  format: 'cjs',
  minify: true,
  bundle: true,
  sourcemap: true,
  tsconfig: './tsconfig.json',
  platform: 'node',
  logLevel: 'error',
  external: ['node_modules/*'],
}).catch(() => process.exit(1))
