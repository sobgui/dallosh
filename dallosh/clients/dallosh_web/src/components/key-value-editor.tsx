
'use client';

import { useFieldArray, useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface KeyValueEditorProps {
  name: string;
}

export function KeyValueEditor({ name }: KeyValueEditorProps) {
  const { control, register, formState: { errors } } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Fields</CardTitle>
        <CardDescription>Add extra key-value data for this item.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((field, index) => {
            const fieldErrors = (errors as any)[name]?.[index];
            return (
                <div key={field.id} className="flex items-end gap-2">
                    <div className="grid gap-1.5 flex-1">
                      <Label htmlFor={`${name}.${index}.key`}>Key</Label>
                      <Input
                        id={`${name}.${index}.key`}
                        placeholder="e.g., Material"
                        {...register(`${name}.${index}.key` as const)}
                      />
                      {fieldErrors?.key && <p className="text-sm text-destructive">{fieldErrors.key.message}</p>}
                    </div>
                    <div className="grid gap-1.5 flex-1">
                      <Label htmlFor={`${name}.${index}.value`}>Value</Label>
                      <Input
                        id={`${name}.${index}.value`}
                        placeholder="e.g., Stainless Steel"
                        {...register(`${name}.${index}.value` as const)}
                      />
                      {fieldErrors?.value && <p className="text-sm text-destructive">{fieldErrors.value.message}</p>}
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remove field</span>
                    </Button>
                </div>
            )
        })}
        <Button
          type="button"
          variant="outline"
          onClick={() => append({ key: '', value: '' })}
          className="w-full"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Custom Field
        </Button>
      </CardContent>
    </Card>
  );
}
