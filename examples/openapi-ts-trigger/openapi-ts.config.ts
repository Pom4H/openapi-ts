import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: './google-calendar-api.json',
  output: {
    path: './src/client',
  },
  plugins: [
    {
      name: '@hey-api/trigger-extractor',
      output: 'triggers',
      exportFromIndex: true,
    },
    {
      enums: 'javascript',
      name: '@hey-api/typescript',
    },
  ],
});
