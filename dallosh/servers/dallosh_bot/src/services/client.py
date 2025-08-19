"""
Sodular client service for Python
Exact Python equivalent of client.ts service
"""

import dotenv
import os
import asyncio
from typing import Optional, Dict, Any
from src.lib.sodular import SodularClient, SodularClientInstance, Ref, Table, User

dotenv.load_dotenv(override=True)

def getLocal(key: str, fallback: str) -> str:
    """Get value from environment variable with fallback"""
    return os.environ.get(key, fallback)

# Configuration from environment variables
apiUrl = getLocal('SODULAR_API_URL', 'http://localhost:5005/api/v1')
aiUrl = getLocal('SODULAR_AI_URL', 'http://localhost:4200/api/v1')
databaseID = getLocal('SODULAR_DATABASE_ID', '43fba321-e958-466c-a450-1638d32af19b')

# Global client instance
_sodular_client: Optional[SodularClientInstance] = None
_client_lock = asyncio.Lock()

async def getSodularClient() -> Optional[SodularClientInstance]:
    """Get or create Sodular client instance (exact same logic as JavaScript)"""
    global _sodular_client
    
    print("🔌 getSodularClient called")
    
    if _sodular_client is not None:
        print("✅ Returning existing client instance")
        return _sodular_client
    
    async with _client_lock:
        if _sodular_client is not None:
            print("✅ Returning existing client instance (after lock)")
            return _sodular_client
        
        try:
            print("🚀 Initializing new Sodular client...")
            print(f"🔧 Configuration: apiUrl={apiUrl}, aiUrl={aiUrl}, databaseID={databaseID}")
            
            # Initialize SodularClient factory
            sodularClientFactory = SodularClient({
                'baseUrl': apiUrl,
                'ai': {'baseUrl': aiUrl},
                'timeout': 30000, # Default timeout
                'enableSocket': False  # Enable/disable web socket connections
            })
            
            print("✅ SodularClient factory created")
            
            # Connect to the client using the connect method
            print("🔌 Connecting to Sodular backend...")
            result = await sodularClientFactory.connect()
            
            print(f"📊 Connection result: {result}")
            
            isReady = result.isReady
            error = result.error
            client = result.client
            
            if error or not isReady:
                print(f"❌ Failed to connect to Sodular backend: {error}")
                return None
            
            print("✅ Successfully connected to Sodular backend")
            
            if databaseID:
                print(f"🎯 Setting database context: {databaseID}")
                client.use(databaseID)
                print("✅ Database context set")
            
            _sodular_client = client
            print("✅ Client instance stored globally")
            return client
            
        except Exception as e:
            print(f"❌ Critical error during client initialization: {e}")
            import traceback
            traceback.print_exc()
            return None

async def closeSodularClient():
    """Close the Sodular client and cleanup resources"""
    global _sodular_client
    
    if _sodular_client is not None:
        try:
            await _sodular_client.close()
        except Exception as e:
            print(f"Error closing Sodular client: {e}")
        finally:
            _sodular_client = None

# Cleanup on application shutdown
import atexit
atexit.register(lambda: asyncio.run(closeSodularClient()) if _sodular_client else None)

