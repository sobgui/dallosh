# Export all API modules
from .base_client import BaseClient
from .auth import AuthAPI
from .database import DatabaseAPI
from .tables import TablesAPI
from .ref import RefAPI
from .storage import StorageAPI
from .buckets import BucketsAPI
from .files import FilesAPI

__all__ = [
    'BaseClient',
    'AuthAPI', 
    'DatabaseAPI',
    'TablesAPI',
    'RefAPI',
    'StorageAPI',
    'BucketsAPI',
    'FilesAPI'
]
