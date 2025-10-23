import { definePluginConfig } from '~/plugins/shared/utils/config';

import { Api } from './api';
import { handler, handlerLegacy } from './plugin';
import type { TriggerExtractorPlugin } from './types';

export const defaultConfig: TriggerExtractorPlugin['Config'] = {
  api: new Api({
    name: '@hey-api/trigger-extractor',
  }),
  config: {
    exportFromIndex: true,
    name: '@hey-api/trigger-extractor',
    output: 'triggers',
  },
  handler,
  handlerLegacy,
  name: '@hey-api/trigger-extractor',
};

/**
 * Type helper for `@hey-api/trigger-extractor` plugin, returns {@link Plugin.Config} object
 */
export const defineConfig = definePluginConfig(defaultConfig);
