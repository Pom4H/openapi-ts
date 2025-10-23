import type { IR } from '~/ir/types';

import type {
  AuthScheme,
  ServerInfo,
  Trigger,
  TriggerKind,
  TransportType,
  TriggersOutput,
} from './types';

/**
 * Merge servers with priority: operation > path > root
 */
const mergeServers = (
  operationServers?: any[],
  pathServers?: any[],
  rootServers?: any[],
): ServerInfo[] | undefined => {
  const servers = operationServers || pathServers || rootServers;
  if (!servers || servers.length === 0) {
    return undefined;
  }
  
  return servers.map((server: any) => ({
    url: server.url,
    description: server.description,
    variables: server.variables,
  }));
};

/**
 * Merge security with priority: operation > path > root
 */
const mergeSecurity = (
  operationSecurity?: any[],
  pathSecurity?: any[],
  rootSecurity?: any[],
): string[][] | undefined => {
  const security = operationSecurity || pathSecurity || rootSecurity;
  if (!security) {
    return undefined;
  }
  
  return security.map((req: any) => Object.keys(req));
};

/**
 * Determine trigger kind based on heuristics
 */
const determineTriggerKind = (
  operation: any,
  path: string,
  isWebhook = false,
  isCallback = false,
): TriggerKind => {
  // Check x-transport extension
  const transport = operation['x-transport'] || operation.extensions?.['x-transport'];
  if (transport === 'sse' || transport === 'websocket') {
    return 'stream';
  }
  
  // Check for SSE in responses
  if (operation.responses) {
    for (const response of Object.values(operation.responses)) {
      const content = (response as any).content;
      if (content && (content['text/event-stream'] || content['application/stream+json'])) {
        return 'stream';
      }
    }
  }
  
  // Explicit webhook/callback
  if (isWebhook) {
    return 'webhook';
  }
  if (isCallback) {
    return 'callback';
  }
  
  // Subscription heuristics
  const hasSubscribeInPath = /\/(subscribe|subscriptions|webhook|watch)/i.test(path);
  const hasTopic = operation['x-topic'] || operation.extensions?.['x-topic'];
  const hasCallbackUrl = operation.parameters?.some(
    (p: any) => p.name === 'callbackUrl' || p.name === 'callback_url' || p.name === 'webhookUrl',
  );
  
  if (hasSubscribeInPath || hasTopic || hasCallbackUrl) {
    return 'subscription';
  }
  
  return 'operation';
};

/**
 * Determine transport type for streams
 */
const determineTransport = (operation: any): TransportType | undefined => {
  const transport = operation['x-transport'] || operation.extensions?.['x-transport'];
  if (transport) {
    return transport;
  }
  
  if (operation.responses) {
    for (const response of Object.values(operation.responses)) {
      const content = (response as any).content;
      if (content?.['text/event-stream']) {
        return 'sse';
      }
      if (content?.['application/stream+json']) {
        return 'sse';
      }
    }
  }
  
  return undefined;
};

/**
 * Extract extensions from an object
 */
const extractExtensions = (obj: any): Record<string, any> | undefined => {
  if (!obj) {
    return undefined;
  }
  
  const extensions: Record<string, any> = {};
  let hasExtensions = false;
  
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('x-')) {
      extensions[key] = value;
      hasExtensions = true;
    }
  }
  
  return hasExtensions ? extensions : undefined;
};

/**
 * Extract parameters from operation
 */
const extractParameters = (operation: any) => {
  if (!operation.parameters || operation.parameters.length === 0) {
    return undefined;
  }
  
  const params: any = {};
  
  for (const param of operation.parameters) {
    const location = param.in;
    if (!params[location]) {
      params[location] = {};
    }
    params[location][param.name] = {
      required: param.required,
      schema: param.schema,
      description: param.description,
    };
  }
  
  return Object.keys(params).length > 0 ? params : undefined;
};

/**
 * Extract triggers from IR
 */
