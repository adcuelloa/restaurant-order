import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/main.ts', 'src/lambda.ts'],
  format: 'esm',
  clean: true,
  sourcemap: true,
  target: 'esnext',
});
