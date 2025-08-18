/**
 * Simple test for socket functionality
 * Run this to test the socket connection
 */

import { SodularClient } from './index';

async function testSocketConnection() {
  console.log('🔌 Testing Socket Connection...');
  
  try {
    // Initialize client
    const client = SodularClient({
      baseUrl: 'http://localhost:5001/api/v1'
    });

    // Connect
    const { isReady, error, client: sodularClient } = await client.connect();
    
    if (!isReady) {
      console.error('❌ Connection failed:', error);
      return;
    }

    console.log('✅ Connected to server');

    // Test socket methods
    console.log('🔌 Testing socket methods...');
    
    // Test global event listening
    sodularClient.on('test', (data) => {
      console.log('📡 Received test event:', data);
    });

    // Test channel joining
    const testDatabaseId = 'test-db';
    const testTableId = 'test-table';
    
    console.log(`🔗 Joining channel: database=${testDatabaseId}, table=${testTableId}`);
    sodularClient.joinChannel(testDatabaseId, testTableId);

    // Test ref API event listening
    console.log('📡 Setting up ref event listeners...');
    sodularClient.ref.from(testTableId)
      .on('created', (data) => {
        console.log('🆕 Ref created:', data);
      })
      .on('replaced', (data) => {
        console.log('🔄 Ref replaced:', data);
      })
      .on('patched', (data) => {
        console.log('🔧 Ref patched:', data);
      })
      .on('deleted', (data) => {
        console.log('🗑️ Ref deleted:', data);
      });

    console.log('✅ Socket test setup complete');
    console.log('📡 Listening for events...');
    console.log('💡 Make some API calls to see events in action');
    console.log('⏹️ Press Ctrl+C to stop');

    // Keep the process alive
    process.stdin.resume();

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSocketConnection();


