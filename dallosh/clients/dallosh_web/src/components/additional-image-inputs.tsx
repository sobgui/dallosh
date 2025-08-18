'use client';

import { useFormContext, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ImageInput } from '@/components/ui/image-input';
import { Ref } from '@/services/client';
import { useState, useEffect } from 'react';
import { getSodularClient } from '@/services/client';

export function AdditionalImageInputs({ index, remove, storages, previewComponent: PreviewComponent, cleanAndEncodeUrl }: { index: number, remove: (index: number) => void, storages: Ref[], previewComponent?: any, cleanAndEncodeUrl?: (url: string) => string }) {
    const { control, watch, setValue, formState: { errors } } = useFormContext();
    const imageInputMethod = watch(`images.${index}.imageInputMethod`);
    const selectedStorageId = watch(`images.${index}.storageId`);
    const [buckets, setBuckets] = useState<Ref[]>([]);

     useEffect(() => {
        const fetchBuckets = async () => {
            if (!selectedStorageId) {
                setBuckets([]);
                setValue(`images.${index}.bucketId`, undefined);
                return;
            };
            const client = await getSodularClient();
            if (!client) return;
            const bucketsRes = await client.buckets.query({ filter: { 'data.storage_id': selectedStorageId } });
            if (bucketsRes.data?.list) {
                setBuckets(bucketsRes.data.list);
            } else {
                setBuckets([]);
            }
            setValue(`images.${index}.bucketId`, undefined);
        }
        fetchBuckets();
    }, [selectedStorageId, index, setValue]);

    const fieldErrors = (errors as any)?.images?.[index];

    return (
        <div className="relative rounded-lg border p-4 space-y-4">
            <div className="flex justify-between items-center">
            <Label>Image {index + 1}</Label>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => remove(index)}
            >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Remove Image</span>
            </Button>
            </div>

            <RadioGroup
                onValueChange={(value) => setValue(`images.${index}.imageInputMethod`, value)}
                defaultValue={imageInputMethod}
                className="flex gap-4"
            >
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="url" id={`r_url_${index}`} />
                    <Label htmlFor={`r_url_${index}`}>URL</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="upload" id={`r_upload_${index}`} />
                    <Label htmlFor={`r_upload_${index}`}>Upload</Label>
                </div>
            </RadioGroup>

            <Controller
                name={`images.${index}.imageUrl`}
                control={control}
                render={({ field }) => (
                    <>
                        {imageInputMethod === 'upload' && (
                            <div className="grid gap-4 rounded-md border p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Storage</Label>
                                        <Select onValueChange={(value) => setValue(`images.${index}.storageId`, value)}>
                                            <SelectTrigger><SelectValue placeholder="Select storage" /></SelectTrigger>
                                            <SelectContent>{storages.map(s => <SelectItem key={s.uid} value={s.uid}>{s.data.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                        {fieldErrors?.storageId && <p className="text-sm text-destructive">{fieldErrors.storageId.message}</p>}
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Bucket</Label>
                                        <Select onValueChange={(value) => setValue(`images.${index}.bucketId`, value)} disabled={!selectedStorageId}>
                                            <SelectTrigger><SelectValue placeholder="Select bucket" /></SelectTrigger>
                                            <SelectContent>{buckets.map(b => <SelectItem key={b.uid} value={b.uid}>{b.data.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                        {fieldErrors?.bucketId && <p className="text-sm text-destructive">{fieldErrors.bucketId.message}</p>}
                                    </div>
                                </div>
                            </div>
                        )}
                         <ImageInput
                            value={field.value}
                            onChange={field.onChange}
                            isUrlMode={imageInputMethod === 'url'}
                        />
                        {PreviewComponent && typeof field.value === 'string' && field.value && cleanAndEncodeUrl && (
                            <div className="mt-2 w-full h-48">
                                <PreviewComponent src={cleanAndEncodeUrl(field.value)} alt={`Image ${index + 1} preview`} className="object-contain w-full h-full rounded border" />
                            </div>
                        )}
                    </>
                )}
            />
            {fieldErrors?.imageUrl && <p className="text-sm text-destructive">{fieldErrors.imageUrl.message}</p>}
        </div>
    )
}
