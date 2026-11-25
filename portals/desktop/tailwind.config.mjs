import config from '../app/tailwind.config.mjs';
import { fileURLToPath } from 'node:url';

// Reuse the published-DS discovery, with roots independent of the caller's cwd.
const path = relative => fileURLToPath(new URL(relative, import.meta.url)).replaceAll('\\', '/');
export default {
  ...config,
  content: [
    ...config.content.filter(value => !value.startsWith('.')),
    path('./src/**/*.{ts,tsx}'),
    path('../packages/shared/src/**/*.{ts,tsx}'),
  ],
};
