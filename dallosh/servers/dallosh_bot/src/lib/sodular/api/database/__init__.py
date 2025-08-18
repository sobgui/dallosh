"""
Database API for Sodular client
Exact Python equivalent of database/index.ts
"""

from typing import Dict, Any
from ..base_client import BaseClient
from ...types.schema import (
    ApiResponse, QueryOptions, QueryResult, CountResult, UpdateResult, 
    DeleteResult, DeleteOptions, Database, CreateDatabaseRequest, UpdateDatabaseRequest
)


class DatabaseAPI:
    """Exact Python equivalent of DatabaseAPI class"""
    
    def __init__(self, client: BaseClient):
        self.client = client
    
    async def exists(self, databaseId: str) -> ApiResponse:
        """Check if database exists"""
        return await self.client.request('GET', '/database/exists', {
            'params': {'database_id': databaseId}
        })
    
    async def create(self, data: CreateDatabaseRequest) -> ApiResponse:
        """Create a new database"""
        return await self.client.request('POST', '/database', {'data': data})
    
    async def get(self, options: Dict[str, Any]) -> ApiResponse:
        """Get database by filter"""
        return await self.client.request('GET', '/database', {'params': options})
    
    async def query(self, options: QueryOptions) -> ApiResponse:
        """Query databases with options"""
        return await self.client.request('GET', '/database/query', {'params': options})
    
    async def count(self, options: Dict[str, Any] = None) -> ApiResponse:
        """Count databases with optional filter"""
        if options is None:
            options = {}
        return await self.client.request('GET', '/database/count', {'params': options})
    
    async def put(self, filter_dict: Dict[str, Any], data: UpdateDatabaseRequest) -> ApiResponse:
        """Update database (replace)"""
        return await self.client.request('PUT', '/database', {'params': {'filter': filter_dict}, 'data': data})
    
    async def patch(self, filter_dict: Dict[str, Any], data: UpdateDatabaseRequest) -> ApiResponse:
        """Update database (partial)"""
        return await self.client.request('PATCH', '/database', {'params': {'filter': filter_dict}, 'data': data})
    
    async def delete(self, filter_dict: Dict[str, Any], options: DeleteOptions = None) -> ApiResponse:
        """Delete database"""
        return await self.client.request('DELETE', '/database', {'params': {'filter': filter_dict, 'options': options}})
