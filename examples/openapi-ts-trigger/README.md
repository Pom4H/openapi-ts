# @hey-api/trigger-extractor Example

This example demonstrates the `@hey-api/trigger-extractor` plugin for `@hey-api/openapi-ts`.

## Overview

The trigger-extractor plugin analyzes OpenAPI specifications and extracts all server triggers into a convenient data structure. It normalizes different types of triggers:

- **operation** - Regular HTTP endpoints (GET, POST, etc.)
- **webhook** - Incoming webhooks
- **callback** - Outgoing callbacks
- **subscription** - Webhook registration + delivery patterns
- **stream** - Server-Sent Events (SSE) and WebSocket connections

## Features

- ✅ Extracts triggers from `paths`, `webhooks`, `callbacks`
- ✅ Normalizes authentication schemes from `components.securitySchemes`
- ✅ Merges `servers` and `security` by priority (operation > path > root)
- ✅ Detects subscriptions using heuristics (`/subscribe`, `callbackUrl`, `x-topic`)
- ✅ Supports custom extensions (`x-route`, `x-transport`, `x-topic`)
- ✅ Generates TypeScript types and data structures
- ✅ No code generation - pure data extraction

## Generated Output

The plugin generates a single `triggers.gen.ts` file with:

```typescript
export const triggers: Trigger[]        // All triggers
export const byKind: Record<TriggerKind, Trigger[]>  // Grouped by kind
export const authMap: Record<string, AuthScheme>     // Auth schemes
export const meta: {                    // Metadata
  openApiVersion: string;
  title?: string;
  version?: string;
  generatedAt: string;
}
```

## Usage

### 1. Install dependencies

```bash
pnpm install
```

### 2. Generate triggers

```bash
pnpm run openapi-ts
```

### 3. Use in your application

```typescript
import { triggers, byKind, authMap } from './src/client/triggers.gen';

// Get all operations
const operations = byKind.operation;

// Get all webhooks
const webhooks = byKind.webhook;

// Get all streams (SSE/WebSocket)
const streams = byKind.stream;

// Get authentication schemes
console.log(authMap);

// Register routes in any framework (e.g., Hono)
import { Hono } from 'hono';

const app = new Hono();

for (const trigger of operations) {
  app.on(trigger.method!, trigger.path, async (c) => {
    // Your handler logic here
    return c.json({ message: 'OK' });
  });
}
```

## Example Spec

This example uses the Google Docs API OpenAPI specification as a demonstration.

## Configuration

The plugin is configured in `openapi-ts.config.ts`:

```typescript
{
  name: '@hey-api/trigger-extractor',
  output: 'triggers.gen',
  exportFromIndex: true,
}
```

### Options

- `output` - Output file name (default: `triggers.gen`)
- `exportFromIndex` - Re-export from index barrel file (default: `true`)

## Custom Extensions

The plugin supports custom OpenAPI extensions:

- `x-route` - Custom route override
- `x-transport` - Transport type (`sse`, `websocket`, `http`)
- `x-topic` - Topic/channel for subscriptions

Example:

```yaml
paths:
  /events:
    get:
      x-transport: sse
      responses:
        '200':
          content:
            text/event-stream:
              schema:
                type: string
```

## Subscription Detection

The plugin automatically detects subscription patterns:

1. Path contains `/subscribe`, `/subscriptions`, or `/webhook`
2. Has `x-topic` extension
3. Has `callbackUrl` parameter

## Framework Integration

The extracted triggers can be used with any web framework:

### Hono

```typescript
import { Hono } from 'hono';
import { triggers } from './client/triggers.gen';

const app = new Hono();

for (const trigger of triggers) {
  if (trigger.kind === 'operation' && trigger.method) {
    app.on(trigger.method, trigger.path, async (c) => {
      // Handler
    });
  }
}
```

### Express

```typescript
import express from 'express';
import { triggers } from './client/triggers.gen';

const app = express();

for (const trigger of triggers) {
  if (trigger.kind === 'operation' && trigger.method) {
    app[trigger.method.toLowerCase()](trigger.path, (req, res) => {
      // Handler
    });
  }
}
```

### Fastify

```typescript
import Fastify from 'fastify';
import { triggers } from './client/triggers.gen';

const fastify = Fastify();

for (const trigger of triggers) {
  if (trigger.kind === 'operation' && trigger.method) {
    fastify.route({
      method: trigger.method,
      url: trigger.path,
      handler: async (request, reply) => {
        // Handler
      }
    });
  }
}
```

## License

MIT
