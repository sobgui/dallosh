"use client";

import React, { ReactElement } from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Plus, Edit, Trash2, FileText, Search, Eye, EyeOff, ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { getSodularClient } from "@/services";
import { toast } from "sonner";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import dynamic from 'next/dynamic';
import { MultiSelect } from '@/components/ui/multiselect';
import { v4 as uuidv4 } from 'uuid';
import { cn } from "@/lib/utils";
import { Schema } from "@/lib/sodular/types/schema";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const AceEditor = dynamic(() => import('@/components/ui/AceEditorWrapper'), { ssr: false });

interface Collection {
  uid: string;
  data: {
    name: string;
    description?: string;
  };
  createdAt: number;
}

interface SchemaManagementProps {
  schemaCollectionId?: string;
}

const FIELD_TYPES = [
  { value: 'string', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'file', label: 'File' },
  { value: 'object', label: 'Object' },
  { value: 'array', label: 'Array' },
];

function newField(name = '', type = '') {
  return {
    id: uuidv4(),
    key: name || '',
    type: type || '',
    required: false,
    default: '',
    children: type === 'object' || type === 'array' ? [] : undefined,
  };
}

function flattenKeys(fields: any[], parentKey = ''): string[] {
  const keys = fields.reduce((acc: string[], field) => {
    const currentKey = parentKey ? `${parentKey}.${field.key}` : field.key;
    if (field.type === 'object' && field.children) {
      return [...acc, currentKey, ...flattenKeys(field.children, currentKey)];
    } else if (field.type === 'array' && field.children) {
      return [...acc, currentKey, ...flattenKeys(field.children, `${currentKey}[]`)];
    }
    return [...acc, currentKey];
  }, []);

  if (!parentKey) {
    return [...keys, 'createdAt', 'updatedAt', 'uid'];
  }
  return keys;
}

function schemaToBuilder(properties: any): any[] {
  return Object.entries(properties || {}).map(([key, value]: [string, any]) => {
    if (value.type === 'object') {
      return {
        ...newField(key, 'object'),
        required: value.required,
        default: value.default ?? '',
        children: schemaToBuilder(value.properties),
      };
    } else if (value.type === 'array') {
      return {
        ...newField(key, 'array'),
        required: value.required,
        default: value.default ?? '',
        children: value.items ? schemaToBuilder(value.items) : [],
      };
    } else {
      return {
        ...newField(key, value.type),
        required: value.required,
        default: value.default ?? '',
      };
    }
  });
}

function builderToSchema(fields: any[]): any {
  const properties: any = {};
  fields.forEach((field: any) => {
    if (field.type === 'object') {
      properties[field.key] = {
        type: 'object',
        properties: builderToSchema(field.children || []),
        required: field.required,
        default: field.default,
      };
    } else if (field.type === 'array') {
      properties[field.key] = {
        type: 'array',
        items: field.children && field.children.length > 0 ? builderToSchema(field.children) : {},
        required: field.required,
        default: field.default,
      };
    } else {
      properties[field.key] = {
        type: field.type,
        required: field.required,
        default: field.default,
      };
    }
  });
  return properties;
}

// System fields to be made read-only at root
const systemFields = ['uid', 'isActive', 'isDeleted', 'isLocked', 'createdAt', 'updatedAt'];

interface FieldCardProps {
  field: {
    id: string;
    key: string;
    type: string;
    required: boolean;
    default?: any;
    children?: Field[];
  };
  index: number;
  parentType: 'object' | 'array';
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: (id: string, prop: keyof Field, value: any) => void;
  onDelete: () => void;
  onAddChild: () => void;
  path: string[];
  readOnly?: boolean;
  fixedTypeObject?: boolean;
}

// Helper to get field path
function getFieldPath(fields: Field[], id: string, path: string[] = []): string[] | null {
  for (const field of fields) {
    if (field.id === id) return [...path, field.key];
    if (field.children) {
      const childPath = getFieldPath(field.children, id, [...path, field.key]);
      if (childPath) return childPath;
    }
  }
  return null;
}

