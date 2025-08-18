/**
 * Example: Using Socket Events with RefAPI
 * This demonstrates how to listen to real-time events when refs are created, updated, or deleted
 */

import { SodularClient } from '../index';

async function exampleSocketUsage() {
  // Initialize the client
  const client = SodularClient({
    baseUrl: 'http://localhost:5001/api/v1'
  });

  // Connect to the server
  const { isReady, error, client: sodularClient } = await client.connect();
  
  if (!isReady) {
    console.error('Failed to connect:', error);
    return;
  }

  // Set database context
  sodularClient.use('your-database-id');

  // set token 
  sodularClient.setToken('your-token');

  // Listen to events for a specific table
  const tableId = 'your-table-id';
  
  // Listen to ref creation events
  sodularClient.ref.from(tableId).on('created', (data) => {
    console.log('New ref created:', data);
  });

  // Listen to ref update events (replaced)
  sodularClient.ref.from(tableId).on('replaced', (data) => {
    console.log('Ref replaced:', data);
  });

  // Listen to ref update events (patched)
  sodularClient.ref.from(tableId).on('patched', (data) => {
    console.log('Ref patched:', data);
  });

  // Listen to ref deletion events
  sodularClient.ref.from(tableId).on('deleted', (data) => {
    console.log('Ref deleted:', data);
  });

  // Alternative: Use the client directly for global events
  sodularClient.on('created', (data) => {
    console.log('Global created event:', data);
  });

  // Join a specific channel manually
  sodularClient.joinChannel('your-database-id', 'your-table-id');

  // Later, you can stop listening to specific events
  sodularClient.ref.from(tableId).off('created');

  // Or stop listening to all events for a table
  sodularClient.ref.from(tableId).off();

  // Leave a channel manually
  sodularClient.leaveChannel('your-database-id', 'your-table-id');
}

// Example with error handling
async function exampleWithErrorHandling() {
  try {
    const client = SodularClient({
      baseUrl: 'http://localhost:5001/api/v1'
    });

    const { isReady, error, client: sodularClient } = await client.connect();
    
    if (!isReady) {
      throw new Error(`Connection failed: ${error}`);
    }

    // Set up event listeners
    const tableId = 'users-table';
    
    sodularClient.ref.from(tableId)
      .on('created', (data) => {
        console.log('User created:', data);
        // Handle new user creation
      })
      .on('updated', (data) => {
        console.log('User updated:', data);
        // Handle user updates
      })
      .on('deleted', (data) => {
        console.log('User deleted:', data);
        // Handle user deletion
      });

    console.log('Listening to user table events...');
    
  } catch (error) {
    console.error('Error in socket example:', error);
  }
}

export { exampleSocketUsage, exampleWithErrorHandling };