export const extractTriggers = (
  ir: IR.Context,
  spec: any,
): TriggersOutput => {
  const triggers: Trigger[] = [];
  const authMap: Record<string, AuthScheme> = {};
  
  // Extract auth schemes from components.securitySchemes
  if (spec.components?.securitySchemes) {
    for (const [name, scheme] of Object.entries(spec.components.securitySchemes)) {
      const s = scheme as any;
      authMap[name] = {
        type: s.type,
        name: s.name || name,
        in: s.in,
        scheme: s.scheme,
        bearerFormat: s.bearerFormat,
        flows: s.flows,
        openIdConnectUrl: s.openIdConnectUrl,
        description: s.description,
      };
    }
  }
  
  // Root-level servers and security
  const rootServers = spec.servers;
  const rootSecurity = spec.security;
  
  // Process regular operations from paths
  if (spec.paths) {
    for (const [path, pathItem] of Object.entries(spec.paths)) {
      const pathObj = pathItem as any;
      const pathServers = pathObj.servers;
      const pathSecurity = pathObj.security;
      
      const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];
      
      for (const method of methods) {
        const operation = pathObj[method];
        if (!operation) continue;
        
        const operationId = operation.operationId || `${method}_${path.replace(/\W/g, '_')}`;
        const kind = determineTriggerKind(operation, path);
        
        const trigger: Trigger = {
          id: operationId,
          kind,
          method: method.toUpperCase(),
          path,
          summary: operation.summary,
          description: operation.description,
          tags: operation.tags,
          servers: mergeServers(operation.servers, pathServers, rootServers),
          security: mergeSecurity(operation.security, pathSecurity, rootSecurity),
          parameters: extractParameters(operation),
          requestBody: operation.requestBody,
          responses: operation.responses,
          extensions: extractExtensions(operation),
          original: operation,
        };
        
        if (kind === 'stream') {
          trigger.transport = determineTransport(operation);
        }
        
        triggers.push(trigger);
      }
    }
  }
  
  // Process webhooks
  if (spec.webhooks) {
    for (const [name, webhookItem] of Object.entries(spec.webhooks)) {
      const webhookObj = webhookItem as any;
      
      const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];
      
      for (const method of methods) {
        const operation = webhookObj[method];
        if (!operation) continue;
        
        const operationId = operation.operationId || `webhook_${name}_${method}`;
        
        const trigger: Trigger = {
          id: operationId,
          kind: 'webhook',
          method: method.toUpperCase(),
          path: `/{webhook}/${name}`,
          summary: operation.summary,
          description: operation.description,
          tags: operation.tags,
          servers: mergeServers(operation.servers, undefined, rootServers),
          security: mergeSecurity(operation.security, undefined, rootSecurity),
          parameters: extractParameters(operation),
          requestBody: operation.requestBody,
          responses: operation.responses,
          extensions: extractExtensions(operation),
          original: operation,
        };
        
        triggers.push(trigger);
      }
    }
  }
  
  // Process callbacks from operations
  if (spec.paths) {
    for (const [path, pathItem] of Object.entries(spec.paths)) {
      const pathObj = pathItem as any;
      const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];
      
      for (const method of methods) {
        const operation = pathObj[method];
        if (!operation?.callbacks) continue;
        
        for (const [callbackName, callback] of Object.entries(operation.callbacks)) {
          const callbackObj = callback as any;
          
          for (const [callbackPath, callbackPathItem] of Object.entries(callbackObj)) {
            const callbackPathObj = callbackPathItem as any;
            
            for (const callbackMethod of methods) {
              const callbackOperation = callbackPathObj[callbackMethod];
              if (!callbackOperation) continue;
              
              const operationId = callbackOperation.operationId || 
                `callback_${operation.operationId || method}_${callbackName}_${callbackMethod}`;
              
              const trigger: Trigger = {
                id: operationId,
                kind: 'callback',
                method: callbackMethod.toUpperCase(),
                path: callbackPath,
                summary: callbackOperation.summary,
                description: callbackOperation.description,
                tags: callbackOperation.tags,
                servers: mergeServers(callbackOperation.servers, undefined, rootServers),
                security: mergeSecurity(callbackOperation.security, undefined, rootSecurity),
                parameters: extractParameters(callbackOperation),
                requestBody: callbackOperation.requestBody,
                responses: callbackOperation.responses,
                extensions: extractExtensions(callbackOperation),
                original: callbackOperation,
              };
              
              triggers.push(trigger);
              
              // Create subscription pairing
              const registerOperationId = operation.operationId || `${method}_${path.replace(/\W/g, '_')}`;
              const existingRegister = triggers.find(t => t.id === registerOperationId);
              if (existingRegister && existingRegister.kind === 'subscription') {
                existingRegister.subscriptionCallback = operationId;
                trigger.subscriptionRegister = registerOperationId;
              }
            }
          }
        }
      }
    }
  }
  
  // Group triggers by kind
  const byKind: Record<TriggerKind, Trigger[]> = {
    operation: [],
    webhook: [],
    callback: [],
    subscription: [],
    stream: [],
  };
  
  for (const trigger of triggers) {
    byKind[trigger.kind].push(trigger);
  }
  
  return {
    triggers,
    byKind,
    authMap,
    meta: {
      openApiVersion: spec.openapi || spec.swagger || '3.1.0',
      title: spec.info?.title,
      version: spec.info?.version,
      generatedAt: new Date().toISOString(),
    },
  };
};
