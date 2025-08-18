"use client";

import { useState, useEffect, useCallback } from 'react';
import { getSodularClient } from '@/services';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Schema, Table } from '@/lib/sodular/types/schema';

type FormGeneratorProps = {
    collectionName: string;
    method: 'post' | 'patch';
    documentId?: string;
    onSuccess: () => void;
};

const METADATA_FIELDS = ['uid', 'isActive', 'isDeleted', 'isLocked', 'createdAt', 'updatedAt'];

const getProperty = (obj: any, path: string) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

const setProperty = (obj: any, path: string, value: any) => {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        current = current[key] = current[key] || {};
    }
    current[keys[keys.length - 1]] = value;
    return obj;
};

const renderField = (
    path: string, 
    schemaNode: any, 
    formData: any, 
    handleInputChange: (path: string, value: any) => void,
    method: 'post' | 'patch',
    allowedPaths: string[],
    isMetadata: boolean = false,
    readOnly: boolean = false
) => {
    const isVisible = allowedPaths.some(p => p.startsWith(path)) || isMetadata;
    if (!isVisible) return null;
    
    const fieldId = path.replace(/\./g, '-');
    const label = path.split('.').pop() || '';
    const value = getProperty(formData, path);

    if (method === 'post' && path === 'uid') return null;

    if (isMetadata) {
        if (schemaNode.type === 'boolean') {
            return (
                <div key={fieldId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                        <Label htmlFor={fieldId} className="font-medium capitalize">{label}</Label>
                        {schemaNode.description && <p className="text-sm text-muted-foreground">{schemaNode.description}</p>}
                    </div>
                    <Switch
                        id={fieldId}
                        checked={!!value}
                        onCheckedChange={checked => handleInputChange(path, checked)}
                        disabled={method === 'post'}
                        required={method !== 'patch' && schemaNode.required}
                    />
                </div>
            );
        } else {
            return (
                <div key={fieldId} className="space-y-2">
                    <Label htmlFor={fieldId} className="capitalize">{label}</Label>
                    <Input
                        id={fieldId}
                        type={schemaNode.type === 'number' ? 'number' : 'text'}
                        value={value ?? ''}
                        onChange={e => handleInputChange(path, e.target.value)}
                        required={method !== 'patch' && schemaNode.required}
                        readOnly={true}
                    />
                </div>
            );
        }
    }

    switch (schemaNode.type) {
        case 'string':
        case 'number':
            return (
                <div key={fieldId} className="space-y-2">
                    <Label htmlFor={fieldId} className="capitalize">{label}</Label>
                    <Input
                        id={fieldId}
                        type={schemaNode.type === 'number' ? 'number' : 'text'}
                        value={value ?? ''}
                        onChange={e => handleInputChange(path, e.target.value)}
                        required={method !== 'patch' && schemaNode.required}
                        disabled={readOnly}
                    />
                </div>
            );
        case 'boolean':
            return (
                <div key={fieldId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                        <Label htmlFor={fieldId} className="font-medium capitalize">{label}</Label>
                        {schemaNode.description && <p className="text-sm text-muted-foreground">{schemaNode.description}</p>}
                    </div>
                    <Switch
                        id={fieldId}
                        checked={!!value}
                        onCheckedChange={checked => handleInputChange(path, checked)}
                        disabled={readOnly}
                        required={method !== 'patch' && schemaNode.required}
                    />
                </div>
            );
        case 'object':
            return (
                 <div key={fieldId} className="space-y-4 p-4 border rounded-lg">
                    <h4 className="font-medium capitalize">{label}</h4>
                    {Object.keys(schemaNode.properties).map(key => {
                        const newPath = `${path}.${key}`;
                        const isMeta = path === '' && METADATA_FIELDS.includes(key);
                        const isUid = newPath === 'uid';
                        return renderField(
                            newPath,
                            schemaNode.properties[key],
                            formData,
                            handleInputChange,
                            method,
                            allowedPaths,
                            isMeta || isUid,
                            (method === 'patch' && (isUid || isMeta && key !== 'uid')) ? (isUid ? true : false) : false
                        );
                    })}
                </div>
            );
        default:
            return null;
    }
};

const transformSchemaToState = (schema: any, methodFields: string[]) => {
    const initialState: Record<string, any> = {};
    const traverseSchema = (currentSchema: any, pathPrefix = '', stateNode = initialState) => {
        methodFields.forEach(fieldPath => {
            if (fieldPath.startsWith(pathPrefix)) {
                const relativePath = pathPrefix ? fieldPath.substring(pathPrefix.length + 1) : fieldPath;
                const keys = relativePath.split('.');
                let currentProps = currentSchema.properties;
                let currentState = stateNode;
                for (let i = 0; i < keys.length; i++) {
                    const key = keys[i];
                    if (!currentProps || !currentProps[key]) return;
                    const isLast = i === keys.length - 1;
                    if (isLast) {
                        currentState[key] = currentProps[key].default ?? '';
                    } else {
                        currentState[key] = currentState[key] || {};
                        currentState = currentState[key];
                        currentProps = currentProps[key].properties;
                    }
                }
            }
        });
    };
    traverseSchema(schema.schema);
    return initialState;
};


export const FormGenerator = ({ collectionName, method, documentId, onSuccess }: FormGeneratorProps) => {
    const [schema, setSchema] = useState<Schema | null>(null);
    const [collection, setCollection] = useState<Table | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [changedFields, setChangedFields] = useState<Set<string>>(new Set());

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const client = getSodularClient();
            const collectionRes = await client.tables.get({ filter: { 'data.name': collectionName } });
            if (collectionRes.error || !collectionRes.data) throw new Error(`Collection '${collectionName}' not found.`);
            const targetCollection = collectionRes.data;
            setCollection(targetCollection);

            const schemasTableRes = await client.tables.get({ filter: { 'data.name': 'schema' } });
            if (schemasTableRes.error || !schemasTableRes.data) throw new Error("Could not find the 'schema' collection.");
            
            const schemaRes = await client.ref.from(schemasTableRes.data.uid).get({
                filter: { 'data.collection_id': targetCollection.uid, 'data.isDefault': true }
            });

            if (schemaRes.error || !schemaRes.data) throw new Error(`Default schema for '${collectionName}' not found.`);
            const targetSchema = schemaRes.data as Schema;
            setSchema(targetSchema);
            
            if (method === 'patch' && documentId) {
                let docRes: any = {};
                if (collectionName === 'users') docRes = await client.auth.get({ filter: { uid: documentId } });
                else docRes = await client.ref.from(targetCollection.uid).get({ filter: { uid: documentId } });
                if (docRes.error || !docRes.data) throw new Error(`Document with ID '${documentId}' not found.`);
                setFormData(docRes.data);
            } else {
                const methodFields = targetSchema.data.methods?.[method]?.input || [];
                const initialData = transformSchemaToState(targetSchema.data, methodFields);
                setFormData({ ...initialData });
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    }, [collectionName, method, documentId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleInputChange = (path: string, value: any) => {
        setFormData(prev => {
            const newState = JSON.parse(JSON.stringify(prev));
            setProperty(newState, path, value);
            return newState;
        });
        setChangedFields(prev => {
            const updated = new Set(prev);
            updated.add(path);
            return updated;
        });
    };

    // Helper to build a partial payload for PATCH
    function buildPatchPayload(obj: any, changed: Set<string>, prefix = ''): any {
        let result: any = {};
        for (const path of changed) {
            if (!path) continue;
            const keys = path.split('.');
            let current = result;
            let currentObj = obj;
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                if (i === keys.length - 1) {
                    current[key] = getProperty(obj, path);
                } else {
                    current[key] = current[key] || {};
                    current = current[key];
                    currentObj = currentObj[key];
                }
            }
        }
        return result;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!collection) return;
        setIsSubmitting(true);
        try {
            const client = getSodularClient();
            let response;

            if (method === 'post') {
                if(collectionName === 'users') response = await client.auth.create({ data: formData.data as any });
                else response = await client.ref.from(collection.uid).create({ data: formData });
            } else if (method === 'patch' && documentId) {
                const payload = buildPatchPayload(formData, changedFields);
                delete payload.uid;
                delete payload.createdAt;
                delete payload.createdBy;
                delete payload.updatedAt;
                delete payload.updatedBy;
                console.log('payload: ', payload)
                if(collectionName === 'users') response = await client.auth.patch({ uid: documentId }, { ...payload });
                else response = await client.ref.from(collection.uid).patch({ uid: documentId }, { ...payload });
            }

            if (response?.error) {
                throw new Error(response.error);
            }
            toast.success(`Document successfully ${method === 'post' ? 'created' : 'updated'}.`);
            onSuccess();

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const renderFormFields = () => {
        if (!schema) return null;
        const methodFields = schema.data.methods?.[method]?.input || [];
        const rootProps = schema.data.schema.properties;
        if (method === 'patch') {
            const fields = [
                ...METADATA_FIELDS.filter(f => rootProps[f]).map(f =>
                    renderField(f, rootProps[f], formData, handleInputChange, method, methodFields, true, f === 'uid')
                ),
                ...Object.keys(rootProps)
                    .filter(key => key !== 'data' && !METADATA_FIELDS.includes(key))
                    .map(key => renderField(key, rootProps[key], formData, handleInputChange, method, methodFields)),
                renderField('data', rootProps['data'], formData, handleInputChange, method, methodFields)
            ];
            return fields;
        } else {
            return [renderField('data', rootProps['data'], formData, handleInputChange, method, methodFields)];
        }
    };

    if (loading) return <div>Loading form...</div>;
    if (!schema) return <div>Schema not found. Cannot generate form.</div>;

    return (
        <form onSubmit={handleSubmit}>
            <Card>
                <CardHeader>
                    <CardTitle>{method === 'post' ? 'Create' : 'Update'} {collection?.data.name}</CardTitle>
                    <CardDescription>Fill out the form below.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {renderFormFields()}
                </CardContent>
            </Card>
            <div className="flex justify-end mt-4">
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
            </div>
        </form>
    );
}; 