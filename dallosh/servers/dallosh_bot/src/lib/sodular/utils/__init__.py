"""
Utility functions for Sodular client
Exact Python equivalent of utils/index.ts
"""

import json
import urllib.parse
from typing import Dict, Any, Optional


class TOKEN_KEYS:
    """Token storage keys"""
    ACCESS_TOKEN = "sodular_access_token"
    REFRESH_TOKEN = "sodular_refresh_token"


class Storage:
    """Simple in-memory storage (Python equivalent to localStorage)"""
    
    def __init__(self):
        self._storage = {}
    
    def set(self, key: str, value: str):
        """Set a value in storage"""
        self._storage[key] = value
    
    def get(self, key: str) -> Optional[str]:
        """Get a value from storage"""
        return self._storage.get(key)
    
    def remove(self, key: str):
        """Remove a value from storage"""
        if key in self._storage:
            del self._storage[key]


# Global storage instance
storage = Storage()


def build_query_params(params: Dict[str, Any]) -> str:
    """
    Build query string from parameters
    
    Args:
        params: Dictionary of parameters
        
    Returns:
        URL encoded query string
    """
    if not params:
        return ""
    
    query_parts = []
    for key, value in params.items():
        if value is None:
            continue
        
        if isinstance(value, (dict, list)):
            # JSON encode complex values
            encoded_value = json.dumps(value)
        else:
            encoded_value = str(value)
        
        query_parts.append(f"{key}={urllib.parse.quote(encoded_value)}")
    
    return "&".join(query_parts)


def build_api_url(base_url: str, path: str, query: str = "") -> str:
    """
    Build full API URL
    
    Args:
        base_url: Base URL
        path: API path
        query: Query string
        
    Returns:
        Full API URL
    """
    if not base_url.endswith('/') and not path.startswith('/'):
        base_url += '/'
    
    url = base_url + path
    
    if query:
        if '?' in url:
            url += '&' + query
        else:
            url += '?' + query
    
    return url


__all__ = [
    'TOKEN_KEYS',
    'Storage',
    'storage',
    'build_query_params',
    'build_api_url',
]
