'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Headphones, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  UserPlus,
  Clock,
  Calendar,
  Shield
} from "lucide-react";
import { getSodularClient } from "@/services/client";
import { useAuthStore } from "@/stores/auth";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AgentData {
  uid: string;
  data: {
    email: string;
    username?: string;
    imageUrl?: string;
    fields?: {
      displayName?: string;
      role?: string;
      bio?: string;
      specialization?: string;
      availability?: string;
    };
    createdAt: number;
    isActive: boolean;
  };
}

export default function AgentsManagementPage() {
  const { isAdmin } = useAuthStore();
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentData | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    displayName: "",
    specialization: "",
    availability: "available",
    bio: "",
  });

  useEffect(() => {
    if (isAdmin()) {
      fetchAgents();
    }
  }, [isAdmin]);

  const fetchAgents = async () => {
    try {
      setIsLoading(true);
      const client = await getSodularClient();
      if (!client) return;

      const result = await client.auth.query({ take: 100 });
      if (result.data?.list) {
        // Filter only agents
        const agentsList = result.data.list.filter(user => user.data.fields?.role === 'agent');
        setAgents(agentsList);
      }
    } catch (error) {
      console.error("Error fetching agents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const client = await getSodularClient();
      if (!client) return;

      const agentData = {
        data: {
          email: formData.email,
          password: formData.password,
          username: formData.username,
          fields: {
            displayName: formData.displayName,
            role: 'agent', // Always set as agent
            bio: formData.bio,
            specialization: formData.specialization,
            availability: formData.availability,
          },
        },
      };

      const result = await client.auth.create(agentData);
      
      if (result.data) {
        console.log("Agent created successfully:", result.data);
        setShowCreateDialog(false);
        resetForm();
        fetchAgents(); // Refresh the list
      } else {
        console.error("Failed to create agent:", result.error);
        alert("Failed to create agent: " + result.error);
      }
    } catch (error) {
      console.error("Error creating agent:", error);
      alert("Error creating agent. Please try again.");
    }
  };

  const handleEditAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingAgent) return;
    
    try {
      const client = await getSodularClient();
      if (!client) return;

      const updateData = {
        data: {
          username: formData.username,
          fields: {
            displayName: formData.displayName,
            role: 'agent', // Keep as agent
            bio: formData.bio,
            specialization: formData.specialization,
            availability: formData.availability,
          },
        },
      };

      const result = await client.auth.patch({ uid: editingAgent.uid }, updateData);
      
      if (result.data) {
        console.log("Agent updated successfully:", result.data);
        setShowEditDialog(false);
        setEditingAgent(null);
        resetForm();
        fetchAgents(); // Refresh the list
      } else {
        console.error("Failed to update agent:", result.error);
        alert("Failed to update agent: " + result.error);
      }
    } catch (error) {
      console.error("Error updating agent:", error);
      alert("Error updating agent. Please try again.");
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm("Are you sure you want to delete this agent? This action cannot be undone.")) {
      return;
    }

    try {
      const client = await getSodularClient();
      if (!client) return;

      const result = await client.auth.delete({ uid: agentId });
      
      if (!result.error) {
        console.log("Agent deleted successfully");
        fetchAgents(); // Refresh the list
      } else {
        console.error("Failed to delete agent:", result.error);
        alert("Failed to delete agent: " + result.error);
      }
    } catch (error) {
      console.error("Error deleting agent:", error);
      alert("Error deleting agent. Please try again.");
    }
  };

  const resetForm = () => {
    setFormData({
      email: "",
      username: "",
      password: "",
      displayName: "",
      specialization: "",
      availability: "available",
      bio: "",
    });
  };

  const openEditDialog = (agent: AgentData) => {
    setEditingAgent(agent);
    setFormData({
      email: agent.data.email,
      username: agent.data.username || "",
      password: "", // Don't show password in edit
      displayName: agent.data.fields?.displayName || "",
      specialization: agent.data.fields?.specialization || "",
      availability: agent.data.fields?.availability || "available",
      bio: agent.data.fields?.bio || "",
    });
    setShowEditDialog(true);
  };

  const getAvailabilityBadge = (availability: string) => {
    switch (availability) {
      case 'available':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Available</Badge>;
      case 'busy':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Busy</Badge>;
      case 'offline':
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">Offline</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">Unknown</Badge>;
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  // Filter agents based on search and availability
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = 
      agent.data.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (agent.data.username && agent.data.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (agent.data.fields?.displayName && agent.data.fields.displayName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (agent.data.fields?.specialization && agent.data.fields.specialization.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesAvailability = availabilityFilter === "all" || agent.data.fields?.availability === availabilityFilter;
    
    return matchesSearch && matchesAvailability;
  });

  if (!isAdmin()) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 mb-4">Access Denied</div>
        <div className="text-gray-400">You don't have permission to access this page.</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading agents...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Agent Management</h1>
          <p className="text-gray-400">Create and manage support agent accounts</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Create Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-800 text-white">
            <DialogHeader>
              <DialogTitle>Create New Agent</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateAgent} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  required
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="specialization">Specialization</Label>
                  <Input
                    id="specialization"
                    value={formData.specialization}
                    onChange={(e) => setFormData(prev => ({ ...prev, specialization: e.target.value }))}
                    placeholder="e.g., Technical Support, Billing"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="availability">Availability</Label>
                  <Select value={formData.availability} onValueChange={(value) => setFormData(prev => ({ ...prev, availability: value }))}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="busy">Busy</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Input
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Brief description about the agent"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Agent</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value)}
                className="px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-white"
              >
                <option value="all">All Availability</option>
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="offline">Offline</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agents List */}
      <div className="grid gap-4">
        {filteredAgents.map((agent) => (
          <Card key={agent.uid} className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={agent.data.imageUrl} alt={agent.data.username || agent.data.email} />
                    <AvatarFallback className="bg-gray-600 text-white">
                      {(agent.data.username || agent.data.email[0]).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">
                        {agent.data.fields?.displayName || agent.data.username || 'No Name'}
                      </span>
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        <Headphones className="h-3 w-3 mr-1" />
                        Agent
                      </Badge>
                      {getAvailabilityBadge(agent.data.fields?.availability || 'offline')}
                    </div>
                    <div className="text-sm text-gray-400">
                      @{agent.data.username || 'no-username'} • {agent.data.email}
                    </div>
                    {agent.data.fields?.specialization && (
                      <div className="text-sm text-gray-500 mt-1">
                        <Shield className="h-3 w-3 inline mr-1" />
                        {agent.data.fields.specialization}
                      </div>
                    )}
                    {agent.data.fields?.bio && (
                      <div className="text-sm text-gray-500 mt-1">{agent.data.fields.bio}</div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      Created: {formatDate(agent.data.createdAt)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                      <DropdownMenuItem
                        onClick={() => openEditDialog(agent)}
                        className="text-white hover:bg-gray-700 cursor-pointer"
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Agent
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteAgent(agent.uid)}
                        className="text-red-400 hover:bg-gray-700 cursor-pointer"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Agent
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Agent Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Edit Agent</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditAgent} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-gray-700 border-gray-600 text-gray-300 cursor-not-allowed"
                />
              </div>
              <div>
                <Label htmlFor="edit-username">Username</Label>
                <Input
                  id="edit-username"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-displayName">Display Name</Label>
                <Input
                  id="edit-displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label htmlFor="edit-specialization">Specialization</Label>
                <Input
                  id="edit-specialization"
                  value={formData.specialization}
                  onChange={(e) => setFormData(prev => ({ ...prev, specialization: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-availability">Availability</Label>
                <Select value={formData.availability} onValueChange={(value) => setFormData(prev => ({ ...prev, availability: value }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="busy">Busy</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-bio">Bio</Label>
                <Input
                  id="edit-bio"
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Agent</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
