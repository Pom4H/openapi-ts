import type { DefinePlugin, Plugin } from '~/plugins/types';

import type { IApi } from './api';

export type UserConfig = Plugin.Name<'@hey-api/trigger-extractor'> &
  Plugin.Hooks & {
    /**
     * Should the exports from the generated files be re-exported in the index
     * barrel file?
     *
     * @default true
     */
    exportFromIndex?: boolean;
    /**
     * Output file name for triggers
     *
     * @default 'triggers.gen'
     */
    output?: string;
  };

export type TriggerExtractorPlugin = DefinePlugin<
  UserConfig,
  UserConfig,
  IApi
>;

/**
 * Trigger kind classification
 */
export type TriggerKind =
  | 'operation' // Regular endpoints (GET, POST, etc.)
  | 'webhook' // Incoming webhooks
  | 'callback' // Outgoing callbacks
  | 'subscription' // Webhook registration + delivery (register + callback)
  | 'stream'; // SSE/WebSocket

/**
 * Transport type for streams
 */
export type TransportType = 'sse' | 'websocket' | 'http';

/**
 * Authorization scheme
 */
export interface AuthScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect' | 'mutualTLS';
  name: string;
  in?: 'header' | 'query' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
  flows?: Record<string, any>;
  openIdConnectUrl?: string;
  description?: string;
}

/**
 * Server information
 */
export interface ServerInfo {
  url: string;
  description?: string;
  variables?: Record<string, any>;
}

/**
 * Normalized trigger entity
 */
export interface Trigger {
  id: string; // Unique identifier (operationId or generated)
  kind: TriggerKind;
  method?: string; // HTTP method (for operations)
  path: string; // URL path or pattern
  summary?: string;
  description?: string;
  tags?: string[];
  
  // Servers (merged by priority: operation > path > root)
  servers?: ServerInfo[];
  
  // Security (merged by priority: operation > path > root)
  security?: string[][]; // Security requirement objects
  
  // Parameters and body
  parameters?: {
    path?: Record<string, any>;
    query?: Record<string, any>;
    header?: Record<string, any>;
    cookie?: Record<string, any>;
  };
  requestBody?: any;
  responses?: Record<string, any>;
  
  // Subscription-specific
  subscriptionRegister?: string; // Operation ID of registration endpoint
  subscriptionCallback?: string; // Callback name
  
  // Stream-specific
  transport?: TransportType;
  
  // Extensions
  extensions?: {
    'x-route'?: string;
    'x-transport'?: TransportType;
    'x-topic'?: string;
    [key: string]: any;
  };
  
  // Original OpenAPI object reference
  original?: any;
}

/**
 * Output structure for triggers.gen.ts
 */
export interface TriggersOutput {
  triggers: Trigger[];
  byKind: Record<TriggerKind, Trigger[]>;
  authMap: Record<string, AuthScheme>;
  meta: {
    openApiVersion: string;
    title?: string;
    version?: string;
    generatedAt: string;
  };
}
