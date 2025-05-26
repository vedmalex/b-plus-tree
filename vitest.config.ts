import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // Чтобы не импортировать describe, it, expect и т.д. в каждом файле
    environment: 'node', // или 'jsdom' если у вас есть DOM-зависимые тесты
    coverage: {
      provider: 'v8', // Corrected from 'c8' to 'v8'
      reporter: ['text', 'json', 'html'],
    },
    // Если нужно, настройте пути и другие опции
    // include: ['src/**/*.test.ts'],
  },
});
