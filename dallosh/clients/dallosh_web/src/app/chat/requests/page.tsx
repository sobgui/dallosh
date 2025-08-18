'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth";
import { 
  Search, 
  Grid3X3, 
  List, 
  Clock, 
  User, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Trash2,
  X,
  MessageCircle
} from "lucide-react";
import { type Request } from "../service";
import { getSodularClient } from "@/services/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export default function RequestsPage() {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Request Detail Modal State
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [showRequestDetailModal, setShowRequestDetailModal] = useState(false);

  // We're now using direct Sodular client calls instead of requestManager

  useEffect(() => {
    if (user) {
      console.log('🔄 User authenticated, fetching requests for:', user.uid);
      fetchUserRequests();
      setupRealtimeListeners();
    } else {
      console.log('⚠️ No user found, cannot fetch requests');
    }
  }, [user]);

  // Setup real-time listeners for requests
  const setupRealtimeListeners = async () => {
    try {
      console.log('🔔 Setting up real-time listeners for customer requests...');
      const client = await getSodularClient();
      if (!client) {
        console.error('❌ No Sodular client available for real-time listeners');
        return;
      }

      // Get or create requests table
      let requestsTable = await client.tables.get({ filter: { 'data.name': 'requests' } });
      if (!requestsTable.data) {
        console.log('📋 Requests table not found, setting up listeners will be skipped');
        return;
      }
      console.log('✅ Found requests table:', requestsTable.data.uid);

      console.log('🔔 Setting up real-time request listeners for customer...');
      console.log('📡 Listening for: created, patched, deleted events');
      console.log('🔍 Table UID for listeners:', requestsTable.data.uid);

      // Listen for new requests
      const createListener = client.ref.from(requestsTable.data.uid).on('created', (data: any) => {
        // Validate data structure before accessing properties
        if (data && data.data && data.data.userId === user?.uid) {
          console.log('📨 New request received in real-time:', data);
          setRequests(prev => {
            // Check if request already exists
            const exists = prev.some(req => req.uid === data.uid);
            if (exists) return prev;
            return [data, ...prev];
          });
        } else {
          console.log('⚠️ Invalid request creation data structure received:', data);
        }
      });

            // Listen for request updates (patched events)
      const updateListener = client.ref.from(requestsTable.data.uid).on('patched', (data: any) => {
        console.log('📝 Request patched event received:', data);
        console.log('📊 Data structure analysis:', {
          hasData: !!data,
          hasDataData: !!(data && data.data),
          dataKeys: data ? Object.keys(data) : [],
          dataDataKeys: data && data.data ? Object.keys(data.data) : [],
          hasList: !!(data && data.list),
          listLength: data?.list?.length || 0
        });
        
        // Handle the actual data structure from patched events
        if (data && data.list && data.list.length > 0) {
          const updatedRequest = data.list[0]; // Get the first (and should be only) item
          console.log('📝 Request updated in real-time:', updatedRequest);
          
          // Check if this request belongs to the current user AND has complete data
          if (updatedRequest.data && updatedRequest.data.userId === user?.uid && updatedRequest.data.name) {
            setRequests(prev => prev.map(req => 
              req.uid === updatedRequest.uid ? updatedRequest : req
            ));
          } else {
            console.log('⚠️ Updated request does not belong to current user or has invalid structure');
            // Refresh the data to get the complete updated request
            fetchUserRequests();
          }
        } else if (data && data.uid) {
          // Handle case where the event returns just the UID
          console.log('📝 Request update event with UID only:', data.uid);
          // We need to fetch the updated request data
          fetchUserRequests();
        } else {
          console.log('⚠️ Invalid request update data structure received:', data);
        }
      });

      // Listen for request deletions
      const deleteListener = client.ref.from(requestsTable.data.uid).on('deleted', (data: any) => {
        // Validate data structure before accessing properties
        if (data && data.data && data.data.userId === user?.uid) {
          console.log('🗑️ Request deleted in real-time:', data);
          setRequests(prev => prev.filter(req => req.uid !== data.uid));
        } else {
          console.log('⚠️ Invalid request deletion data structure received:', data);
        }
      });

      // Cleanup function
      return () => {
        if (createListener && typeof createListener.unsubscribe === 'function') {
          createListener.unsubscribe();
        }
        if (updateListener && typeof updateListener.unsubscribe === 'function') {
          updateListener.unsubscribe();
        }
        if (deleteListener && typeof deleteListener.unsubscribe === 'function') {
          deleteListener.unsubscribe();
        }
      };
    } catch (error) {
      console.error('❌ Error setting up real-time request listeners:', error);
    }
  };

  const fetchUserRequests = async () => {
    try {
      setIsLoading(true);
      
      // Use direct Sodular client like admin side
      const client = await getSodularClient();
      if (!client) {
        console.error('No Sodular client available');
        return;
      }

      // Get or create requests table
      let requestsTable = await client.tables.get({ filter: { 'data.name': 'requests' } });
      if (!requestsTable.data) {
        console.log('📋 Requests table not found, creating...');
        const requestsSchema = {
          name: 'requests',
          description: 'Support requests',
          fields: [
            { name: 'chatId', type: 'text', required: true },
            { name: 'name', type: 'text', required: true },
            { name: 'description', type: 'text', required: true },
            { name: 'userId', type: 'text', required: true },
            { name: 'userName', type: 'text', required: true },
            { name: 'createdAt', type: 'number', required: true },
            { name: 'label', type: 'text', required: true },
            { name: 'status', type: 'text', required: true },
            { name: 'technicianId', type: 'text' },
            { name: 'technicianName', type: 'text' },
            { name: 'technicianNote', type: 'text' },
            { name: 'processedAt', type: 'number' },
          ],
        };
        requestsTable = await client.tables.create({ data: requestsSchema });
      }

      if (!requestsTable.data?.uid) {
        console.error('❌ Failed to get or create requests table');
        return;
      }
      console.log('✅ Using requests table:', requestsTable.data.uid);

      // Query requests for current user
      console.log('🔍 Querying requests for user:', user!.uid);
      const requestsResult = await client.ref.from(requestsTable.data.uid).query({
        filter: { 'data.userId': user!.uid },
        take: 100
      });

      console.log('📊 Query result:', requestsResult);

      if (requestsResult.data?.list) {
        const sortedRequests = requestsResult.data.list.sort((a: any, b: any) => 
          (b.data.createdAt || 0) - (a.data.createdAt || 0)
        );
        setRequests(sortedRequests);
        console.log('✅ Fetched user requests:', sortedRequests.length);
      } else {
        setRequests([]);
        console.log('No requests found for user');
      }
    } catch (error) {
      console.error('Error fetching user requests:', error);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (confirm('Are you sure you want to delete this request?')) {
      try {
        const client = await getSodularClient();
        if (!client) {
          console.error('No Sodular client available');
          return;
        }

        // Get requests table
        let requestsTable = await client.tables.get({ filter: { 'data.name': 'requests' } });
        if (!requestsTable.data?.uid) {
          console.error('Requests table not found');
          return;
        }

        // Delete the request
        const result = await client.ref.from(requestsTable.data.uid).delete({ uid: requestId });
        
        if (!result.error) {
          console.log('Request deleted successfully');
          // Refresh requests
          await fetchUserRequests();
        } else {
          console.error('Failed to delete request:', result.error);
          alert('Failed to delete request: ' + result.error);
        }
      } catch (error) {
        console.error('Error deleting request:', error);
        alert('Error deleting request. Please try again.');
      }
    }
  };

  // Request Detail Functions
  const handleRequestClick = (request: Request) => {
    setSelectedRequest(request);
    setShowRequestDetailModal(true);
  };

  const closeRequestDetailModal = () => {
    setSelectedRequest(null);
    setShowRequestDetailModal(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing':
        return 'bg-blue-500';
      case 'processed':
        return 'bg-yellow-500';
      case 'done':
        return 'bg-green-500';
      case 'fail':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getLabelColor = (label: string) => {
    switch (label) {
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'normal':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

     const filteredRequests = requests.filter(request => {
     // Safety check: ensure request has data property
     if (!request || !request.data) {
       console.warn('⚠️ Request missing data property:', request);
       return false;
     }
     
     const matchesSearch = request.data.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          request.data.description?.toLowerCase().includes(searchQuery.toLowerCase());
     const matchesStatus = filterStatus === 'all' || request.data.status === filterStatus;
     return matchesSearch && matchesStatus;
   });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <div className="text-white">Loading requests...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-black">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-neutral-900 p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Requests</h1>
        </div>
        
        {/* Search and Controls */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-gray-300 text-gray-900 placeholder-gray-500 dark:bg-neutral-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-400"
            />
          </div>
          
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 dark:bg-neutral-900 dark:border-gray-700 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="ongoing">Ongoing</option>
            <option value="processed">Processed</option>
            <option value="done">Done</option>
            <option value="fail">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          
          {/* View Mode Toggle */}
          <div className="flex border border-gray-300 rounded-md dark:border-gray-700">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400 mb-4">
              {searchQuery || filterStatus !== 'all' ? 'No requests match your search' : 'No requests yet'}
            </div>
            {!searchQuery && filterStatus === 'all' && (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Create a request from a chat session when you need technical assistance.
              </p>
            )}
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
            {filteredRequests.map((request) => (
              <Card 
                key={request.uid} 
                className="bg-white dark:bg-neutral-900 border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleRequestClick(request)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg text-gray-900 dark:text-white mb-2">
                        {request.data.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getLabelColor(request.data.label)}>
                          {request.data.label}
                        </Badge>
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(request.data.status)}`} />
                        <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                          {request.data.status}
                        </span>
                      </div>
                    </div>
                    
                                         <DropdownMenu>
                       <DropdownMenuTrigger asChild>
                         <Button 
                           variant="ghost" 
                           size="sm" 
                           className="h-8 w-8 p-0"
                           onClick={(e) => e.stopPropagation()}
                         >
                           <MoreVertical className="h-4 w-4" />
                         </Button>
                       </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                                                 <DropdownMenuItem
                           className="text-red-400 hover:bg-gray-700 cursor-pointer"
                           onClick={(e) => {
                             e.stopPropagation();
                             handleDeleteRequest(request.uid);
                           }}
                         >
                           <Trash2 className="h-4 w-4 mr-2" />
                           Delete Request
                         </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-3">
                    {request.data.description}
                  </p>
                  
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>Created {formatDate(request.data.createdAt)}</span>
                    </div>
                    
                    {request.data.processedAt && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <span>Processed {formatDate(request.data.processedAt)}</span>
                      </div>
                    )}
                    
                    {request.data.technicianName && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>Technician: {request.data.technicianName}</span>
                      </div>
                    )}
                    
                    {request.data.technicianNote && (
                      <div className="bg-gray-50 dark:bg-neutral-800 p-3 rounded-md">
                        <div className="font-medium mb-1">Technician Note:</div>
                        <p className="text-sm">{request.data.technicianNote}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Request Detail Modal */}
      {showRequestDetailModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Request Details</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeRequestDetailModal}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-6">
              {/* Request Header */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {selectedRequest.data.name}
                </h3>
                <div className="flex items-center gap-3">
                  <Badge className={getLabelColor(selectedRequest.data.label)}>
                    {selectedRequest.data.label}
                  </Badge>
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(selectedRequest.data.status)}`} />
                  <span className="text-sm text-gray-600 dark:text-gray-400 capitalize font-medium">
                    {selectedRequest.data.status}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Description</h4>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {selectedRequest.data.description}
                </p>
              </div>

              {/* Request Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Request Information</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">User:</span> {selectedRequest.data.userName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Created:</span> {formatDate(selectedRequest.data.createdAt)}
                      </span>
                    </div>
                    {selectedRequest.data.chatId && (
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Chat Session:</span> {selectedRequest.data.chatId.slice(0, 8)}...
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Technician Information */}
                {(selectedRequest.data.technicianName || selectedRequest.data.processedAt) && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Technician Information</h4>
                    <div className="space-y-3">
                      {selectedRequest.data.technicianName && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-medium">Technician:</span> {selectedRequest.data.technicianName}
                          </span>
                        </div>
                      )}
                      {selectedRequest.data.processedAt && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-medium">Processed:</span> {formatDate(selectedRequest.data.processedAt)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Technician Note */}
              {selectedRequest.data.technicianNote && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Technician Note</h4>
                  <div className="bg-gray-50 dark:bg-neutral-800 p-4 rounded-md">
                    <p className="text-gray-700 dark:text-gray-300">
                      {selectedRequest.data.technicianNote}
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Request ID: {selectedRequest.uid}
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={closeRequestDetailModal}
                  >
                    Close
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      closeRequestDetailModal();
                      await handleDeleteRequest(selectedRequest.uid);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Request
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
