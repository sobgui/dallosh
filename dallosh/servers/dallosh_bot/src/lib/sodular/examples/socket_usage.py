"""
Socket usage examples for Sodular client
Exact Python equivalent of examples/socket-usage.ts
"""

import asyncio
from src.lib.sodular import SodularClient


async def socket_usage_example():
    """Example of using sockets with Sodular client"""
    
    # Initialize client
    client = SodularClient({
        'baseUrl': 'http://localhost:5001/api/v1',
        'ai': {'baseUrl': 'http://localhost:4200/api/v1'}
    })
    
    # Connect to server
    result = await client.connect()
    
    if not result.isReady:
        print(f"Failed to connect: {result.error}")
        return
    
    sodular_client = result.client
    
    # Set database context
    sodular_client.use('my_database_id')
    
    # Set authentication token
    sodular_client.setToken('your_access_token')
    
    # Join a channel for a specific table
    sodular_client.joinChannel('my_database_id', 'users_table')
    
    # Listen to events
    def on_user_created(data):
        print(f"User created: {data}")
    
    def on_user_updated(data):
        print(f"User updated: {data}")
    
    def on_user_deleted(data):
        print(f"User deleted: {data}")
    
    # Register event listeners
    sodular_client.on('created', on_user_created)
    sodular_client.on('updated', on_user_updated)
    sodular_client.on('deleted', on_user_deleted)
    
    # Use ref API for table-specific operations
    ref_api = sodular_client.ref.fromTable('users_table')
    
    # Listen to table events
    def on_ref_created(data):
        print(f"Reference created: {data}")
    
    def on_ref_updated(data):
        print(f"Reference updated: {data}")
    
    ref_api.on('created', on_ref_created)
    ref_api.on('updated', on_ref_updated)
    
    # Keep the connection alive
    try:
        await asyncio.sleep(60)  # Keep alive for 60 seconds
    except KeyboardInterrupt:
        print("Stopping socket example...")
    
    # Clean up
    sodular_client.leaveChannel('my_database_id', 'users_table')
    sodular_client.off('created')
    sodular_client.off('updated')
    sodular_client.off('deleted')
    
    # Close client
    await sodular_client.close()


if __name__ == "__main__":
    asyncio.run(socket_usage_example())