function FieldCard({ field, index, parentType, expanded, onToggleExpand, onEdit, onDelete, onAddChild, path, readOnly, fixedTypeObject }: FieldCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: field.id });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };

  // Icon for type
  const typeIcon = field.type === 'object' ? <span title="Object">📁</span> : field.type === 'array' ? <span title="Array">📑</span> : null;

  // Tooltip for path
  const pathString = path.join('.');

  const isExpandable = field.type === 'object' || field.type === 'array';

  return (
    <div ref={setNodeRef} style={style} className={readOnly ? "mb-2 opacity-70 bg-muted/30 rounded" : "mb-2"}>
      <Card className="mt-2 ">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Expand/Collapse button always on the left for object/array */}
            {isExpandable && (
              <Button
                variant="default"
                size="icon"
                onClick={onToggleExpand}
                title={expanded ? 'Collapse' : 'Expand'}
                style={{ background: expanded ? 'var(--primary)' : undefined, color: expanded ? 'var(--primary-foreground)' : undefined }}
                className="mr-2"
                disabled={readOnly}
              >
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            )}
            <div className="flex-1 grid grid-cols-12 gap-4 items-center">
              <div className="col-span-4 flex items-center gap-2">
                <Label>Field Name</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Input
                      value={field.key || ''}
                      onChange={e => onEdit(field.id, 'key', e.target.value)}
                      className="mt-1"
                      placeholder="Enter field name"
                      readOnly={readOnly}
                    />
                  </TooltipTrigger>
                  <TooltipContent>{pathString}</TooltipContent>
                </Tooltip>
                {typeIcon}
              </div>
              <div className="col-span-3">
                <Label>Type</Label>
                <select
                  value={fixedTypeObject ? 'object' : (field.type || '')}
                  onChange={e => {
                    if (fixedTypeObject) return;
                    const newType = e.target.value;
                    if ((field.type === 'object' || field.type === 'array') && !(newType === 'object' || newType === 'array') && field.children && field.children.length > 0) {
                      if (!window.confirm('Changing type will remove all nested fields. Continue?')) return;
                    }
                    onEdit(field.id, 'type', newType);
                    if (newType === 'object' || newType === 'array') {
                      onToggleExpand();
                    }
                  }}
                  className="mt-1 w-full rounded border px-2 py-1 bg-black text-white border-gray-700 focus:border-primary focus:ring-1 focus:ring-primary"
                  style={{ appearance: 'none' }}
                  required
                  disabled={readOnly || fixedTypeObject}
                >
                  <option value="" className="bg-black text-white">Select type</option>
                  {FIELD_TYPES.map(type => (
                    <option key={type.value} value={type.value} className="bg-black text-white">{type.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-3">
                <Label>Default Value</Label>
                <Input
                  value={field.default || ''}
                  onChange={e => onEdit(field.id, 'default', e.target.value || '')}
                  className="mt-1"
                  placeholder="Default value"
                  readOnly={readOnly}
                />
              </div>
              <div className="col-span-2 flex items-end gap-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id={`required-${field.id}`}
                    checked={!!field.required}
                    onCheckedChange={checked => onEdit(field.id, 'required', checked)}
                    disabled={readOnly}
                  />
                  <Label htmlFor={`required-${field.id}`}>Required</Label>
                </div>
                {!readOnly && <Button variant="ghost" size="icon" onClick={onDelete} title="Delete"><Trash2 className="h-4 w-4" /></Button>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const collectionsPageSize = 10;

interface Methods {
  post: { input: string[] };
  put: { input: string[] };
  patch: { input: string[] };
  get: { response: { allow: string[]; except: string[] } };
}

const defaultMethods: Methods = {
    post: { input: [] as string[] },
    put: { input: [] as string[] },
    patch: { input: [] as string[] },
  get: { response: { allow: [] as string[], except: [] as string[] } },
};

interface MultiSelectOption {
  label: string;
  value: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (values: string[]) => void;
  className?: string;
}

interface Field {
  id: string;
  key: string;
  type: string;
  required: boolean;
  default: any;
  children?: Field[];
}

const CREATE_STEPS = [
  'Name & Description',
  'Schema Definition',
  'Methods',
  'Review & Confirm',
] as const;

function updateFieldById(fields: Field[], id: string, prop: keyof Field, value: any): Field[] {
  return fields.map(field => {
    if (field.id === id) {
      const updated = { ...field, [prop]: value };
      if (prop === 'type' && (value === 'object' || value === 'array')) {
        updated.children = updated.children || [];
      } else if (prop === 'type') {
        delete updated.children;
      }
      return updated;
    }
    if (field.children) {
      return { ...field, children: updateFieldById(field.children, id, prop, value) };
    }
    return field;
  });
}

const getInitialFields = (): Field[] => [
  { ...newField('uid', 'string'), required: true },
  { ...newField('data', 'object'), required: true },
  { ...newField('isActive', 'boolean'), required: false },
  { ...newField('isDeleted', 'boolean'), required: false },
  { ...newField('isLocked', 'boolean'), required: false },
];

export function SchemaManagement({ schemaCollectionId }: SchemaManagementProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState({ collections: true, schemas: true });
  const [collectionsSearchInput, setCollectionsSearchInput] = useState('');
  const [collectionsPage, setCollectionsPage] = useState(1);
  const [collectionsTotal, setCollectionsTotal] = useState(0);
  const collectionsSearchDebounce = useRef<NodeJS.Timeout | null>(null);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSchema, setEditingSchema] = useState<Schema | null>(null);
  const [createStep, setCreateStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isDefault: false,
    schema: '{}',
    collection_id: '',
    methods: { ...defaultMethods }
  });

  const [builderMode, setBuilderMode] = useState(true);
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});
  const [fields, setFields] = useState<Field[]>(getInitialFields());
  const [jsonValue, setJsonValue] = useState('');
  const [methods, setMethods] = useState<Methods>(defaultMethods);

  const [schemasSearchTerm, setSchemasSearchTerm] = useState("");
  const [schemasPage, setSchemasPage] = useState(1);
  const [schemasTotal, setSchemasTotal] = useState(0);
  const schemasPageSize = 10;

  const toggleFieldExpansion = useCallback((fieldId: string) => {
    setExpandedFields((prev) => ({
      ...prev,
      [fieldId]: !prev[fieldId]
    }));
  }, []);

  const handleFieldUpdate = useCallback((id: string, prop: keyof Field, value: any) => {
    setFields(currentFields => updateFieldById(currentFields, id, prop, value));
  }, []);

  function renderFields(fields: any[], parentType: 'object' | 'array' = 'object', parentIndex = '', parentPath: string[] = [], onAddChildToParent?: (() => void)) {
    if (!fields.length) {
      // If onAddChildToParent is provided, use it for nested; else, add root field
      return <div className="p-4 text-center text-muted-foreground">No fields yet. <Button onClick={onAddChildToParent ? onAddChildToParent : () => setFields([...fields, newField()])} className="ml-2">Add Field</Button></div>;
    }
    return (
      <SortableContext items={fields.map((f: any) => f.id)} strategy={verticalListSortingStrategy}>
        {fields.map((field: any, idx: number) => {
          const isExpandable = field.type === 'object' || field.type === 'array';
          const expanded = expandedFields[field.id] ?? false;
          const fieldPath = [...parentPath, field.key];
          return (
            <div key={field.id}>
              <FieldCard
                field={field}
                index={idx}
                parentType={parentType}
                expanded={expanded}
                onToggleExpand={() => toggleFieldExpansion(field.id)}
                onEdit={handleFieldUpdate}
                onDelete={() => setFields(currentFields => deleteFieldById(currentFields, field.id))}
                onAddChild={() => setFields(currentFields => addChildFieldById(currentFields, field.id))}
                path={fieldPath}
                readOnly={false}
                fixedTypeObject={false}
              />
              {isExpandable && expanded && field.children && (
                <div className="ml-8 border-l-2 border-muted pl-4 bg-muted/10 rounded">
                  {renderFields(field.children, field.type as 'object' | 'array', '', fieldPath, () => setFields(currentFields => addChildFieldById(currentFields, field.id)))}
                  <Button
                    onClick={() => setFields(currentFields => addChildFieldById(currentFields, field.id))}
                    className="mt-2"
                    size="icon"
                    variant="default"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </SortableContext>
    );
  }

  const isStepValid = useCallback((step: number): boolean => {
    switch (step) {
      case 0:
        return !!formData.name;
      case 1:
        try {
          JSON.parse(jsonValue);
          return true;
        } catch {
          return false;
        }
      default:
        return true;
    }
  }, [formData.name, jsonValue]);

  const getHighestAllowedStep = useCallback((): number => {
    for (let i = 0; i < CREATE_STEPS.length; i++) {
      if (!isStepValid(i)) {
        return i;
      }
    }
    return CREATE_STEPS.length;
  }, [isStepValid]);

  const systemFields = ['uid', 'isDeleted', 'isActive', 'isLocked', 'createdAt', 'updatedAt'];
  const availableKeys = Array.from(new Set([...systemFields, ...flattenKeys(fields)]));

  useEffect(() => {
    if (builderMode) {
      const schema = { type: 'object', properties: builderToSchema(fields) };
      setJsonValue(JSON.stringify(schema, null, 2));
    }
  }, [fields, builderMode]);

  useEffect(() => {
    if (!builderMode) {
      // Switching to JSON mode: always show the latest builder state as JSON
      const schema = { type: 'object', properties: builderToSchema(fields) };
      setJsonValue(JSON.stringify(schema, null, 2));
    } else {
      // Switching to builder mode: try to parse JSON and update builder if valid
      try {
        const parsed = JSON.parse(jsonValue);
        if (parsed && parsed.properties) {
          setFields(schemaToBuilder(parsed.properties));
        }
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builderMode]);

  const fetchCollections = useCallback(async () => {
    setLoading(prev => ({ ...prev, collections: true }));
    try {
      const client = getSodularClient();
      const filter = collectionsSearchInput ? { 'data.name': { $regex: collectionsSearchInput, $options: 'i' } } : {};
      const response = await client.tables.query({ filter, take: collectionsPageSize, skip: (collectionsPage - 1) * collectionsPageSize, sort: { 'data.name': 1 } });
      if (response.data) {
        setCollections(response.data.list);
        setCollectionsTotal(response.data.total);
        if (response.data.list.length > 0 && !selectedCollection) {
          setSelectedCollection(response.data.list[0]);
        }
      }
    } catch (error) {
      toast.error('Failed to fetch collections');
    } finally {
      setLoading(prev => ({ ...prev, collections: false }));
    }
  }, [collectionsSearchInput, collectionsPage, selectedCollection]);

  const fetchSchemas = useCallback(async () => {
    if (!selectedCollection || !schemaCollectionId) {
      setSchemas([]);
      setLoading(prev => ({ ...prev, schemas: false }));
      return;
    }
    setLoading(prev => ({ ...prev, schemas: true }));
    try {
      const client = getSodularClient();
      const filter = {
        'data.collection_id': selectedCollection.uid,
        ...(schemasSearchTerm && { 'data.name': { $regex: schemasSearchTerm, $options: 'i' } })
      };
      const response = await client.ref.from(schemaCollectionId).query({ 
        filter, 
        sort: { createdAt: -1 },
        take: schemasPageSize,
        skip: (schemasPage - 1) * schemasPageSize
      });
      if (response.data) {
        setSchemas(response.data.list as Schema[]);
        setSchemasTotal(response.data.total);
      }
    } catch (error) {
      toast.error('Failed to fetch schemas');
    } finally {
      setLoading(prev => ({ ...prev, schemas: false }));
    }
  }, [selectedCollection, schemaCollectionId, schemasSearchTerm, schemasPage]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  useEffect(() => {
    fetchSchemas();
  }, [fetchSchemas]);

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

  const handleCreateSchema = async () => {
    if (!schemaCollectionId || !selectedCollection) return;
    try {
      const parsedSchema = JSON.parse(jsonValue);
      const client = getSodularClient();
      if (formData.isDefault) {
        await client.ref.from(schemaCollectionId).patch({ 'data.collection_id': selectedCollection.uid, 'data.isDefault': true }, { data: { isDefault: false } });
      }
      await client.ref.from(schemaCollectionId).create({
        data: { ...formData, collection_id: selectedCollection.uid, schema: parsedSchema, methods: methods }
      });
      toast.success('Schema created successfully');
      setIsCreateDialogOpen(false);
      resetForm();
      fetchSchemas();
    } catch (error) {
      toast.error('Failed to create schema');
    }
  };

  const handleEditSchema = async () => {
    if (!schemaCollectionId || !editingSchema) return;
    try {
      const parsedSchema = JSON.parse(jsonValue);
      const client = getSodularClient();
      if (formData.isDefault && !editingSchema.data.isDefault) {
        await client.ref.from(schemaCollectionId).patch({ 'data.collection_id': editingSchema.data.collection_id, 'data.isDefault': true }, { data: { isDefault: false } });
      }
      await client.ref.from(schemaCollectionId).patch({ uid: editingSchema.uid }, {
        data: { ...formData, collection_id: editingSchema.data.collection_id, schema: parsedSchema, methods: methods }
      });
      toast.success('Schema updated successfully');
      setIsEditDialogOpen(false);
      resetForm();
      fetchSchemas();
    } catch (error) {
      toast.error('Failed to update schema');
    }
  };

  const handleDeleteSchema = async (schema: Schema) => {
    if (!schemaCollectionId) return;
    try {
      const sodularClient = getSodularClient();
      await sodularClient.ref.from(schemaCollectionId).delete({ uid: schema.uid }, { withSoftDelete: true });
      toast.success('Schema deleted successfully');
      fetchSchemas();
    } catch (error) {
      toast.error('Failed to delete schema');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', description: '', isDefault: false, schema: '{}', collection_id: '', methods: { ...defaultMethods }
    });
    setFields(getInitialFields());
    setMethods({ ...defaultMethods });
    setCreateStep(0);
  };

  const openEditDialog = (schema: Schema) => {
    setEditingSchema(schema);
    setFormData({
      name: schema.data.name,
      description: schema.data.description || "",
      isDefault: schema.data.isDefault,
      collection_id: schema.data.collection_id,
      schema: JSON.stringify(schema.data.schema, null, 2),
      methods: { ...defaultMethods, ...schema.data.methods },
    });
    if (schema.data.schema && schema.data.schema.properties) {
      setFields(schemaToBuilder(schema.data.schema.properties));
    } else {
      setFields(getInitialFields());
    }
    setJsonValue(JSON.stringify(schema.data.schema, null, 2));
    setMethods({ ...defaultMethods, ...schema.data.methods });
    setIsEditDialogOpen(true);
    setCreateStep(0);
  };

  const sensors = useSensors(useSensor(PointerSensor));

  // When a new object/array field is created, set its expanded state to true if it has no children
  useEffect(() => {
    function expandEmptyObjects(fields: Field[]) {
      let changed = false;
      const expanded: Record<string, boolean> = { ...expandedFields };
      function walk(flds: Field[]) {
        for (const f of flds) {
          if ((f.type === 'object' || f.type === 'array')) {
            if (!expanded[f.id] && (!f.children || f.children.length === 0)) {
              expanded[f.id] = true;
              changed = true;
            }
            if (f.children) walk(f.children);
          }
        }
      }
      walk(fields);
      if (changed) setExpandedFields(expanded);
    }
    expandEmptyObjects(fields);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields]);

  if (loading.collections) {
    return <div className="p-8 text-center">Loading collections...</div>;
  }

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-18rem)]">
      <div className="col-span-3 flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle>Collections</CardTitle>
            <CardDescription>Select a collection to manage its schemas.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-2">
            <Input placeholder="Search collections..." value={collectionsSearchInput} onChange={e => setCollectionsSearchInput(e.target.value)} className="mb-2"/>
            <div className="space-y-1">
              {collections
                .filter(col => col.data.name !== 'schema' && col.data.name !== 'relationships')
                .map(col => (
                  <Button
                    key={col.uid}
                    variant={selectedCollection?.uid === col.uid ? "default" : "ghost"}
                    className={"w-full justify-start text-left h-auto py-2" + (selectedCollection?.uid === col.uid ? " text-white bg-primary" : "")}
                    onClick={() => setSelectedCollection(col)}
                  >
                    <div>
                      <div>{col.data.name}</div>
                      <div className="text-xs text-muted-foreground">{col.uid}</div>
                    </div>
                  </Button>
                ))}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between items-center p-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setCollectionsPage(p => Math.max(1, p - 1))} disabled={collectionsPage === 1}>Previous</Button>
            <span className="text-sm text-muted-foreground">Page {collectionsPage} of {Math.ceil(collectionsTotal / collectionsPageSize)}</span>
            <Button variant="outline" size="sm" onClick={() => setCollectionsPage(p => p + 1)} disabled={collectionsPage * collectionsPageSize >= collectionsTotal}>Next</Button>
          </CardFooter>
        </Card>
      </div>

      <div className="col-span-9 flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{selectedCollection ? `${selectedCollection.data.name} Schemas` : 'Select a Collection'}</CardTitle>
                <CardDescription>Manage schema definitions for the selected collection.</CardDescription>
              </div>
              {selectedCollection && (
                <Dialog open={isCreateDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) resetForm(); setIsCreateDialogOpen(isOpen); }}>
                  <DialogTrigger asChild>
                    <Button onClick={resetForm}><Plus className="w-4 h-4 mr-2" />Create Schema</Button>
                  </DialogTrigger>
                  <DialogContent style={{ width: '80vw', maxWidth: '1200px', height: '75vh' }} className="flex flex-col">
                    <DialogHeader>
                      <DialogTitle>Create New Schema</DialogTitle>
                      <DialogDescription>Follow the steps to define a new schema for the '{selectedCollection.data.name}' collection.</DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-between my-4">
                      {CREATE_STEPS.map((step, index) => (
                        <div key={step} className="flex flex-col items-center">
                          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", index === createStep ? "bg-primary text-primary-foreground" : "bg-muted", index < getHighestAllowedStep() ? "cursor-pointer" : "cursor-not-allowed opacity-50")} onClick={() => index < getHighestAllowedStep() && setCreateStep(index)}>
                            {index + 1}
                          </div>
                          <p className="text-sm mt-1">{step}</p>
                        </div>
                      ))}
                    </div>
                    <Separator />
                    <div className="flex-1 overflow-y-auto p-1 mt-4">
                      <StepContent
                        step={createStep}
                        formData={formData}
                        setFormData={setFormData}
                        builderMode={builderMode}
                        setBuilderMode={setBuilderMode}
                        jsonValue={jsonValue}
                        setJsonValue={setJsonValue}
                        fields={fields}
                        setFields={setFields}
                        renderFields={renderFields}
                        methods={methods}
                        setMethods={setMethods}
                        availableKeys={availableKeys}
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setCreateStep(s => Math.max(0, s - 1))} disabled={createStep === 0}>Back</Button>
                      {createStep < CREATE_STEPS.length - 1 ? (
                         <Button onClick={() => setCreateStep(s => s + 1)} disabled={!isStepValid(createStep)}>Next</Button>
                      ) : (
                         <Button onClick={handleCreateSchema} disabled={!isStepValid(createStep)}>Finish & Create</Button>
                      )}
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <Input placeholder="Search schemas..." value={schemasSearchTerm} onChange={e => setSchemasSearchTerm(e.target.value)} className="mt-4" disabled={!selectedCollection}/>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {loading.schemas ? (
              <div className="text-center p-8">Loading schemas...</div>
            ) : schemas.length > 0 ? (
              <div className="space-y-2">
                {schemas.map(schema => (
                  <Card key={schema.uid}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            {schema.data.name}
                            {schema.data.isDefault && <Badge variant="secondary">Default</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{schema.data.description || "No description"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => openEditDialog(schema)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="destructive" size="icon" onClick={() => handleDeleteSchema(schema)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center p-8 text-muted-foreground">No schemas found for this collection.</div>
            )}
          </CardContent>
          {selectedCollection && schemasTotal > 0 && (
            <CardFooter className="flex justify-between items-center p-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setSchemasPage(p => Math.max(1, p - 1))} disabled={schemasPage === 1}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {schemasPage} of {Math.ceil(schemasTotal / schemasPageSize)}</span>
              <Button variant="outline" size="sm" onClick={() => setSchemasPage(p => p + 1)} disabled={schemasPage * schemasPageSize >= schemasTotal}>Next</Button>
            </CardFooter>
          )}
        </Card>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) resetForm(); setIsEditDialogOpen(isOpen); }}>
        <DialogContent style={{ width: '80vw', maxWidth: '1200px', height: '75vh' }} className="flex flex-col">
          {editingSchema && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Schema: {editingSchema.data.name}</DialogTitle>
                <DialogDescription>Modify the schema for the '{selectedCollection?.data.name}' collection.</DialogDescription>
              </DialogHeader>
               <div className="flex justify-between my-4">
                  {CREATE_STEPS.map((step, index) => (
                    <div key={step} className="flex flex-col items-center">
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center cursor-pointer", index === createStep ? "bg-primary text-primary-foreground" : "bg-muted")} onClick={() => setCreateStep(index)}>
                        {index + 1}
                      </div>
                      <p className="text-sm mt-1">{step}</p>
                    </div>
                  ))}
                </div>
              <Separator />
              <div className="flex-1 overflow-y-auto p-1 mt-4">
                <StepContent
                  step={createStep}
                  formData={formData}
                  setFormData={setFormData}
                  builderMode={builderMode}
                  setBuilderMode={setBuilderMode}
                  jsonValue={jsonValue}
                  setJsonValue={setJsonValue}
                  fields={fields}
                  setFields={setFields}
                  renderFields={renderFields}
                  methods={methods}
                  setMethods={setMethods}
                  availableKeys={availableKeys}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateStep(s => Math.max(0, s - 1))} disabled={createStep === 0}>Back</Button>
                {createStep < CREATE_STEPS.length - 1 ? (
                   <Button onClick={() => setCreateStep(s => s + 1)} disabled={!isStepValid(createStep)}>Next</Button>
                ) : (
                   <Button onClick={handleEditSchema} disabled={!isStepValid(createStep)}>Finish & Save Changes</Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface StepContentProps {
  step: number;
  formData: any;
  setFormData: (data: any) => void;
  builderMode: boolean;
  setBuilderMode: (mode: boolean) => void;
  jsonValue: string;
  setJsonValue: (value: string) => void;
  fields: Field[];
  setFields: (fields: Field[]) => void;
  renderFields: (fields: Field[], parentType?: 'object' | 'array') => ReactElement;
  methods: Methods;
  setMethods: (methods: Methods) => void;
  availableKeys: string[];
}

function StepContent({
  step,
  formData,
  setFormData,
  builderMode,
  setBuilderMode,
  jsonValue,
  setJsonValue,
  fields,
  setFields,
  renderFields,
  methods,
  setMethods,
  availableKeys
}: StepContentProps) {
  switch (step) {
    case 0:
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="schemaName">Schema Name</Label>
            <Input id="schemaName" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., User Profile"/>
          </div>
          <div>
            <Label htmlFor="schemaDescription">Description</Label>
            <Textarea id="schemaDescription" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="A brief description of this schema's purpose."/>
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="isDefault" checked={formData.isDefault} onCheckedChange={checked => setFormData({ ...formData, isDefault: checked })} />
            <Label htmlFor="isDefault">Set as default schema for this collection</Label>
          </div>
        </div>
      );
    case 1:
      return (
        <div>
          <div className="flex justify-end items-center mb-4">
            <Label htmlFor="builder-mode-switch" className="mr-2">Builder Mode</Label>
            <Switch id="builder-mode-switch" checked={builderMode} onCheckedChange={setBuilderMode} />
          </div>
          {builderMode ? (
            <div>
              {renderFields(fields)}
              <Button onClick={() => setFields([...fields, newField()])} className="mt-4"><Plus className="w-4 h-4 mr-2" />Add Root Field</Button>
            </div>
          ) : (
            <AceEditor
              value={jsonValue || ""}
              onChange={setJsonValue}
              height="40vh"
              width="100%"
              mode="json"
              theme="monokai"
              setOptions={{ useWorker: false }}
            />
          )}
        </div>
      );
    case 2:
      return (
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold mb-2">POST Method (Create)</h4>
            <p className="text-sm text-muted-foreground mb-2">Select fields required/allowed when creating a new document.</p>
            <MultiSelect
              options={availableKeys.map(k => ({ label: k, value: k }))}
              value={methods.post.input}
              onChange={(v) => setMethods({ ...methods, post: { input: v } })}
            />
          </div>
          <div>
            <h4 className="font-semibold mb-2">PATCH Method (Update)</h4>
            <p className="text-sm text-muted-foreground mb-2">Select fields that can be updated.</p>
            <MultiSelect
              options={availableKeys.map(k => ({ label: k, value: k }))}
              value={methods.patch.input}
              onChange={(v) => setMethods({ ...methods, patch: { input: v } })}
            />
          </div>
          <div>
            <h4 className="font-semibold mb-2">GET Method (Read)</h4>
            <p className="text-sm text-muted-foreground mb-2">Select fields to EXCLUDE from the response (e.g., for sensitive data).</p>
            <MultiSelect
              options={availableKeys.map(k => ({ label: k, value: k }))}
              value={methods.get.response.except}
              onChange={(v) => setMethods({ ...methods, get: { ...methods.get, response: { ...methods.get.response, except: v } } })}
            />
          </div>
        </div>
      );
    case 3:
      return (
        <div>
          <h4 className="font-semibold mb-2">Review Schema & Methods</h4>
          <p className="text-sm text-muted-foreground mb-4">This is the final JSON that will be saved. Review it carefully before finishing.</p>
          <AceEditor
            value={JSON.stringify({
              name: formData.name,
              description: formData.description,
              isDefault: formData.isDefault,
              schema: JSON.parse(jsonValue),
              methods: methods,
            }, null, 2)}
            readOnly
            height="50vh"
            width="100%"
            mode="json"
          />
        </div>
      );
    default:
      return null;
  }
}

// Utility: Add a child field to a field by ID (recursive)
function addChildFieldById(fields: Field[], parentId: string): Field[] {
  return fields.map(field => {
    if (field.id === parentId) {
      const children = field.children ? [...field.children, newField()] : [newField()];
      return { ...field, children };
    }
    if (field.children) {
      return { ...field, children: addChildFieldById(field.children, parentId) };
    }
    return field;
  });
}

// Utility: Delete a field by ID (recursive)
function deleteFieldById(fields: Field[], id: string): Field[] {
  return fields
    .filter(field => field.id !== id)
    .map(field =>
      field.children ? { ...field, children: deleteFieldById(field.children, id) } : field
    );
}

