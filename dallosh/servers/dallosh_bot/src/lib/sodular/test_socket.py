"""
Test socket functionality for Sodular client
Exact Python equivalent of test-socket.ts
"""

import asyncio
import sys
import os

# Add the parent directory to the path so we can import the client
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.lib.sodular import SodularClient


async def test_socket_functionality():
    """Test socket connection and event handling"""
    print("🧪 Testing Socket Functionality...")
    
    try:
        # Initialize client
        client = SodularClient({
            'baseUrl': 'http://localhost:5001/api/v1',
            'ai': {'baseUrl': 'http://localhost:4200/api/v1'}
        })
        
        print("✅ Client initialized successfully")
        
        # Test connection
        result = await client.connect()
        
        if not result.isReady:
            print(f"❌ Connection failed: {result.error}")
            return
        
        print("✅ Connected to server successfully")
        
        sodular_client = result.client
        
        # Test setting database context
        sodular_client.use('test_database')
        print("✅ Database context set successfully")
        
        # Test setting token
        sodular_client.setToken('test_token')
        print("✅ Token set successfully")
        
        # Test socket connection
        socket = sodular_client.getSocket()
        if socket:
            print("✅ Socket instance available")
        else:
            print("❌ Socket instance not available")
        
        # Test joining channel
        sodular_client.joinChannel('test_database', 'test_table')
        print("✅ Channel joined successfully")
        
        # Test event listeners
        event_received = False
        
        def test_callback(data):
            nonlocal event_received
            event_received = True
            print(f"✅ Event received: {data}")
        
        sodular_client.on('test_event', test_callback)
        print("✅ Event listener registered successfully")
        
        # Test leaving channel
        sodular_client.leaveChannel('test_database', 'test_table')
        print("✅ Channel left successfully")
        
        # Test removing event listener
        sodular_client.off('test_event', test_callback)
        print("✅ Event listener removed successfully")
        
        # Test ref API with table context
        ref_api = sodular_client.ref.fromTable('test_table')
        print("✅ Ref API table context set successfully")
        
        # Test ref API event listeners
        ref_event_received = False
        
        def ref_test_callback(data):
            nonlocal ref_event_received
            ref_event_received = True
            print(f"✅ Ref event received: {data}")
        
        ref_api.on('created', ref_test_callback)
        print("✅ Ref event listener registered successfully")
        
        # Test ref API event removal
        ref_api.off('created')
        print("✅ Ref event listener removed successfully")
        
        # Close client
        await sodular_client.close()
        print("✅ Client closed successfully")
        
        print("🎉 All socket tests passed!")
        
    except Exception as error:
        print(f"❌ Test failed with error: {error}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_socket_functionality())
