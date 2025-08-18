"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Link2, Search } from "lucide-react";
import { getSodularClient } from "@/services";
import { toast } from "sonner";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Command, CommandInput, CommandGroup, CommandItem, CommandEmpty } from "@/components/ui/command";
import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Collection {
  uid: string;
  data: {
    name: string;
    description?: string;
  };
  createdAt: number;
}

interface RelationshipDocument {
  uid: string;
  data: {
    name: string;
    description?: string;
    collection_id: string;
    children: { collection_id: string; field: string }[];
    isDefault: boolean;
  };
  createdAt: number;
  updatedAt?: number;
}

interface RelationshipsManagementProps {
  relationshipsCollectionId?: string;
}

export function RelationshipsManagement({ relationshipsCollectionId }: RelationshipsManagementProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [relationships, setRelationships] = useState<RelationshipDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRelationship, setEditingRelationship] = useState<RelationshipDocument | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    collection_id: "",
    children: [] as { collection_id: string; field: string }[],
    isDefault: false
  });

  // Add state for collection search, pagination
  const [collectionsSearchInput, setCollectionsSearchInput] = useState("");
  const [collectionsPage, setCollectionsPage] = useState(1);
  const [collectionsTotal, setCollectionsTotal] = useState(0);
  const collectionsPageSize = 10;
  const collectionsSearchDebounce = useRef<NodeJS.Timeout | null>(null);

  // Add state for relationships search, pagination
  const [relationshipsSearchInput, setRelationshipsSearchInput] = useState("");
  const [relationshipsPage, setRelationshipsPage] = useState(1);
  const [relationshipsTotal, setRelationshipsTotal] = useState(0);
  const relationshipsPageSize = 10;
  const relationshipsSearchDebounce = useRef<NodeJS.Timeout | null>(null);

  // New state for child collection fields
  const [childFieldsMap, setChildFieldsMap] = useState<Record<string, string[]>>({});
  const [childLoadingMap, setChildLoadingMap] = useState<Record<string, boolean>>({});

  // Add state for child collection search and pagination
  const [childCollectionSearch, setChildCollectionSearch] = useState("");
  const [childCollectionPage, setChildCollectionPage] = useState(1);
  const [childCollectionOptions, setChildCollectionOptions] = useState<Collection[]>([]);
  const [childCollectionTotal, setChildCollectionTotal] = useState(0);
  const childCollectionsPageSize = 10;
  const [childCollectionLoading, setChildCollectionLoading] = useState(false);

  // At the top level of the component:
  const [fieldSearches, setFieldSearches] = useState<string[]>([]);

  useEffect(() => {
    if (relationshipsCollectionId) {
      fetchCollections();
    }
  }, [relationshipsCollectionId]);

  useEffect(() => {
    if (selectedCollection && relationshipsCollectionId) {
      fetchRelationships();
    }
  }, [selectedCollection, relationshipsCollectionId]);

  // --- Effects for collections search & pagination ---
  useEffect(() => {
    if (collectionsSearchDebounce.current) clearTimeout(collectionsSearchDebounce.current);
    collectionsSearchDebounce.current = setTimeout(() => {
      fetchCollections();
    }, 300);
    return () => {
      if (collectionsSearchDebounce.current) clearTimeout(collectionsSearchDebounce.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionsSearchInput, collectionsPage, relationshipsCollectionId]);

  // --- Effects for relationships search & pagination ---
  useEffect(() => {
    if (!selectedCollection || !relationshipsCollectionId) return;
    if (relationshipsSearchDebounce.current) clearTimeout(relationshipsSearchDebounce.current);
    relationshipsSearchDebounce.current = setTimeout(() => {
      fetchRelationships();
    }, 300);
    return () => {
      if (relationshipsSearchDebounce.current) clearTimeout(relationshipsSearchDebounce.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relationshipsSearchInput, relationshipsPage, selectedCollection, relationshipsCollectionId]);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const client = getSodularClient();
      const filter = collectionsSearchInput
        ? { 'data.name': { $regex: collectionsSearchInput, $options: 'i' } }
        : {};
      const result = await client.tables.query({
        filter,
        sort: { 'data.name': 'asc' },
        take: collectionsPageSize,
        skip: (collectionsPage - 1) * collectionsPageSize
      });
      if (result.data?.list) {
        setCollections(result.data.list);
        setCollectionsTotal(result.data.total || 0);
        // Try to preserve selected collection
        if (result.data.list.length > 0 && (!selectedCollection || !result.data.list.some(c => c.uid === selectedCollection.uid))) {
          setSelectedCollection(result.data.list[0]);
        }
      }
    } catch (error: any) {
      console.error('Error fetching collections:', error);
      toast.error('Failed to fetch collections');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelationships = async () => {
    if (!selectedCollection || !relationshipsCollectionId) return;
    try {
      setLoading(true);
      const client = getSodularClient();
      const filter = {
        'data.collection_id': selectedCollection.uid,
        ...(relationshipsSearchInput ? { 'data.name': { $regex: relationshipsSearchInput, $options: 'i' } } : {})
      };
      const result = await client.ref.from(relationshipsCollectionId).query({
        filter,
        sort: { 'data.name': 'asc' },
        take: relationshipsPageSize,
        skip: (relationshipsPage - 1) * relationshipsPageSize
      });
      if (result.data?.list) {
        setRelationships(result.data.list);
        setRelationshipsTotal(result.data.total || 0);
      }
    } catch (error: any) {
      console.error('Error fetching relationships:', error);
      toast.error('Failed to fetch relationships');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRelationship = async () => {
    if (!relationshipsCollectionId || !selectedCollection) return;
    try {
      const client = getSodularClient();
      // If setting as default, first disable other defaults
      if (formData.isDefault) {
        await client.ref.from(relationshipsCollectionId).patch(
          { 'data.collection_id': selectedCollection.uid, 'data.isDefault': true },
          { data: { isDefault: false } }
        );
      }
      const result = await client.ref.from(relationshipsCollectionId).create({
        data: {
          ...formData,
          collection_id: selectedCollection.uid
        }
      });
      if (result.data) {
        toast.success('Relationship created successfully');
        setIsCreateDialogOpen(false);
        resetForm();
        fetchRelationships();
      }
    } catch (error: any) {
      console.error('Error creating relationship:', error);
      toast.error('Failed to create relationship');
    }
  };

  const handleEditRelationship = async () => {
    if (!relationshipsCollectionId || !editingRelationship) return;
    try {
      const client = getSodularClient();
      // If setting as default, first disable other defaults
      if (formData.isDefault && !editingRelationship.data.isDefault) {
        await client.ref.from(relationshipsCollectionId).patch(
          { 'data.collection_id': editingRelationship.data.collection_id, 'data.isDefault': true },
          { data: { isDefault: false } }
        );
      }
      const result = await client.ref.from(relationshipsCollectionId).patch(
        { uid: editingRelationship.uid },
        { data: { ...formData } }
      );
      if (result.data) {
        toast.success('Relationship updated successfully');
        setIsEditDialogOpen(false);
        setEditingRelationship(null);
        resetForm();
        fetchRelationships();
      }
    } catch (error: any) {
      console.error('Error updating relationship:', error);
      toast.error('Failed to update relationship');
    }
  };

  const handleDeleteRelationship = async (relationship: RelationshipDocument) => {
    if (!relationshipsCollectionId) return;
    try {
      const client = getSodularClient();
      const result = await client.ref.from(relationshipsCollectionId).delete(
        { uid: relationship.uid },
        { withSoftDelete: true }
      );
      if (result.data) {
        toast.success('Relationship deleted successfully');
        fetchRelationships();
      }
    } catch (error: any) {
      console.error('Error deleting relationship:', error);
      toast.error('Failed to delete relationship');
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      collection_id: "",
      children: [],
      isDefault: false
    });
  };

  const openEditDialog = (relationship: RelationshipDocument) => {
    setEditingRelationship(relationship);
    setFormData({
      name: relationship.data.name,
      description: relationship.data.description || "",
      collection_id: relationship.data.collection_id,
      children: relationship.data.children || [],
      isDefault: relationship.data.isDefault
    });
    setIsEditDialogOpen(true);
  };

  // Helper to get collection label by uid
  const getCollectionLabel = (uid: string) => {
    const col = collections.find(c => c.uid === uid);
    return col ? col.data.name : uid;
  };

  // Fetch fields for a child collection
  const fetchChildFields = async (collectionId: string) => {
    if (!collectionId || childFieldsMap[collectionId]) return;
    setChildLoadingMap(prev => ({ ...prev, [collectionId]: true }));
    try {
      const client = getSodularClient();
      const result = await client.ref.from(collectionId).query({ take: 1, skip: 0 });
      const doc = result.data?.list?.[0];
      if (doc && doc.data) {
        setChildFieldsMap(prev => ({ ...prev, [collectionId]: Object.keys(doc.data) }));
      } else {
        setChildFieldsMap(prev => ({ ...prev, [collectionId]: [] }));
      }
    } catch {
      setChildFieldsMap(prev => ({ ...prev, [collectionId]: [] }));
    } finally {
      setChildLoadingMap(prev => ({ ...prev, [collectionId]: false }));
    }
  };

  // Fetch child collections for dropdown (searchable, paginated)
  const fetchChildCollections = async (search = "", page = 1) => {
    setChildCollectionLoading(true);
    try {
      const client = getSodularClient();
      const filter = search ? { 'data.name': { $regex: search, $options: 'i' } } : {};
      const result = await client.tables.query({
        filter,
        sort: { 'data.name': 'asc' },
        take: childCollectionsPageSize,
        skip: (page - 1) * childCollectionsPageSize
      });
      if (result.data?.list) {
        // Filter out schema/relationships and current parent
        const filtered = result.data.list.filter(c => c.data.name !== 'schema' && c.data.name !== 'relationships' && c.uid !== selectedCollection?.uid);
        setChildCollectionOptions(page === 1 ? filtered : prev => [...prev, ...filtered]);
        setChildCollectionTotal(result.data.total || 0);
      }
    } finally {
      setChildCollectionLoading(false);
    }
  };

  // When dialog opens or search/page changes, fetch child collections
  useEffect(() => {
    if (isCreateDialogOpen || isEditDialogOpen) {
      fetchChildCollections(childCollectionSearch, childCollectionPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childCollectionSearch, childCollectionPage, isCreateDialogOpen, isEditDialogOpen, selectedCollection]);

  // When collections list changes, set default selected collection
  useEffect(() => {
    const filtered = collections.filter(c => c.data.name !== 'schema' && c.data.name !== 'relationships');
    if (!selectedCollection || !filtered.some(c => c.uid === selectedCollection.uid)) {
      if (filtered.length > 0) {
        setSelectedCollection(filtered[0]);
      } else {
        setSelectedCollection(null);
      }
    }
  }, [collections]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-[600px] border rounded-lg">
      {/* Collections Sidebar */}
      <div className="w-1/3 border-r bg-muted/50 flex flex-col h-full">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Collections</h3>
          <p className="text-sm text-muted-foreground">Select a collection to manage its relationships</p>
        </div>
        <div className="p-2">
          <Input
            placeholder="Search collections..."
            value={collectionsSearchInput}
            onChange={e => {
              setCollectionsSearchInput(e.target.value);
              setCollectionsPage(1);
            }}
            className="mb-2"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {collections
            .filter(collection => collection.data.name !== 'schema' && collection.data.name !== 'relationships')
            .map(collection => (
              <div
                key={collection.uid}
                className={`cursor-pointer px-4 py-2 ${selectedCollection?.uid === collection.uid ? 'bg-primary text-primary-foreground rounded' : ''}`}
                onClick={() => setSelectedCollection(collection)}
              >
                <div className="font-medium">{collection.data.name}</div>
                <div className="text-xs text-muted-foreground">{collection.data.description}</div>
              </div>
            ))}
        </div>
        <div className="border-t p-2 sticky bottom-0 bg-muted/50 z-10">
          <div className="flex justify-between items-center">
            <Button size="sm" variant="outline" disabled={collectionsPage === 1} onClick={() => setCollectionsPage(p => Math.max(1, p - 1))}>Prev</Button>
            <span className="text-xs">Page {collectionsPage} / {Math.ceil(collectionsTotal / collectionsPageSize) || 1}</span>
            <Button size="sm" variant="outline" disabled={collectionsPage * collectionsPageSize >= collectionsTotal} onClick={() => setCollectionsPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      </div>

      {/* Relationships Content */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">
                {selectedCollection ? `${selectedCollection.data.name} Relationships` : 'Select Collection'}
              </h3>
              <p className="text-sm text-muted-foreground">
                Manage relationships for the selected collection
              </p>
            </div>
            {selectedCollection && (
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Relationship
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Relationship</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Relationship Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Enter relationship name"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="isDefault">Set as default</Label>
                        <input
                          type="checkbox"
                          id="isDefault"
                          checked={formData.isDefault}
                          onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Enter relationship description"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Children (related collections)</Label>
                      {formData.children.map((child, idx) => {
                        const fieldSearch = fieldSearches[idx] || "";
                        const filteredFields = (childFieldsMap[child.collection_id] || []).filter(f => f.toLowerCase().includes(fieldSearch.toLowerCase()));
                        return (
                          <div key={idx} className="flex space-x-2 mb-2 items-center">
                            {/* Child Collection Dropdown with search and load more */}
                            <div className="w-1/3">
                              <Select
                                value={child.collection_id}
                                onValueChange={val => {
                                  const children = [...formData.children];
                                  children[idx].collection_id = val;
                                  children[idx].field = "";
                                  setFormData({ ...formData, children });
                                  fetchChildFields(val);
                                }}
                              >
                                <SelectTrigger>
                                  {child.collection_id ? getCollectionLabel(child.collection_id) : <SelectValue placeholder="Select child collection" />}
                                </SelectTrigger>
                                <SelectContent>
                                  <Command>
                                    <CommandInput
                                      placeholder="Search collections..."
                                      value={childCollectionSearch}
                                      onValueChange={val => {
                                        setChildCollectionSearch(val);
                                        setChildCollectionPage(1);
                                      }}
                                    />
                                    <CommandEmpty>No collections found.</CommandEmpty>
                                    <CommandGroup>
                                      {childCollectionOptions.map(c => (
                                        <CommandItem key={c.uid} value={c.uid} onSelect={() => {
                                          const children = [...formData.children];
                                          children[idx].collection_id = c.uid;
                                          children[idx].field = "";
                                          setFormData({ ...formData, children });
                                          fetchChildFields(c.uid);
                                        }}>
                                          {c.data.name}
                                        </CommandItem>
                                      ))}
                                      {childCollectionOptions.length < childCollectionTotal && (
                                        <CommandItem disabled={childCollectionLoading} onSelect={() => setChildCollectionPage(p => p + 1)}>
                                          {childCollectionLoading ? "Loading..." : "Load more..."}
                                        </CommandItem>
                                      )}
                                    </CommandGroup>
                                  </Command>
                                </SelectContent>
                              </Select>
                            </div>
                            {/* Parent Field Dropdown with search */}
                            <div className="w-1/3">
                              <Select
                                value={child.field}
                                onValueChange={val => {
                                  const children = [...formData.children];
                                  children[idx].field = val;
                                  setFormData({ ...formData, children });
                                }}
                              >
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="w-full justify-between"
                                    disabled={!child.collection_id || childLoadingMap[child.collection_id]}
                                  >
                                    {child.field ? child.field : <SelectValue placeholder={childLoadingMap[child.collection_id] ? "Loading..." : "Select parent field"} />}
                                  </Button>
                                </DropdownMenuTrigger>
                                <SelectContent>
                                  <Command>
                                    <CommandInput
                                      placeholder="Search fields..."
                                      value={fieldSearch}
                                      onValueChange={val => {
                                        const newSearches = [...fieldSearches];
                                        newSearches[idx] = val;
                                        setFieldSearches(newSearches);
                                      }}
                                    />
                                    <CommandEmpty>No fields found.</CommandEmpty>
                                    <CommandGroup>
                                      {filteredFields.map(field => (
                                        <CommandItem key={field} value={field} onSelect={() => {
                                          const children = [...formData.children];
                                          children[idx].field = field;
                                          setFormData({ ...formData, children });
                                        }}>
                                          {field}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </Command>
                                </SelectContent>
                              </Select>
                            </div>
                            {/* Remove Button */}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                const children = formData.children.filter((_, i) => i !== idx);
                                setFormData({ ...formData, children });
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        );
                      })}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFormData({ ...formData, children: [...formData.children, { collection_id: '', field: '' }] })}
                      >
                        Add Child
                      </Button>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateRelationship}>Create Relationship</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
          {selectedCollection && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search relationships..."
                value={relationshipsSearchInput}
                onChange={e => {
                  setRelationshipsSearchInput(e.target.value);
                  setRelationshipsPage(1);
                }}
                className="pl-10"
              />
            </div>
          )}
        </div>
        <div className="flex-1 overflow-auto">
          <CardContent>
            {selectedCollection && relationships.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Link2 className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No relationships found for this collection</p>
                <Button onClick={() => setIsCreateDialogOpen(true)} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Relationship
                </Button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Name</th>
                    <th className="text-left">Description</th>
                    <th className="text-left">Children</th>
                    <th className="text-left">Default</th>
                    <th className="text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {relationships.map((relationship) => (
                    <tr key={relationship.uid}>
                      <td>{relationship.data.name}</td>
                      <td>{relationship.data.description || '-'}</td>
                      <td>
                        {relationship.data.children.map((child, idx) => (
                          <div key={idx} className="mb-1">
                            <Badge variant="secondary">
                              {child.collection_id} → {child.field}
                            </Badge>
                          </div>
                        ))}
                      </td>
                      <td>
                        {relationship.data.isDefault ? (
                          <Badge variant="default">Default</Badge>
                        ) : (
                          <Badge variant="secondary">-</Badge>
                        )}
                      </td>
                      <td>
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(relationship)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteRelationship(relationship)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </div>
        <div className="border-t p-2 sticky bottom-0 bg-background z-10">
          <div className="flex justify-between items-center">
            <Button size="sm" variant="outline" disabled={relationshipsPage === 1} onClick={() => setRelationshipsPage(p => Math.max(1, p - 1))}>Prev</Button>
            <span className="text-xs">Page {relationshipsPage} / {Math.ceil(relationshipsTotal / relationshipsPageSize) || 1}</span>
            <Button size="sm" variant="outline" disabled={relationshipsPage * relationshipsPageSize >= relationshipsTotal} onClick={() => setRelationshipsPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      </div>

      {/* Edit Relationship Dialog */}
      {selectedCollection && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Relationship</DialogTitle>
              <DialogDescription>Edit the relationship details and children, then click Update.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Relationship Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter relationship name"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="isDefault">Set as default</Label>
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter relationship description"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Children (related collections)</Label>
                {formData.children.map((child, idx) => {
                  const fieldSearch = fieldSearches[idx] || "";
                  const filteredFields = (childFieldsMap[child.collection_id] || []).filter(f => f.toLowerCase().includes(fieldSearch.toLowerCase()));
                  return (
                    <div key={idx} className="flex space-x-2 mb-2 items-center">
                      {/* Child Collection Dropdown with search and load more */}
                      <div className="w-1/3">
                        <Select
                          value={child.collection_id}
                          onValueChange={val => {
                            const children = [...formData.children];
                            children[idx].collection_id = val;
                            children[idx].field = "";
                            setFormData({ ...formData, children });
                            fetchChildFields(val);
                          }}
                        >
                          <SelectTrigger>
                            {child.collection_id ? getCollectionLabel(child.collection_id) : <SelectValue placeholder="Select child collection" />}
                          </SelectTrigger>
                          <SelectContent>
                            <Command>
                              <CommandInput
                                placeholder="Search collections..."
                                value={childCollectionSearch}
                                onValueChange={val => {
                                  setChildCollectionSearch(val);
                                  setChildCollectionPage(1);
                                }}
                              />
                              <CommandEmpty>No collections found.</CommandEmpty>
                              <CommandGroup>
                                {childCollectionOptions.map(c => (
                                  <CommandItem key={c.uid} value={c.uid} onSelect={() => {
                                    const children = [...formData.children];
                                    children[idx].collection_id = c.uid;
                                    children[idx].field = "";
                                    setFormData({ ...formData, children });
                                    fetchChildFields(c.uid);
                                  }}>
                                    {c.data.name}
                                  </CommandItem>
                                ))}
                                {childCollectionOptions.length < childCollectionTotal && (
                                  <CommandItem disabled={childCollectionLoading} onSelect={() => setChildCollectionPage(p => p + 1)}>
                                    {childCollectionLoading ? "Loading..." : "Load more..."}
                                  </CommandItem>
                                )}
                              </CommandGroup>
                            </Command>
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Parent Field Dropdown with search */}
                      <div className="w-1/3">
                        <Select
                          value={child.field}
                          onValueChange={val => {
                            const children = [...formData.children];
                            children[idx].field = val;
                            setFormData({ ...formData, children });
                          }}
                        >
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-between"
                              disabled={!child.collection_id || childLoadingMap[child.collection_id]}
                            >
                              {child.field ? child.field : <SelectValue placeholder={childLoadingMap[child.collection_id] ? "Loading..." : "Select parent field"} />}
                            </Button>
                          </DropdownMenuTrigger>
                          <SelectContent>
                            <Command>
                              <CommandInput
                                placeholder="Search fields..."
                                value={fieldSearch}
                                onValueChange={val => {
                                  const newSearches = [...fieldSearches];
                                  newSearches[idx] = val;
                                  setFieldSearches(newSearches);
                                }}
                              />
                              <CommandEmpty>No fields found.</CommandEmpty>
                              <CommandGroup>
                                {filteredFields.map(field => (
                                  <CommandItem key={field} value={field} onSelect={() => {
                                    const children = [...formData.children];
                                    children[idx].field = field;
                                    setFormData({ ...formData, children });
                                  }}>
                                    {field}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Remove Button */}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          const children = formData.children.filter((_, i) => i !== idx);
                          setFormData({ ...formData, children });
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({ ...formData, children: [...formData.children, { collection_id: '', field: '' }] })}
                >
                  Add Child
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditRelationship}>Update Relationship</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
} 