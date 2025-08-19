"""
Tables API for Sodular client
Exact Python equivalent of tables/index.ts
"""

from typing import Dict, Any
from ..base_client import BaseClient
from ...types.schema import (
    ApiResponse, QueryOptions, QueryResult, CountResult, UpdateResult, 
    DeleteResult, DeleteOptions, Table, CreateTableRequest, UpdateTableRequest
)


class TablesAPI:
    """Exact Python equivalent of TablesAPI class"""
    
    def __init__(self, client: BaseClient):
        self.client = client
    
    async def exists(self, tableId: str) -> ApiResponse:
        """Check if table exists"""
        return await self.client.request('GET', '/tables/exists', {
            'params': {'table_id': tableId}
        })
    
    async def create(self, data: CreateTableRequest) -> ApiResponse:
        """Create a new table"""
        return await self.client.request('POST', '/tables', {'data': data})
    
    async def get(self, options: Dict[str, Any]) -> ApiResponse:
        """Get table by filter"""
        return await self.client.request('GET', '/tables', {'params': options})
    
    async def query(self, options: QueryOptions) -> ApiResponse:
        """Query tables with options"""
        return await self.client.request('GET', '/tables/query', {'params': options})
    
    async def count(self, options: Dict[str, Any] = None) -> ApiResponse:
        """Count tables with optional filter"""
        if options is None:
            options = {}
        return await self.client.request('GET', '/tables/count', {'params': options})
    
    async def put(self, filter_dict: Dict[str, Any], data: UpdateTableRequest) -> ApiResponse:
        """Update table (replace)"""
        return await self.client.request('PUT', '/tables', {'params': {'filter': filter_dict}, 'data': data})
    
    async def patch(self, filter_dict: Dict[str, Any], data: UpdateTableRequest) -> ApiResponse:
        """Update table (partial)"""
        return await self.client.request('PATCH', '/tables', {'params': {'filter': filter_dict}, 'data': data})
    
    async def delete(self, filter_dict: Dict[str, Any], options: DeleteOptions = None) -> ApiResponse:
        """Delete table"""
        return await self.client.request('DELETE', '/tables', {'params': {'filter': filter_dict, 'options': options}})
