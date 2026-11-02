import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';
import { opencodeConsole } from 'e2e/oauth/opencode-console';

export default {
  targets: [
    {
      engine: web(),
      app: {
        url: 'http://127.0.0.1:5173',
        command: {
          executable: 'node',
          args: [
            'node_modules/vite/bin/vite.js',
            '--host',
            '127.0.0.1',
            '--port',
            '5173',
            '--strictPort',
          ],
          log: '.e2e/logs/app.log',
        },
      },
    },
  ],
  timeout: 120_000,
  agents: {
    default: {
      model: opencodeConsole('deepseek-v4.1-flash'),
      system:
        'You are a meticulous QA agent for a Wellington electricity plan comparison app. All rates are GST-inclusive. Verify visible values, plan rankings, filters, current-plan savings, and peak-window behavior. Report only issues you can support with evidence from the screen.',
    },
  },
} satisfies E2EConfig;
