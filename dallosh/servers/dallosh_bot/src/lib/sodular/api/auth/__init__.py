"""
Authentication API for Sodular client
Exact Python equivalent of auth/index.ts
"""

from typing import Dict, Any
from ..base_client import BaseClient
from ...types.schema import (
    ApiResponse, QueryOptions, QueryResult, CountResult, UpdateResult, 
    DeleteResult, DeleteOptions, User, CreateUserRequest, UpdateUserRequest,
    AuthResponse, LoginRequest, RegisterRequest, RefreshTokenRequest, AuthTokens
)


class AuthAPI:
    """Exact Python equivalent of AuthAPI class"""
    
    def __init__(self, client: BaseClient):
        self.client = client
    
    async def register(self, request: Dict[str, Any]) -> ApiResponse:
        """Register a new user"""
        response = await self.client.request('POST', '/auth/register', {'data': request})
        if response.get('data', {}).get('tokens'):
            tokens = response['data']['tokens']
            self.client.setTokens(tokens['accessToken'], tokens['refreshToken'])
        return response
    
    async def login(self, request: Dict[str, Any]) -> ApiResponse:
        """Login user"""
        response = await self.client.request('POST', '/auth/login', {'data': request})
        if response.get('data', {}).get('tokens'):
            tokens = response['data']['tokens']
            self.client.setTokens(tokens['accessToken'], tokens['refreshToken'])
        return response
    
    async def refreshToken(self, data: RefreshTokenRequest) -> ApiResponse:
        """Refresh access token"""
        response = await self.client.request('POST', '/auth/refresh-token', {
            'params': {'refreshToken': data['refreshToken']}
        })
        if response.get('data', {}).get('tokens'):
            tokens = response['data']['tokens']
            self.client.setTokens(tokens['accessToken'], tokens['refreshToken'])
        return response
    
    async def create(self, data: CreateUserRequest) -> ApiResponse:
        """Create a new user"""
        return await self.client.request('POST', '/auth', {'data': data})
    
    async def get(self, options: Dict[str, Any]) -> ApiResponse:
        """Get user by filter"""
        return await self.client.request('GET', '/auth', {'params': options})
    
    async def query(self, options: QueryOptions) -> ApiResponse:
        """Query users with options"""
        return await self.client.request('GET', '/auth/query', {'params': options})
    
    async def count(self, options: Dict[str, Any] = None) -> ApiResponse:
        """Count users with optional filter"""
        if options is None:
            options = {}
        return await self.client.request('GET', '/auth/count', {'params': options})
    
    async def put(self, filter_dict: Dict[str, Any], data: UpdateUserRequest) -> ApiResponse:
        """Update user (replace)"""
        return await self.client.request('PUT', '/auth', {'params': {'filter': filter_dict}, 'data': data})
    
    async def patch(self, filter_dict: Dict[str, Any], data: UpdateUserRequest) -> ApiResponse:
        """Update user (partial)"""
        return await self.client.request('PATCH', '/auth', {'params': {'filter': filter_dict}, 'data': data})
    
    async def delete(self, filter_dict: Dict[str, Any], options: DeleteOptions = None) -> ApiResponse:
        """Delete user"""
        return await self.client.request('DELETE', '/auth', {'params': {'filter': filter_dict, 'options': options}})
    
    def logout(self):
        """Logout user and clear tokens"""
        self.client.clearTokens()
