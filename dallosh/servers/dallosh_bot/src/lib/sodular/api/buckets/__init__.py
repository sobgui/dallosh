"""
Buckets API for Sodular client
Exact Python equivalent of buckets/index.ts
"""

from typing import Dict, Any
from ..base_client import BaseClient
from ...types.schema import (
    ApiResponse, QueryOptions, QueryResult, CountResult, UpdateResult, 
    DeleteResult, DeleteOptions, Bucket, CreateBucketRequest, UpdateBucketRequest
)


class BucketsAPI:
    """Exact Python equivalent of BucketsAPI class"""
    
    def __init__(self, client: BaseClient):
        self.client = client
    
    async def create(self, data: CreateBucketRequest) -> ApiResponse:
        """Create a new bucket"""
        return await self.client.request('POST', '/buckets', {'data': data})
    
    async def get(self, options: Dict[str, Any]) -> ApiResponse:
        """Get bucket by filter"""
        return await self.client.request('GET', '/buckets', {'params': options})
    
    async def query(self, options: QueryOptions) -> ApiResponse:
        """Query buckets with options"""
        return await self.client.request('GET', '/buckets/query', {'params': options})
    
    async def count(self, options: Dict[str, Any] = None) -> ApiResponse:
        """Count buckets with optional filter"""
        if options is None:
            options = {}
        return await self.client.request('GET', '/buckets/count', {'params': options})
    
    async def put(self, filter_dict: Dict[str, Any], data: UpdateBucketRequest) -> ApiResponse:
        """Update bucket (replace)"""
        return await self.client.request('PUT', '/buckets', {'params': {'filter': filter_dict}, 'data': data})
    
    async def patch(self, filter_dict: Dict[str, Any], data: UpdateBucketRequest) -> ApiResponse:
        """Update bucket (partial)"""
        return await self.client.request('PATCH', '/buckets', {'params': {'filter': filter_dict}, 'data': data})
    
    async def delete(self, filter_dict: Dict[str, Any], options: DeleteOptions = None) -> ApiResponse:
        """Delete bucket"""
        return await self.client.request('DELETE', '/buckets', {'params': {'filter': filter_dict, 'options': options}})
