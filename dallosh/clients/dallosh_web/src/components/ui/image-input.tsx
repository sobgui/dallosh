
'use client';

import { UploadCloud, Image as ImageIcon, X } from 'lucide-react';
import NextImage from 'next/image';
import { useEffect, useState, forwardRef } from 'react';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { Input } from './input';

interface ImageInputProps {
  value?: FileList | string | null;
  onChange?: (value: FileList | string | null) => void;
  className?: string;
  isUrlMode: boolean;
  showPreview?: boolean;
}

export const ImageInput = forwardRef<HTMLDivElement, ImageInputProps>(
    ({ value, onChange, className, isUrlMode, showPreview = true }, ref) => {
        const [preview, setPreview] = useState<string | null>(null);

        useEffect(() => {
            if (isUrlMode) {
                if (typeof value === 'string' && value) {
                    setPreview(value);
                } else {
                    setPreview(null);
                }
            } else {
                if (value instanceof FileList && value.length > 0) {
                    const file = value[0];
                    const objectUrl = URL.createObjectURL(file);
                    setPreview(objectUrl);
                    return () => URL.revokeObjectURL(objectUrl);
                } else {
                     if (typeof value === 'string' && value) {
                        setPreview(value)
                    } else {
                        setPreview(null);
                    }
                }
            }
        }, [value, isUrlMode]);

        const handleRemove = () => {
            setPreview(null);
            if(onChange) {
                onChange(null);
            }
        };

        const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            if (onChange) {
                const url = e.target.value;
                onChange(url);
                setPreview(url);
            }
        };
        
        const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
             if (onChange && e.target.files) {
                onChange(e.target.files);
            }
        };

        if (isUrlMode) {
             return (
                 <div ref={ref} className={cn("space-y-4", className)}>
                    <Input 
                        placeholder="https://example.com/image.png" 
                        value={typeof value === 'string' ? value : ''}
                        onChange={handleUrlChange}
                    />
                     {preview && showPreview && (
                        <div className="relative mt-2 w-full h-48 rounded-md border bg-muted/20">
                            <NextImage src={preview} alt="URL preview" layout="fill" className="object-contain rounded-md p-2" onError={() => setPreview(null)} />
                             <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-md" onClick={handleRemove}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                 </div>
             )
        }

        return (
            <div ref={ref} className={cn("space-y-4", className)}>
                {preview && showPreview ? (
                    <div className="relative w-full h-48 rounded-md border bg-muted/20">
                        <NextImage src={preview} alt="File preview" layout="fill" className="object-contain rounded-md p-2" />
                        <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-md" onClick={handleRemove}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ) : (
                    <label className="relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/50 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                            <UploadCloud className="w-8 h-8 mb-4 text-muted-foreground" />
                            <p className="mb-2 text-sm text-muted-foreground">
                                <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-muted-foreground">PNG, JPG, GIF</p>
                        </div>
                        <Input
                            type="file"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </label>
                )}
            </div>
        );
    }
);
ImageInput.displayName = 'ImageInput';
