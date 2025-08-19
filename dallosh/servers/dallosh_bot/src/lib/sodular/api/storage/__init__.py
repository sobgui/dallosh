"""
Storage API for Sodular client
Exact Python equivalent of storage/index.ts
"""

from typing import Dict, Any
from ..base_client import BaseClient
from ...types.schema import (
    ApiResponse, QueryOptions, QueryResult, CountResult, UpdateResult, 
    DeleteResult, DeleteOptions, Storage, CreateStorageRequest, UpdateStorageRequest
)


class StorageAPI:
    """Exact Python equivalent of StorageAPI class"""
    
    def __init__(self, client: BaseClient):
        self.client = client
    
    async def create(self, data: CreateStorageRequest) -> ApiResponse:
        """Create a new storage"""
        return await self.client.request('POST', '/storage', {'data': data})
    
    async def get(self, options: Dict[str, Any]) -> ApiResponse:
        """Get storage by filter"""
        return await self.client.request('GET', '/storage', {'params': options})
    
    async def query(self, options: QueryOptions) -> ApiResponse:
        """Query storage with options"""
        return await self.client.request('GET', '/storage/query', {'params': options})
    
    async def count(self, options: Dict[str, Any] = None) -> ApiResponse:
        """Count storage with optional filter"""
        if options is None:
            options = {}
        return await self.client.request('GET', '/storage/count', {'params': options})
    
    async def put(self, filter_dict: Dict[str, Any], data: UpdateStorageRequest) -> ApiResponse:
        """Update storage (replace)"""
        return await self.client.request('PUT', '/storage', {'params': {'filter': filter_dict}, 'data': data})
    
    async def patch(self, filter_dict: Dict[str, Any], data: UpdateStorageRequest) -> ApiResponse:
        """Update storage (partial)"""
        return await self.client.request('PATCH', '/storage', {'params': {'filter': filter_dict}, 'data': data})
    
    async def delete(self, filter_dict: Dict[str, Any], options: DeleteOptions = None) -> ApiResponse:
        """Delete storage"""
        return await self.client.request('DELETE', '/storage', {'params': {'filter': filter_dict, 'options': options}})
