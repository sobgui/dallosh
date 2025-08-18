# Dallosh Bot Functions

A robust bot system that automatically responds to social media posts mentioning `@free` by creating support chat sessions.

## Features

- **Automatic Post Monitoring**: Listens for posts mentioning `@free`
- **Chat Session Creation**: Automatically creates support chat sessions
- **Bot Response**: Posts comments with chat invitation links
- **Robust Reconnection**: Automatically recovers from connection issues
- **Health Monitoring**: Continuous connection health checks
- **Error Recovery**: Handles crashes and network failures gracefully

## Bot Reconnection System

The bot now includes a sophisticated reconnection system that ensures it stays running even when the server goes down:

### Key Features

1. **Automatic Reconnection**: Bot automatically attempts to reconnect when connection is lost
2. **Exponential Backoff**: Smart retry delays to avoid overwhelming the server
3. **Health Monitoring**: Regular health checks every 30 seconds
4. **Socket Recovery**: Handles both HTTP and WebSocket connection issues
5. **Graceful Degradation**: Continues operating even with partial connectivity
6. **State Persistence**: Maintains bot state across reconnections

### Reconnection Behavior

- **Immediate Detection**: Detects connection loss within 30 seconds
- **Smart Retries**: Up to 10 reconnection attempts with exponential backoff
- **Dual Strategy**: Tries bot reinitialization first, then full restart if needed
- **Socket Handling**: Manages WebSocket reconnection automatically
- **Error Recovery**: Handles uncaught exceptions and unhandled rejections

### Configuration

The reconnection system is configured with these parameters:

```typescript
const MAX_RECONNECT_ATTEMPTS = 10;        // Maximum reconnection attempts
const RECONNECT_DELAY = 5000;             // Base delay: 5 seconds
const HEALTH_CHECK_INTERVAL = 30000;      // Health check: 30 seconds
```

### Socket Reconnection

WebSocket connections include built-in reconnection:

```typescript
reconnection: true,           // Enable automatic reconnection
reconnectionAttempts: 5,      // Socket-level retry attempts
reconnectionDelay: 1000,      // Initial retry delay: 1 second
reconnectionDelayMax: 5000,   // Maximum retry delay: 5 seconds
timeout: 20000,               // Connection timeout: 20 seconds
```

## Usage

### Starting the Bot

```bash
npm run start
```

### Testing Reconnection

Use the included test script:

```bash
node test-bot-reconnection.js
```

### Manual Testing

1. Start the bot
2. Stop your Sodular backend server
3. Watch the bot detect disconnection and attempt reconnection
4. Restart your backend server
5. Verify the bot automatically reconnects

## Environment Variables

```bash
SODULAR_BASE_URL=http://localhost:5001/api/v1
SODULAR_AI_BASE_URL=http://localhost:4200/api/v1
SODULAR_DATABASE_ID=your-database-id
SODULAR_API_KEY=your-api-key
```

## Monitoring

The bot provides detailed logging for monitoring:

- 🚀 Startup and initialization
- 🔌 Connection status and events
- 🔄 Reconnection attempts and success
- 💚 Health check results
- ⚠️ Warnings and errors
- 🧹 Cleanup operations

## Troubleshooting

### Bot Won't Reconnect

1. Check environment variables are correct
2. Verify backend server is accessible
3. Check network connectivity
4. Review logs for specific error messages

### Frequent Reconnections

1. Check backend server stability
2. Verify network quality
3. Adjust reconnection delays if needed
4. Monitor server resource usage

### Socket Connection Issues

1. Check WebSocket endpoint accessibility
2. Verify authentication tokens
3. Check firewall settings
4. Review socket configuration

## Development

### Adding New Event Types

1. Update the `getTableSchema` function
2. Add new event handlers in `setupEventListeners`
3. Implement corresponding business logic

### Customizing Reconnection Logic

1. Modify `attemptReconnection` function
2. Adjust timing parameters
3. Add custom error handling
4. Implement custom health checks

## License

MIT License - see LICENSE file for details.
