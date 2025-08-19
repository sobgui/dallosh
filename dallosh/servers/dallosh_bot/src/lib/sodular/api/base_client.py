"""
Base Client for Sodular API
Exact Python equivalent of base-client.ts
"""

import asyncio
import json
import re
from typing import Optional, Dict, Any, List, Callable, Literal
import aiohttp
import socketio
from ..types.schema import ApiResponse, AuthTokens
from ..utils import build_query_params, build_api_url, storage, TOKEN_KEYS


class SodularClientConfig:
    """Configuration class for Sodular client"""
    
    def __init__(self, base_url: str, timeout: int = 30000, enable_socket: bool = True):
        self.baseUrl = base_url
        self.timeout = timeout
        self.enableSocket = enable_socket


class BaseClient:
    """Exact Python equivalent of BaseClient class"""
    
    def __init__(self, config: SodularClientConfig):
        self.baseUrl = config.baseUrl
        self.currentDatabaseId: Optional[str] = None
        self.accessToken: Optional[str] = None
        self.refreshToken: Optional[str] = None
        self.isRefreshing = False
        self.refreshPromise: Optional[asyncio.Future] = None
        self.socket: Optional[socketio.AsyncClient] = None
        self.session: Optional[aiohttp.ClientSession] = None
        self.timeout = config.timeout
        self.enableSocket = config.enableSocket
        
        # Create axios equivalent using aiohttp
        self.axiosInstance = self
        self._setup_interceptors()
        self.loadTokensFromStorage()
    
    def _setup_interceptors(self):
        """Setup request/response interceptors equivalent to axios interceptors"""
        # This will be handled in the request method
        pass
    
    async def connect(self) -> Dict[str, Any]:
        """Connect to the server and establish socket connection"""
        print(f"🔌 BaseClient.connect() called for URL: {self.baseUrl}")
        
        try:
            # Test connection with health check
            print("🏥 Testing connection with health check...")
            async with aiohttp.ClientSession() as test_session:
                health_url = f"{self.baseUrl}/health"
                print(f"🔍 Health check URL: {health_url}")
                
                async with test_session.get(health_url) as response:
                    print(f"📊 Health check response status: {response.status}")
                    if response.status != 200:
                        raise Exception(f"Health check failed with status {response.status}")
            
            print("✅ Health check passed")
            
            # Create persistent session
            print("🔧 Creating persistent aiohttp session...")
            self.session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=self.timeout / 1000)
            )
            print("✅ Persistent session created")
            
            # Connect to socket server only if enabled
            if self.enableSocket:
                print("🔌 Setting up socket connection...")
                self.connectSocket()
                print("✅ Socket connection setup completed")
            else:
                print("⚠️ Socket connection disabled")
            
            print("🎉 BaseClient connection successful")
            return {"isReady": True}
            
        except Exception as error:
            print(f"❌ BaseClient connection failed: {error}")
            # Cleanup session if it was created
            if hasattr(self, 'session') and self.session:
                print("🧹 Cleaning up failed session...")
                await self.session.close()
                self.session = None
                print("✅ Session cleanup completed")
            
            return {
                "isReady": False,
                "error": str(error) or "Failed to connect to Sodular backend"
            }
    
    def getSocketUrl(self) -> str:
        """Extract host URL from API base URL for socket connection"""
        try:
            # Remove common API paths
            socket_url = self.baseUrl
            socket_url = re.sub(r'/api/v\d+/?$', '', socket_url)
            socket_url = re.sub(r'/api/?$', '', socket_url)
            socket_url = re.sub(r'/$', '', socket_url)
            return socket_url
        except Exception as error:
            print(f"Failed to parse base URL for socket connection: {error}")
            return self.baseUrl
    
    def connectSocket(self):
        """Connect to socket server"""
        if not self.enableSocket:
            print("⚠️ Socket is disabled, skipping socket connection")
            return
            
        try:
            socket_url = self.getSocketUrl()
            print(f"Connecting to socket at: {socket_url}")
            
            self.socket = socketio.AsyncClient()
            
            @self.socket.event
            async def connect():
                print(f"Socket connected: {self.socket.sid}")
            
            @self.socket.event
            async def disconnect():
                print("Socket disconnected")
            
            @self.socket.event
            async def connect_error(data):
                print(f"Socket connection error: {data}")
            
            # Note: In Python, we'll connect when needed rather than immediately
            # This maintains the same interface as the JavaScript version
            
        except Exception as error:
            print(f"Failed to connect to socket server: {error}")
    
    def use(self, databaseId: Optional[str] = None):
        """Set the current database context"""
        self.currentDatabaseId = databaseId
    
    def setToken(self, accessToken: str):
        """Set the access token"""
        self.accessToken = accessToken
        storage.set(TOKEN_KEYS.ACCESS_TOKEN, accessToken)
    
    def setTokens(self, accessToken: str, refreshToken: str):
        """Set both access and refresh tokens"""
        self.accessToken = accessToken
        self.refreshToken = refreshToken
        storage.set(TOKEN_KEYS.ACCESS_TOKEN, accessToken)
        storage.set(TOKEN_KEYS.REFRESH_TOKEN, refreshToken)
    
    def clearTokens(self):
        """Clear all tokens"""
        self.accessToken = None
        self.refreshToken = None
        storage.remove(TOKEN_KEYS.ACCESS_TOKEN)
        storage.remove(TOKEN_KEYS.REFRESH_TOKEN)
    
    def getSocket(self):
        """Get socket instance"""
        return self.socket if self.enableSocket else None
    
    def joinChannel(self, databaseId: Optional[str], tableId: str):
        """Join a channel for listening to events"""
        if self.socket and self.enableSocket:
            asyncio.create_task(self.socket.emit('join', {
                'database_id': databaseId,
                'table_id': tableId
            }))
    
    def leaveChannel(self, databaseId: Optional[str], tableId: str):
        """Leave a channel"""
        if self.socket and self.enableSocket:
            asyncio.create_task(self.socket.emit('leave', {
                'database_id': databaseId,
                'table_id': tableId
            }))
    
    def on(self, event: str, callback: Callable):
        """Listen to events on a channel"""
        if self.socket and self.enableSocket:
            self.socket.on(event, callback)
    
    def off(self, event: str, callback: Optional[Callable] = None):
        """Remove event listener"""
        if self.socket and self.enableSocket:
            if callback:
                self.socket.off(event, callback)
            else:
                self.socket.off(event)
    
    def loadTokensFromStorage(self):
        """Load tokens from storage"""
        self.accessToken = storage.get(TOKEN_KEYS.ACCESS_TOKEN)
        self.refreshToken = storage.get(TOKEN_KEYS.REFRESH_TOKEN)
    
    async def performTokenRefresh(self) -> bool:
        """Perform token refresh"""
        self.isRefreshing = True
        
        if not self.refreshToken:
            self.isRefreshing = False
            return False
        
        try:
            query = f"refreshToken={self.refreshToken}"
            if self.currentDatabaseId:
                query += f"&database_id={self.currentDatabaseId}"
            
            url = build_api_url(self.baseUrl, '/auth/refresh-token', query)
            
            async with self.session.post(url) as response:
                if response.status == 200:
                    data = await response.json()
                    response_data = data.get('data', {})
                    tokens = response_data.get('tokens')
                    
                    if tokens:
                        self.setTokens(tokens['accessToken'], tokens['refreshToken'])
                        self.isRefreshing = False
                        return True
                    
                    self.clearTokens()
                    self.isRefreshing = False
                    return False
                    
        except Exception:
            self.clearTokens()
            self.isRefreshing = False
            return False
    
    async def request(self, method: Literal['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], path: str, options: Dict[str, Any] = None) -> ApiResponse:
        """Make HTTP request - EXACTLY like JavaScript"""
        if options is None:
            options = {}
        
        if not self.session:
            return {"error": "Client not connected. Call connect() first."}
        
        try:
            data = options.get('data')
            params = options.get('params', {})
            config = options.get('config', {})
            
            # Add database context if available - EXACTLY like JavaScript
            if self.currentDatabaseId:
                params['database_id'] = self.currentDatabaseId
            
            # Build URL with full base URL since we don't have axios baseURL
            query_params = build_query_params(params)
            url = build_api_url(self.baseUrl, path, query_params)
            
            # Set up headers with authentication
            headers = {}
            if self.accessToken:
                headers['Authorization'] = f'Bearer {self.accessToken}'
            
                           # Make request using aiohttp - EXACTLY like JavaScript
                async with self.session.request(
                   method=method,
                   url=url,
                   json=data,
                   headers=headers,
                   **config
                ) as response:
                   # Check for successful status codes (2xx range)
                    if 200 <= response.status < 300:
                       return await response.json()
                    else:
                       return {"error": f"Request failed with status {response.status}"}
                    
        except aiohttp.ClientError as error:
            return {"error": f"Network error: {str(error)}"}
        except Exception as error:
            return {"error": str(error) or "Request failed"}
    
    async def close(self):
        """Close the client and cleanup resources"""
        try:
            if self.socket and self.enableSocket:
                await self.socket.disconnect()
                self.socket = None
        except Exception as e:
            print(f"Error disconnecting socket: {e}")
        
        try:
            if self.session:
                await self.session.close()
                self.session = None
        except Exception as e:
            print(f"Error closing session: {e}")
        
        # Clear tokens
        self.clearTokens()
