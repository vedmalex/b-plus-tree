/// <reference types='@types/bun' />
import path from 'path'
import { createBunConfig, createConfig } from './bun.config.ts'
import pkg from './package.json' assert { type: 'json' }
import { mkdir, copyFile, rm } from 'fs/promises'

const entrypoints = ['src/index.ts']
const format = process.env.FORMAT || 'cjs'

if (process.env.TOOL === 'bun') {
  // Create a Bun config from package.json
  const outdir = format === 'esm' ? './dist/esm' : './dist'

  const config = createBunConfig({
    pkg: pkg as any,
    entrypoints,
    sourcemap: 'external',
    format: format as 'cjs' | 'esm',
    outdir,
  })

  const result = await Bun.build(config)

  if (!result.success) {
    throw new AggregateError(result.logs, 'Build failed')
  }

  // Если это ESM формат, переименуем файл
  if (format === 'esm') {
    const outputFile = path.basename(entrypoints[0])
    const outputName = outputFile.replace(/\.[^/.]+$/, '') // Удаляем расширение
    const esmPath = path.join(outdir, outputName + '.js')
    const targetPath = './dist/' + outputName + '.esm.js'

    await mkdir(path.dirname(targetPath), { recursive: true })
    await copyFile(esmPath, targetPath)
    await rm(outdir, { recursive: true, force: true })
  }
} else {
  const { build } = await import('esbuild')

  // Для esbuild
  // Определяем выходную директорию в зависимости от формата
  const outdir = format === 'esm' ? './dist/esm' : './dist'
  const outputFile = path.basename(entrypoints[0])
  const outputName = outputFile.replace(/\.[^/.]+$/, '') // Удаляем расширение

  const esbuildConfig = createConfig({
    pkg: pkg as any,
    entrypoints,
    format: format as 'cjs' | 'esm',
    outdir,
  })

  await build(esbuildConfig)

  // Если это ESM формат, переименуем файл
  if (format === 'esm') {
    const esmPath = path.join(outdir, outputName + '.js')
    const targetPath = './dist/' + outputName + '.esm.js'

    await mkdir(path.dirname(targetPath), { recursive: true })
    await copyFile(esmPath, targetPath)
    await rm(outdir, { recursive: true, force: true })
  }
}
