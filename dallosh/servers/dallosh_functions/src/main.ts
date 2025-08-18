import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { getSodularClient } from './services/client';
import { refFunctions, reinitializeBot, isBotListening } from './api/ref';

// Make fetch available globally for browser compatibility
(global as any).fetch = fetch;

dotenv.config();

// Bot state management
let isRunning = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 5000; // 5 seconds

// Reconnection logic
async function attemptReconnection(): Promise<void> {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.log(`❌ Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Waiting longer before retrying...`);
    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
    reconnectAttempts = 0; // Reset counter
  }

  reconnectAttempts++;
  console.log(`🔄 Attempting to reconnect... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
  
  try {
    // Try to reinitialize the bot first
    const client = await getSodularClient();
    if (client) {
      const reinitSuccess = await reinitializeBot(client);
      if (reinitSuccess) {
        reconnectAttempts = 0; // Reset on successful reconnection
        console.log('✅ Bot reinitialization successful!');
        return;
      }
    }
    
    // If reinitialization fails, do a full restart
    await startBot();
    reconnectAttempts = 0; // Reset on successful connection
    console.log('✅ Full reconnection successful!');
  } catch (error) {
    console.error(`❌ Reconnection attempt ${reconnectAttempts} failed:`, error);
    
    // Schedule next reconnection attempt
    const delay = Math.min(RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1), 60000); // Exponential backoff, max 1 minute
    console.log(`⏳ Scheduling next reconnection attempt in ${delay}ms...`);
    
    setTimeout(() => {
      if (isRunning) {
        attemptReconnection();
      }
    }, delay);
  }
}

// Main bot startup function
async function startBot(): Promise<void> {
  try {
    console.log('🤖 Starting Dallosh Bot...');
    
    // Get Sodular client
    const client = await getSodularClient();
    if (!client) {
      throw new Error('Failed to get Sodular client');
    }

    console.log('✅ Sodular client connected successfully');

    // Set up bot event listeners
    await refFunctions(client);

    console.log('🚀 Bot is now running and listening for events...');
    console.log('💡 Bot will respond to posts mentioning @free');
    
    // Set up connection monitoring
    monitorConnection(client);
    
  } catch (error) {
    console.error('❌ Bot startup failed:', error);
    throw error; // Re-throw to trigger reconnection
  }
}

// Monitor connection health
function monitorConnection(client: any): void {
  let healthCheckInterval: NodeJS.Timeout;
  
  const startHealthCheck = () => {
    // Check connection every 30 seconds
    healthCheckInterval = setInterval(async () => {
      try {
        // Check if bot is still listening
        if (!isBotListening()) {
          console.warn('⚠️ Bot is not listening, triggering reconnection...');
          clearInterval(healthCheckInterval);
          if (isRunning) {
            attemptReconnection();
          }
          return;
        }
        
        // Simple health check - try to make a request
        await client.axiosInstance.get('/health');
        console.log('💚 Connection health check passed');
      } catch (error: any) {
        console.warn('⚠️ Connection health check failed:', error?.message || 'Unknown error');
        
        // Clear the interval and trigger reconnection
        clearInterval(healthCheckInterval);
        console.log('🔄 Connection lost, triggering reconnection...');
        
        if (isRunning) {
          attemptReconnection();
        }
      }
    }, 30000);
  };

  // Start initial health check
  startHealthCheck();

  // Also monitor socket connection
  const socket = client.getSocket?.();
  if (socket) {
    socket.on('disconnect', (reason: string) => {
      console.log(`🔌 Socket disconnected: ${reason}`);
      if (reason === 'io server disconnect' || reason === 'transport close') {
        console.log('🔄 Socket connection lost, triggering reconnection...');
        clearInterval(healthCheckInterval);
        if (isRunning) {
          attemptReconnection();
        }
      }
    });

    socket.on('connect_error', (error: any) => {
      console.error('🔌 Socket connection error:', error?.message || 'Unknown socket error');
      
      // Only trigger reconnection for critical socket errors
      if (error?.description?.code === 'ECONNREFUSED' || 
          error?.type === 'TransportError') {
        console.log('🔄 Critical socket error detected, triggering reconnection...');
        clearInterval(healthCheckInterval);
        if (isRunning) {
          attemptReconnection();
        }
      } else {
        console.log('⚠️ Non-critical socket error, continuing to monitor...');
      }
    });

    socket.on('reconnect', (attemptNumber: number) => {
      console.log(`🔌 Socket reconnected after ${attemptNumber} attempts`);
      // Restart health check
      clearInterval(healthCheckInterval);
      startHealthCheck();
    });

    socket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log(`🔌 Socket reconnection attempt ${attemptNumber}`);
    });
  }
}

const main = async () => {
  console.log('🚀 Initializing Dallosh Bot with auto-reconnection...');
  
  isRunning = true;
  
  try {
    await startBot();
  } catch (error) {
    console.error('❌ Initial startup failed, starting reconnection cycle...');
    await attemptReconnection();
  }
  
  // Keep the process alive
  process.stdin.resume();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down bot...');
    isRunning = false;
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down bot...');
    isRunning = false;
    process.exit(0);
  });

  // Handle uncaught errors to prevent crashes
  process.on('uncaughtException', (error: Error) => {
    console.error('💥 Uncaught Exception:', error);
    console.log('🔄 Attempting to recover...');
    
    if (isRunning) {
      setTimeout(() => {
        attemptReconnection();
      }, 5000);
    }
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    console.log('🔄 Attempting to recover...');
    
    if (isRunning) {
      setTimeout(() => {
        attemptReconnection();
      }, 5000);
    }
  });
};

main();