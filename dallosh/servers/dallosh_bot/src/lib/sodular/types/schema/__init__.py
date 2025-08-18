"""
Schema types for Sodular client
Exact Python equivalent of types/schema/index.ts
"""

from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Union, Callable
from datetime import datetime


# Common API response types
@dataclass
class ApiResponse:
    """Generic API response wrapper"""
    data: Any = None
    error: Optional[str] = None
    message: Optional[str] = None
    status: Optional[int] = None


@dataclass
class QueryOptions:
    """Query options for database operations"""
    filter: Optional[Dict[str, Any]] = None
    sort: Optional[Dict[str, Any]] = None
    limit: Optional[int] = None
    offset: Optional[int] = None
    withSoftDelete: Optional[bool] = None
    populate: Optional[List[str]] = None


@dataclass
class QueryResult:
    """Query result with pagination"""
    data: List[Any] = field(default_factory=list)
    total: int = 0
    limit: int = 0
    offset: int = 0
    hasMore: bool = False


@dataclass
class CountResult:
    """Count operation result"""
    count: int = 0


@dataclass
class UpdateResult:
    """Update operation result"""
    modifiedCount: int = 0
    upsertedCount: int = 0
    upsertedId: Optional[str] = None


@dataclass
class DeleteOptions:
    """Delete operation options"""
    withSoftDelete: Optional[bool] = None


@dataclass
class DeleteResult:
    """Delete operation result"""
    deletedCount: int = 0


# User and Authentication types
@dataclass
class User:
    """User entity"""
    id: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    role: Optional[str] = None
    isActive: Optional[bool] = None
    createdBy: Optional[str] = None
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None


@dataclass
class CreateUserRequest:
    """Create user request"""
    data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class UpdateUserRequest:
    """Update user request"""
    data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class LoginRequest:
    """Login request"""
    data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RegisterRequest:
    """Login request"""
    data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RefreshTokenRequest:
    """Refresh token request"""
    refreshToken: str = ""


@dataclass
class AuthTokens:
    """Authentication tokens"""
    accessToken: str = ""
    refreshToken: str = ""


@dataclass
class AuthResponse:
    """Authentication response"""
    user: Optional[User] = None
    tokens: Optional[AuthTokens] = None


# Database types
@dataclass
class Database:
    """Database entity"""
    id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    isActive: Optional[bool] = None
    createdBy: Optional[str] = None
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None


@dataclass
class CreateDatabaseRequest:
    """Create database request"""
    data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class UpdateDatabaseRequest:
    """Update database request"""
    data: Dict[str, Any] = field(default_factory=dict)


# Table types
@dataclass
class Table:
    """Table entity"""
    id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    databaseId: Optional[str] = None
    schema: Optional[Dict[str, Any]] = None
    isActive: Optional[bool] = None
    createdBy: Optional[str] = None
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None


@dataclass
class CreateTableRequest:
    """Create table request"""
    data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class UpdateTableRequest:
    """Update table request"""
    data: Dict[str, Any] = field(default_factory=dict)


# Reference types
@dataclass
class Ref:
    """Reference entity"""
    id: Optional[str] = None
    tableId: Optional[str] = None
    databaseId: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    createdBy: Optional[str] = None
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None


@dataclass
class CreateRefRequest:
    """Create reference request"""
    data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class UpdateRefRequest:
    """Update reference request"""
    data: Dict[str, Any] = field(default_factory=dict)


# Storage types
@dataclass
class Storage:
    """Storage entity"""
    id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    isActive: Optional[bool] = None
    createdBy: Optional[str] = None
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None


@dataclass
class CreateStorageRequest:
    """Create storage request"""
    data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class UpdateStorageRequest:
    """Update storage request"""
    data: Dict[str, Any] = field(default_factory=dict)


# Bucket types
@dataclass
class Bucket:
    """Bucket entity"""
    id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    storageId: Optional[str] = None
    path: Optional[str] = None
    isActive: Optional[bool] = None
    createdBy: Optional[str] = None
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None


@dataclass
class CreateBucketRequest:
    """Create bucket request"""
    data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class UpdateBucketRequest:
    """Update bucket request"""
    data: Dict[str, Any] = field(default_factory=dict)


# File types
@dataclass
class FileSchema:
    """File entity"""
    id: Optional[str] = None
    name: Optional[str] = None
    originalName: Optional[str] = None
    mimeType: Optional[str] = None
    size: Optional[int] = None
    path: Optional[str] = None
    storageId: Optional[str] = None
    bucketId: Optional[str] = None
    databaseId: Optional[str] = None
    createdBy: Optional[str] = None
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None


@dataclass
class UpdateFileRequest:
    """Update file request"""
    data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class DownloadFileRequest:
    """Download file request"""
    fileId: str = ""
    storageId: Optional[str] = None
    bucketId: Optional[str] = None
    path: Optional[str] = None


@dataclass
class DownloadOptions:
    """Download options"""
    type: str = "blob"  # 'blob' or 'arraybuffer'
    range: Optional[str] = None


@dataclass
class DownloadEvents:
    """Download event callbacks"""
    onData: Optional[Callable] = None
    onFinish: Optional[Callable] = None
    onError: Optional[Callable] = None
