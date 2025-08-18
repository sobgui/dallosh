"""
Reference API for Sodular client
Exact Python equivalent of ref/index.ts
"""

from typing import Dict, Any, Optional, Callable
from ..base_client import BaseClient
from ...types.schema import (
    ApiResponse, QueryOptions, QueryResult, CountResult, UpdateResult, 
    DeleteResult, DeleteOptions, Ref, CreateRefRequest, UpdateRefRequest
)


class RefAPI:
    """Exact Python equivalent of RefAPI class"""
    
    def __init__(self, client: BaseClient):
        self.client = client
        self.currentTableId: Optional[str] = None
        self.currentDatabaseId: Optional[str] = None
    
    def __getattr__(self, name):
        """Handle the 'from' method call since it's a reserved keyword in Python"""
        if name == 'from':
            return self._from_method
        raise AttributeError(f"'{self.__class__.__name__}' object has no attribute '{name}'")
    
    def _from_method(self, tableId: str):
        """Set the current table context - EXACTLY like JavaScript"""
        self.currentTableId = tableId
        # Get current database ID from client
        self.currentDatabaseId = getattr(self.client, 'currentDatabaseId', None)
        return self
    
    def on(self, event: str, callback: Callable):
        """
        Listen to events for the current table
        
        Args:
            event: Event name: 'created', 'replaced', 'patched', 'deleted'
            callback: Callback function to handle the event
        """
        if not self.currentTableId:
            raise ValueError("Table ID is required. Use from(tableId) first.")
        
        # Only join channel and listen if socket is enabled
        if hasattr(self.client, 'enableSocket') and self.client.enableSocket:
            # Join the channel for this table
            self.client.joinChannel(self.currentDatabaseId, self.currentTableId)
            
            # Listen to the specific event
            self.client.on(event, callback)
        else:
            print(f"⚠️ Socket is disabled, cannot listen to event: {event}")
        
        return self
    
    def off(self, event: Optional[str] = None):
        """
        Stop listening to events for the current table
        
        Args:
            event: Optional event name to stop listening to. If None, stops all events.
        """
        if not self.currentTableId:
            raise ValueError("Table ID is required. Use from(tableId) first.")
        
        # Only perform socket operations if socket is enabled
        if hasattr(self.client, 'enableSocket') and self.client.enableSocket:
            if event:
                self.client.off(event)
            else:
                # Remove all event listeners
                self.client.off('created')
                self.client.off('replaced')
                self.client.off('patched')
                self.client.off('deleted')
            
            # Leave the channel
            self.client.leaveChannel(self.currentDatabaseId, self.currentTableId)
        else:
            print(f"⚠️ Socket is disabled, cannot stop listening to events")
        
        return self
    
    def _checkTableId(self):
        """Check if table ID is set"""
        if not self.currentTableId:
            raise ValueError("Table ID is required. Use from(tableId) first.")
    
    async def create(self, data: CreateRefRequest) -> ApiResponse:
        """Create a new reference - EXACTLY like JavaScript"""
        self._checkTableId()
        return await self.client.request('POST', '/ref', {
            'params': {'table_id': self.currentTableId},  # JavaScript uses table_id
            'data': data
        })
    
    async def get(self, options: Dict[str, Any]) -> ApiResponse:
        """Get reference by filter - EXACTLY like JavaScript"""
        self._checkTableId()
        return await self.client.request('GET', '/ref', {
            'params': {**options, 'table_id': self.currentTableId}  # JavaScript uses table_id
        })
    
    async def query(self, options: QueryOptions) -> ApiResponse:
        """Query references with options - EXACTLY like JavaScript"""
        self._checkTableId()
        return await self.client.request('GET', '/ref/query', {
            'params': {**options, 'table_id': self.currentTableId}  # JavaScript uses table_id
        })
    
    async def count(self, options: Dict[str, Any] = None) -> ApiResponse:
        """Count references with optional filter - EXACTLY like JavaScript"""
        self._checkTableId()
        if options is None:
            options = {}
        return await self.client.request('GET', '/ref/count', {
            'params': {**options, 'table_id': self.currentTableId}  # JavaScript uses table_id
        })
    
    async def put(self, filter_dict: Dict[str, Any], data: UpdateRefRequest) -> ApiResponse:
        """Update reference (replace) - EXACTLY like JavaScript"""
        self._checkTableId()
        return await self.client.request('PUT', '/ref', {
            'params': {'filter': filter_dict, 'table_id': self.currentTableId},  # JavaScript uses table_id
            'data': data
        })
    
    async def patch(self, filter_dict: Dict[str, Any], data: UpdateRefRequest) -> ApiResponse:
        """Update reference (partial) - EXACTLY like JavaScript"""
        self._checkTableId()
        return await self.client.request('PATCH', '/ref', {
            'params': {'filter': filter_dict, 'table_id': self.currentTableId},  # JavaScript uses table_id
            'data': data
        })
    
    async def delete(self, filter_dict: Dict[str, Any], options: DeleteOptions = None) -> ApiResponse:
        """Delete reference - EXACTLY like JavaScript"""
        self._checkTableId()
        return await self.client.request('DELETE', '/ref', {
            'params': {'filter': filter_dict, 'options': options, 'table_id': self.currentTableId}  # JavaScript uses table_id
        })
