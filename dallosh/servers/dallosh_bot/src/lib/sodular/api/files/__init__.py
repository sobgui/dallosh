"""
Files API for Sodular client
Exact Python equivalent of files/index.ts
"""

import asyncio
import aiohttp
from typing import Dict, Any, Optional, Callable, Union
from ..base_client import BaseClient
from ...types.schema import (
    ApiResponse, QueryOptions, UpdateResult, DeleteResult, DeleteOptions,
    FileSchema, UpdateFileRequest, DownloadFileRequest, DownloadOptions, DownloadEvents
)
from ...utils import build_api_url, build_query_params


class FilesAPI:
    """Exact Python equivalent of FilesAPI class"""
    
    def __init__(self, client: BaseClient):
        self.client = client
    
    async def upload(self, params: Dict[str, Any], onProgress: Optional[Callable] = None) -> ApiResponse:
        """
        Upload a file - EXACTLY like JavaScript
        
        Args:
            params: Upload parameters including storage_id, bucket_id, file_path, file, filename
            onProgress: Optional progress callback function
        """
        storage_id = params['storage_id']  # JavaScript uses storage_id
        bucket_id = params['bucket_id']    # JavaScript uses bucket_id
        file_path = params.get('file_path')  # JavaScript uses file_path
        file = params['file']
        filename = params.get('filename')
        
        # Create form data
        form_data = aiohttp.FormData()
        if hasattr(file, 'name'):
            filename = filename or file.name
        else:
            filename = filename or 'upload'
        
        form_data.add_field('file', file, filename=filename)
        
        # Add other parameters - EXACTLY like JavaScript
        upload_params = {'storage_id': storage_id, 'bucket_id': bucket_id}  # JavaScript uses snake_case
        if file_path:
            upload_params['file_path'] = file_path  # JavaScript uses file_path
        
        # Add database context if available - EXACTLY like JavaScript
        if hasattr(self.client, 'currentDatabaseId') and self.client.currentDatabaseId:
            upload_params['database_id'] = self.client.currentDatabaseId  # JavaScript uses database_id
        
        try:
            # Use the client's session for upload
            async with self.client.session.post('/files/upload', data=form_data, params=upload_params) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    return {"error": f"Upload failed with status {response.status}"}
        except Exception as error:
            return {"error": str(error) or "Upload failed"}
    
    def download(self, params: DownloadFileRequest, options: DownloadOptions = None) -> DownloadEvents:
        """
        Download a file with streaming support - EXACTLY like JavaScript
        
        Args:
            params: Download parameters
            options: Download options including type and range
            
        Returns:
            DownloadEvents object with callbacks
        """
        if options is None:
            options = {'type': 'blob'}
        
        # Callback functions
        onDataCallback = lambda progress: None
        onFinishCallback = lambda: None
        onErrorCallback = lambda error: None
        
        async def _download():
            try:
                download_params = params.copy()
                
                # Add database context if available - EXACTLY like JavaScript
                if hasattr(self.client, 'currentDatabaseId') and self.client.currentDatabaseId:
                    download_params['database_id'] = self.client.currentDatabaseId  # JavaScript uses database_id
                
                url = build_api_url(self.client.baseUrl, '/files/download', build_query_params(download_params))
                
                headers = {}
                if hasattr(self.client, 'accessToken') and self.client.accessToken:
                    headers['Authorization'] = f"Bearer {self.client.accessToken}"
                
                async with self.client.session.get(url, headers=headers) as response:
                    if not response.ok:
                        try:
                            error_json = await response.json()
                            error_msg = error_json.get('error', f"Request failed with status {response.status}")
                        except:
                            error_msg = f"Request failed with status {response.status}"
                        raise Exception(error_msg)
                    
                    if not response.body:
                        raise Exception("Response body is null")
                    
                    content_length = int(response.headers.get('Content-Length', 0))
                    received_length = 0
                    index = 0
                    
                    async for chunk in response.content.iter_chunked(8192):
                        received_length += len(chunk)
                        percentage = round((received_length / content_length) * 100) if content_length > 0 else 0
                        
                        chunk_data = chunk if options['type'] == 'arraybuffer' else bytes(chunk)
                        
                        onDataCallback({
                            'data': chunk_data,
                            'chunkSize': len(chunk),
                            'index': index,
                            'total': content_length,
                            'percentage': percentage,
                        })
                        index += 1
                    
                    onFinishCallback()
                    
            except Exception as error:
                onErrorCallback(error)
        
        # Start download in background
        asyncio.create_task(_download())
        
        return {
            'onData': lambda cb: setattr(self, 'onDataCallback', cb),
            'onFinish': lambda cb: setattr(self, 'onFinishCallback', cb),
            'onError': lambda cb: setattr(self, 'onErrorCallback', cb),
        }
    
    async def get(self, options: Dict[str, Any]) -> ApiResponse:
        """Get file by filter"""
        return await self.client.request('GET', '/files', {'params': options})
    
    async def query(self, options: QueryOptions) -> ApiResponse:
        """Query files with options"""
        return await self.client.request('GET', '/files/query', {'params': options})
    
    async def patch(self, filter_dict: Any, data: UpdateFileRequest) -> ApiResponse:
        """Update file (partial)"""
        return await self.client.request('PATCH', '/files', {'params': {'filter': filter_dict}, 'data': data})
    
    async def delete(self, filter_dict: Any, options: DeleteOptions = None) -> ApiResponse:
        """Delete file"""
        return await self.client.request('DELETE', '/files', {'params': {'filter': filter_dict, 'options': options}})
