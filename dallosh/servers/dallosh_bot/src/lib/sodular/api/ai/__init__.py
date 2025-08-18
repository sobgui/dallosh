"""
AI API for Sodular client
Exact Python equivalent of ai/index.ts
"""

import asyncio
import json
from typing import Dict, Any, Optional, Callable
from ..base_client import BaseClient


class GenerateChatParams:
    """Exact Python equivalent of GenerateChatParams interface"""
    def __init__(self, input: Any, agents: Optional[Any] = None, context: Optional[Any] = None):
        self.input = input
        self.agents = agents
        self.context = context


class StreamCallbacks:
    """Exact Python equivalent of StreamCallbacks interface"""
    def __init__(self):
        self.onData: Optional[Callable] = None
        self.onFinish: Optional[Callable] = None
        self.onError: Optional[Callable] = None


class AIAPI:
    """Exact Python equivalent of AIAPI class"""
    
    def __init__(self, client: BaseClient, baseUrl: str):
        self.client = client
        self.baseUrl = baseUrl
    
    async def generateChat(self, params: GenerateChatParams) -> Dict[str, Any]:
        """Generate a single chat response - EXACTLY like JavaScript"""
        try:
            url = f"{self.baseUrl}/ai/chat"
            
            headers = {'Content-Type': 'application/json'}
            if hasattr(self.client, 'accessToken') and self.client.accessToken:
                headers['Authorization'] = f"Bearer {self.client.accessToken}"
            
            # JavaScript sends: { input, agents, context, stream: false }
            request_data = {
                'input': params.input,
                'agents': params.agents,
                'context': params.context,
                'stream': False
            }
            
            async with self.client.session.post(url, json=request_data, headers=headers) as response:
                if response.status == 200:
                    return await response.json()
                elif response.status == 401:
                    # Try to refresh token
                    refreshed = await self._refreshToken()
                    if refreshed:
                        headers['Authorization'] = f"Bearer {self.client.accessToken}"
                        async with self.client.session.post(url, json=request_data, headers=headers) as retry_response:
                            return await retry_response.json()
                    else:
                        return {"error": "Authentication failed"}
                else:
                    return {"error": f"Request failed with status {response.status}"}
                    
        except Exception as error:
            return {"error": str(error) or "Request failed"}
    
    async def generateStreamChat(self, params: GenerateChatParams, callbacks: StreamCallbacks) -> None:
        """Generate streaming chat response - EXACTLY like JavaScript"""
        asyncio.create_task(self._makeStreamRequest(params, callbacks))
    
    async def getModels(self, params: Dict[str, str]) -> Dict[str, Any]:
        """Get available AI models - EXACTLY like JavaScript"""
        try:
            url = f"{self.baseUrl}/ai/models"
            
            headers = {'Content-Type': 'application/json'}
            if hasattr(self.client, 'accessToken') and self.client.accessToken:
                headers['Authorization'] = f"Bearer {self.client.accessToken}"
            
            # JavaScript sends: { baseUrl, apiKey }
            request_data = {
                'baseUrl': params['baseUrl'],
                'apiKey': params['apiKey']
            }
            
            async with self.client.session.post(url, json=request_data, headers=headers) as response:
                if response.status == 200:
                    return await response.json()
                elif response.status == 401:
                    # Try to refresh token
                    refreshed = await self._refreshToken()
                    if refreshed:
                        headers['Authorization'] = f"Bearer {self.client.accessToken}"
                        async with self.client.session.post(url, json=request_data, headers=headers) as retry_response:
                            return await retry_response.json()
                    else:
                        return {"error": "Authentication failed"}
                else:
                    return {"error": f"Request failed with status {response.status}"}
                    
        except Exception as error:
            return {"error": str(error) or "Request failed"}
    
    async def _makeStreamRequest(self, params: GenerateChatParams, callbacks: StreamCallbacks) -> None:
        """Make streaming request to AI service - EXACTLY like JavaScript"""
        try:
            url = f"{self.baseUrl}/ai/chat"
            
            headers = {'Content-Type': 'application/json'}
            if hasattr(self.client, 'accessToken') and self.client.accessToken:
                headers['Authorization'] = f"Bearer {self.client.accessToken}"
            
            # JavaScript sends: { input, agents, context, stream: true }
            request_data = {
                'input': params.input,
                'agents': params.agents,
                'context': params.context,
                'stream': True
            }
            
            async with self.client.session.post(url, json=request_data, headers=headers) as response:
                if response.status == 200:
                    await self._processStream(response, callbacks)
                elif response.status == 401:
                    # Try to refresh token
                    refreshed = await self._refreshToken()
                    if refreshed:
                        headers['Authorization'] = f"Bearer {self.client.accessToken}"
                        async with self.client.session.post(url, json=request_data, headers=headers) as retry_response:
                            await self._processStream(retry_response, callbacks)
                    else:
                        if callbacks.onError:
                            callbacks.onError("Authentication failed")
                else:
                    if callbacks.onError:
                        callbacks.onError(f"Request failed with status {response.status}")
                        
        except Exception as error:
            if callbacks.onError:
                callbacks.onError(str(error) or "Request failed")
    
    async def _processStream(self, response, callbacks: StreamCallbacks) -> None:
        """Process streaming response - EXACTLY like JavaScript"""
        try:
            async for line in response.content:
                if line:
                    try:
                        data = json.loads(line.decode('utf-8'))
                        if callbacks.onData:
                            # JavaScript calls onData(parsed.data)
                            callbacks.onData(data.get('data', data))
                    except json.JSONDecodeError:
                        # Skip invalid JSON lines
                        continue
            
            if callbacks.onFinish:
                callbacks.onFinish()
                
        except Exception as error:
            if callbacks.onError:
                callbacks.onError(str(error) or "Stream processing failed")
    
    async def _refreshToken(self) -> bool:
        """Refresh access token - EXACTLY like JavaScript"""
        try:
            if hasattr(self.client, 'performTokenRefresh'):
                return await self.client.performTokenRefresh()
            return False
        except Exception:
            return False
