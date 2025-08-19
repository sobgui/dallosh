"""
Sodular Python Client Library
Exact Python equivalent of the JavaScript/TypeScript implementation
"""

from .api.base_client import BaseClient
from .api.auth import AuthAPI
from .api.database import DatabaseAPI
from .api.tables import TablesAPI
from .api.ref import RefAPI
from .api.storage import StorageAPI
from .api.buckets import BucketsAPI
from .api.files import FilesAPI
from .api.ai import AIAPI
from .types.schema import *
from .utils import *
from typing import Optional

__all__ = [
    'SodularClient',
    'BaseClient',
    'AuthAPI',
    'DatabaseAPI',
    'TablesAPI',
    'RefAPI',
    'StorageAPI',
    'BucketsAPI',
    'FilesAPI',
    'AIAPI',
]


class SodularClientInstance:
    """Exact Python equivalent of SodularClientInstance interface"""
    
    def __init__(self, base_client: BaseClient, ai_api=None):
        self._base_client = base_client # Store base_client as a private attribute
        self.auth = AuthAPI(base_client)
        self.database = DatabaseAPI(base_client)
        self.tables = TablesAPI(base_client)
        self.ref = RefAPI(base_client)
        self.storage = StorageAPI(base_client)
        self.buckets = BucketsAPI(base_client)
        self.files = FilesAPI(base_client)
        self.axiosInstance = base_client.axiosInstance
        self.use = base_client.use
        self.setToken = base_client.setToken
        self.setTokens = base_client.setTokens
        self.clearTokens = base_client.clearTokens
        self.joinChannel = base_client.joinChannel
        self.leaveChannel = base_client.leaveChannel
        self.on = base_client.on
        self.off = base_client.off
        self.close = base_client.close # Expose close method

        # AI module if configured
        if ai_api:
            self.ai = {
                'generateChat': ai_api.generateChat,
                'generateStreamChat': ai_api.generateStreamChat,
                'getModels': ai_api.getModels,
                '_instance': ai_api,
            }
        else:
            self.ai = None # Ensure ai is None if not configured
    
    @property
    def accessToken(self):
        """Get access token"""
        return self._base_client.accessToken


def createClientInstance(base_client: BaseClient, ai_config=None):
    """Exact Python equivalent of createClientInstance function"""
    ai_api = None
    if ai_config and ai_config.get('baseUrl'):
        ai_api = AIAPI(base_client, ai_config['baseUrl'])
    
    return SodularClientInstance(base_client, ai_api)


def SodularClient(config):
    """Exact Python equivalent of SodularClient factory function"""
    
    class SodularClientConnectResult:
        """Result object for SodularClient.connect()"""
        def __init__(self, is_ready: bool, error: Optional[str], client: Optional[SodularClientInstance]):
            self.isReady = is_ready
            self.error = error
            self.client = client
    
    async def connect():
        """Connect to the server"""
        from .api.base_client import SodularClientConfig
        
        # Create base client configuration
        base_config = SodularClientConfig(
            base_url=config['baseUrl'],
            timeout=config.get('timeout', 30000),
            enable_socket=config.get('enableSocket', True)
        )
        
        # Create base client
        base_client = BaseClient(base_config)
        
        # Connect to server
        result = await base_client.connect()
        
        # Create client instance
        client_instance = createClientInstance(base_client, config.get('ai'))
        
        return SodularClientConnectResult(
            is_ready=result['isReady'],
            error=result.get('error'),
            client=client_instance
        )
    
    class SodularClientFactory:
        """Factory class for SodularClient"""
        def __init__(self, config):
            self.config = config
        
        async def connect(self):
            return await connect()
    
    return SodularClientFactory(config)
