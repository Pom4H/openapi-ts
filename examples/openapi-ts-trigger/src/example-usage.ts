/**
 * Example usage of the generated triggers data
 */

import { authMap, byKind, meta, triggers } from './client';

// Log metadata
console.log('API:', meta.title, meta.version);
console.log('Generated at:', meta.generatedAt);
console.log('Total triggers:', triggers.length);

// Count triggers by kind
console.log('\nTriggers by kind:');
console.log('- Operations:', byKind.operation.length);
console.log('- Webhooks:', byKind.webhook.length);
console.log('- Callbacks:', byKind.callback.length);
console.log('- Subscriptions:', byKind.subscription.length);
console.log('- Streams:', byKind.stream.length);

// List all authentication schemes
console.log('\nAuthentication schemes:');
for (const [name, scheme] of Object.entries(authMap)) {
  console.log(`- ${name}: ${scheme.type}`);
}

// Show a few example operations
console.log('\nExample operations (first 5):');
byKind.operation.slice(0, 5).forEach((trigger) => {
  console.log(`- ${trigger.method} ${trigger.path}`);
  if (trigger.summary) {
    console.log(`  ${trigger.summary}`);
  }
});

// Example: Register routes in Hono (pseudocode)
/*
import { Hono } from 'hono';

const app = new Hono();

for (const trigger of byKind.operation) {
  if (trigger.method && trigger.path) {
    app.on(trigger.method, trigger.path, async (c) => {
      // Your handler logic here
      return c.json({ message: 'OK' });
    });
  }
}

export default app;
*/
