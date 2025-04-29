/// <reference types='@types/bun' />
import pkg from './package.json' assert { type: 'json' }
import { builtinModules } from 'module'
import { BuildConfig } from 'bun'

interface BuilderConfig {
  entrypoints?: string[] | string
  outdir?: string
  format?: 'esm' | 'cjs'
  target?: 'node' | 'bun'
  external?: string[]
  sourcemap?: 'inline' | 'external' | boolean
  splitting?: boolean
  pkg: {
    dependencies?: Record<string, string>
    peerDependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }
  define?: Record<string, string>
}

// Функция для Bun
export function createBunConfig(config: BuilderConfig): BuildConfig {
  const {
    pkg,
    entrypoints = ['src/index.ts'],
    outdir = './dist',
    target = 'node',
    format = 'cjs',
    external = [],
    define = {
      PRODUCTION: JSON.stringify(process.env.NODE_ENV === 'production'),
    },
    splitting = true,
    sourcemap = 'inline',
  } = config

  const bunConfig: BuildConfig = {
    entrypoints: Array.isArray(entrypoints) ? entrypoints : [entrypoints],
    target,
    define,
    external: Object.keys(pkg.dependencies || {})
      .concat(Object.keys(pkg.peerDependencies || {}))
      .concat(Object.keys(pkg.devDependencies || {}))
      .concat(builtinModules)
      .concat(external),
    outdir,
    format,
    splitting,
    sourcemap,
    minify: {
      whitespace: false,
      syntax: false,
      identifiers: false,
    },
  }

  return bunConfig
}

const entrypoints = ['src/index.ts']

// Create a Bun config from package.json
const config = createBunConfig({
  pkg,
  entrypoints,
})
const result = await Bun.build(config)

if (!result.success) {
  throw new AggregateError(result.logs, 'Build failed')
}
