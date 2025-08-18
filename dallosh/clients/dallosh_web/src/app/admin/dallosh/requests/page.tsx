'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  FileText, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  User,
  MessageSquare,
  Calendar
} from "lucide-react";
import { getSodularClient } from "@/services/client";
import { useAuthStore } from "@/stores/auth";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface SupportRequest {
  uid: string;
  data: {
    chatId: string;
    name: string;
    description: string;
    userId: string;
    userName: string;
    createdAt: number;
    label: 'urgent' | 'normal' | 'low';
    status: 'ongoing' | 'processed' | 'done' | 'fail' | 'cancelled';
    technicianId?: string;
    technicianName?: string;
    technicianNote?: string;
    processedAt?: number;
  };
}

export default function SupportRequestsPage() {
  const { user, isAdmin, isAgent } = useAuthStore();
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [labelFilter, setLabelFilter] = useState<string>("all");
  const [userEmailFilter, setUserEmailFilter] = useState("");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingRequest, setEditingRequest] = useState<SupportRequest | null>(null);
  const [requestsTableUID, setRequestsTableUID] = useState<string | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    status: "",
    technicianNote: "",
  });

  useEffect(() => {
    const initializeData = async () => {
      await fetchRequests();
      await setupRealtimeListeners();
    };
    
    initializeData();
  }, []);

  // Setup real-time listeners for admin requests
  const setupRealtimeListeners = async () => {
    try {
      const client = await getSodularClient();
      if (!client) return;

      // Get or create requests table
      let requestsTable = await client.tables.get({ filter: { 'data.name': 'requests' } });
      if (!requestsTable.data) return;

      // Store the table UID for use in other functions
      setRequestsTableUID(requestsTable.data.uid);

      console.log('🔔 Setting up real-time request listeners for admin...');

      // Listen for new requests
      const createListener = client.ref.from(requestsTable.data.uid).on('created', (data: any) => {
        console.log('📨 New request received in real-time for admin:', data);
        console.log('📊 Data structure analysis:', {
          hasData: !!data,
          hasDataData: !!(data && data.data),
          dataKeys: data ? Object.keys(data) : [],
          dataDataKeys: data && data.data ? Object.keys(data.data) : []
        });
        
        // Handle different data structures
        const requestData = data.data || data;
        if (requestData && requestData.uid && requestData.data?.name) {
          console.log('📨 Adding new request to admin list:', requestData);
          setRequests(prev => {
            // Check if request already exists
            const exists = prev.some(req => req.uid === requestData.uid);
            if (exists) return prev;
            return [requestData, ...prev];
          });
        } else {
          console.log('⚠️ Invalid request creation data structure received:', data);
          // Refresh the data to get the complete new request
          fetchRequests();
        }
      });

            // Listen for request updates (patched events)
      const updateListener = client.ref.from(requestsTable.data.uid).on('patched', (data: any) => {
        console.log('📝 Request updated in real-time for admin:', data);
        console.log('📊 Data structure analysis:', {
          hasData: !!data,
          hasDataData: !!(data && data.data),
          hasList: !!(data && data.list),
          listLength: data?.list?.length || 0
        });
        
        // Handle the actual data structure from patched events
        if (data && data.list && data.list.length > 0) {
          const updatedRequest = data.list[0]; // Get the first (and should be only) item
          console.log('📝 Request updated in real-time for admin:', updatedRequest);
          
          // Only update if we have complete data
          if (updatedRequest && updatedRequest.data && updatedRequest.data.name) {
            setRequests(prev => prev.map(req => 
              req.uid === updatedRequest.uid ? updatedRequest : req
            ));
          } else {
            console.log('⚠️ Updated request has invalid structure');
            // Refresh the data to get the complete updated request
            fetchRequests();
          }
        } else if (data && data.uid) {
          // Handle case where the event returns just the UID
          console.log('📝 Request update event with UID only:', data.uid);
          // We need to fetch the updated request data
          fetchRequests();
        } else {
          console.log('⚠️ Invalid request update data structure received:', data);
        }
      });

      // Listen for request deletions
      const deleteListener = client.ref.from(requestsTable.data.uid).on('deleted', (data: any) => {
        console.log('🗑️ Request deleted in real-time for admin:', data);
        // Handle different data structures
        const requestData = data.data || data;
        if (requestData && requestData.uid) {
          setRequests(prev => prev.filter(req => req.uid !== requestData.uid));
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
      console.error('❌ Error setting up real-time request listeners for admin:', error);
    }
  };

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const client = await getSodularClient();
      if (!client) return;

      // First, get or create the requests table
      let requestsTableUID = await getOrCreateRequestsTable(client);
      if (!requestsTableUID) {
        console.error("Failed to get or create requests table");
        return;
      }

      // Store the table UID for use in other functions
      setRequestsTableUID(requestsTableUID);

      console.log("Fetching requests from table:", requestsTableUID);
      const result = await client.ref.from(requestsTableUID).query({ take: 100 });
      console.log("Requests result:", result);
      
      if (result.data?.list) {
        setRequests(result.data.list);
      } else {
        console.log("No requests found");
        setRequests([]);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get or create requests table
  const getOrCreateRequestsTable = async (client: any): Promise<string | null> => {
    try {
      // Try to get existing table
      let table = await client.tables.get({ filter: { 'data.name': 'requests' } });
      
      if (!table.data) {
        // Create table if it doesn't exist
        console.log("Creating requests table...");
        const tableSchema = {
          name: 'requests',
          description: 'Technical assistance requests',
          fields: [
            { name: 'chatId', type: 'text', required: true },
            { name: 'name', type: 'text', required: true },
            { name: 'description', type: 'text', required: true },
            { name: 'userId', type: 'text', required: true },
            { name: 'userName', type: 'text', required: true },
            { name: 'userEmail', type: 'text' },
            { name: 'createdAt', type: 'number', required: true },
            { name: 'label', type: 'text', required: true },
            { name: 'status', type: 'text', required: true },
            { name: 'technicianId', type: 'text' },
            { name: 'technicianName', type: 'text' },
            { name: 'technicianNote', type: 'text' },
            { name: 'processedAt', type: 'number' },
          ],
        };
        
        table = await client.tables.create({ data: tableSchema });
        console.log("Requests table created:", table);
      }
      
      return table.data?.uid || null;
    } catch (error) {
      console.error("Error getting/creating requests table:", error);
      return null;
    }
  };

     // Filter requests based on search and filters
   const filteredRequests = requests.filter(request => {
     // Safety check: ensure request has data property
     if (!request || !request.data) {
       console.warn('⚠️ Request missing data property:', request);
       return false;
     }
     
     const matchesSearch = request.data.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          request.data.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          request.data.userName?.toLowerCase().includes(searchQuery.toLowerCase());
     const matchesStatus = statusFilter === 'all' || request.data.status === statusFilter;
     const matchesLabel = labelFilter === 'all' || request.data.label === labelFilter;
     const matchesEmail = !userEmailFilter || 
                         (request.data.userEmail && request.data.userEmail.toLowerCase().includes(userEmailFilter.toLowerCase()));
     
     return matchesSearch && matchesStatus && matchesLabel && matchesEmail;
   });

  const handleUpdateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingRequest) return;
    
    if (!formData.status.trim()) {
      alert("Please select a status for the request.");
      return;
    }
    
    try {
      const client = await getSodularClient();
      if (!client) return;

      const updateData: any = {
        data: {
          status: formData.status,
        },
      };

      // Add technician note if provided
      if (formData.technicianNote.trim()) {
        updateData.data.technicianNote = formData.technicianNote.trim();
      }

      // Add technician info if status is being updated
      if (formData.status !== editingRequest.data.status) {
        updateData.data.technicianId = user?.uid;
        updateData.data.technicianName = user?.data?.fields?.displayName || user?.data?.username;
        
        // Set processed time for status changes
        if (formData.status === 'processed' || formData.status === 'done' || formData.status === 'fail') {
          updateData.data.processedAt = Date.now();
        }
      }

      if (!requestsTableUID) {
        console.error("No requests table UID available");
        alert("Error: No requests table available. Please refresh the page.");
        return;
      }

      console.log("Updating request with table UID:", requestsTableUID);
      console.log("Update data:", updateData);
      
      const result = await client.ref.from(requestsTableUID).patch({ uid: editingRequest.uid }, updateData);
      
      if (result.data) {
        console.log("Request updated successfully:", result.data);
        setShowEditDialog(false);
        setEditingRequest(null);
        resetForm();
        fetchRequests(); // Refresh the list
      } else {
        console.error("Failed to update request:", result.error);
        alert("Failed to update request: " + result.error);
      }
    } catch (error) {
      console.error("Error updating request:", error);
      alert("Error updating request. Please try again.");
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm("Are you sure you want to delete this request? This action cannot be undone.")) {
      return;
    }

    try {
      const client = await getSodularClient();
      if (!client) return;

      if (!requestsTableUID) {
        console.error("No requests table UID available");
        alert("Error: No requests table available. Please refresh the page.");
        return;
      }

      console.log("Deleting request with table UID:", requestsTableUID);
      
      const result = await client.ref.from(requestsTableUID).delete({ uid: requestId });
      
      if (!result.error) {
        console.log("Request deleted successfully");
        fetchRequests(); // Refresh the list
      } else {
        console.error("Failed to delete request:", result.error);
        alert("Failed to delete request: " + result.error);
      }
    } catch (error) {
      console.error("Error deleting request:", error);
      alert("Error deleting request. Please try again.");
    }
  };

  const resetForm = () => {
    setFormData({
      status: "",
      technicianNote: "",
    });
  };

  const openEditDialog = (request: SupportRequest) => {
    if (!requestsTableUID) {
      alert("Error: No requests table available. Please refresh the page.");
      return;
    }
    
    setEditingRequest(request);
    setFormData({
      status: request.data.status,
      technicianNote: request.data.technicianNote || "",
    });
    setShowEditDialog(true);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ongoing':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'processed':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'done':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };



  if (!isAdmin() && !isAgent()) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 mb-4">Access Denied</div>
        <div className="text-gray-400">You don't have permission to access this page.</div>
      </div>
    );
  }

  if (isLoading || !requestsTableUID) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">
          {isLoading ? "Loading requests..." : "Initializing requests table..."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Support Requests</h1>
          <p className="text-gray-400">Manage customer support requests and track their progress</p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              
              {/* User Email Filter */}
              <Input
                placeholder="Filter by user email..."
                value={userEmailFilter}
                onChange={(e) => setUserEmailFilter(e.target.value)}
                className="w-48 bg-gray-800 border-gray-700 text-white"
              />
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="fail">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={labelFilter} onValueChange={setLabelFilter}>
                <SelectTrigger className="w-32 bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  <SelectItem value="all">All Labels</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <div className="grid gap-4">
        {filteredRequests.map((request) => (
          <Card key={request.uid} className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-white">{request.data.name}</span>
                    <Badge className={getLabelColor(request.data.label)}>
                      {request.data.label}
                    </Badge>
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(request.data.status)}`} />
                    <span className="text-sm text-gray-400 capitalize">
                      {request.data.status}
                    </span>
                  </div>
                  
                  <p className="text-gray-300 mb-3">{request.data.description}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{request.data.userName}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(request.data.createdAt)}</span>
                    </div>
                    
                    {request.data.processedAt && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <span>Processed: {formatDate(request.data.processedAt)}</span>
                      </div>
                    )}
                    
                    {request.data.technicianName && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>Tech: {request.data.technicianName}</span>
                      </div>
                    )}
                  </div>
                  
                  {request.data.technicianNote && (
                    <div className="mt-3 p-3 bg-gray-800 rounded-lg">
                      <div className="text-sm font-medium text-gray-300 mb-1">Technician Note:</div>
                      <p className="text-sm text-gray-400">{request.data.technicianNote}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                      <DropdownMenuItem
                        onClick={() => openEditDialog(request)}
                        className="text-white hover:bg-gray-700 cursor-pointer"
                        disabled={!requestsTableUID}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Update Status
                      </DropdownMenuItem>
                      {(isAdmin() || request.data.technicianId === user?.uid) && (
                        <DropdownMenuItem
                          onClick={() => handleDeleteRequest(request.uid)}
                          className="text-red-400 hover:bg-gray-700 cursor-pointer"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Request
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Request Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Update Request Status</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update the status and add notes for this support request.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateRequest} className="space-y-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="fail">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="technicianNote">Technician Note</Label>
              <Textarea
                id="technicianNote"
                value={formData.technicianNote}
                onChange={(e) => setFormData(prev => ({ ...prev, technicianNote: e.target.value }))}
                placeholder="Add a note about this request..."
                className="bg-gray-800 border-gray-700 text-white resize-none"
                rows={4}
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Request</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
