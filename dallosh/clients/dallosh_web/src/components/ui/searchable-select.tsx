
'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useDebounce } from '@/hooks/use-debounce';

export interface SearchableSelectItem {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  value?: string;
  onValueChange: (value: string) => void;
  fetcher: (search: string, page: number) => Promise<{ items: SearchableSelectItem[]; hasMore: boolean }>;
}

export function SearchableSelect({
  placeholder,
  searchPlaceholder,
  emptyMessage,
  value,
  onValueChange,
  fetcher,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<SearchableSelectItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const [page, setPage] = React.useState(0);
  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebounce(search, 300);

  const selectedItemLabel = items.find((item) => item.value === value)?.label || placeholder;

  const loadItems = React.useCallback(async (isNewSearch: boolean) => {
    if (isNewSearch) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    const currentPage = isNewSearch ? 0 : page;
    const { items: newItems, hasMore: newHasMore } = await fetcher(debouncedSearch, currentPage);

    if (isNewSearch) {
      setItems(newItems);
      setPage(1);
    } else {
      setItems((prev) => [...prev, ...newItems]);
      setPage((prev) => prev + 1);
    }
    
    setHasMore(newHasMore);
    setLoading(false);
    setLoadingMore(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, fetcher]);

  React.useEffect(() => {
    loadItems(true);
  }, [loadItems]);

  const handleLoadMore = (e: React.MouseEvent) => {
    e.preventDefault();
    if (hasMore && !loadingMore) {
      loadItems(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="truncate">{selectedItemLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput 
            placeholder={searchPlaceholder} 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading && !loadingMore && <CommandEmpty>Loading...</CommandEmpty>}
            {!loading && items.length === 0 && <CommandEmpty>{emptyMessage}</CommandEmpty>}
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.label} // Use label for searching within Command
                  onSelect={() => {
                    onValueChange(item.value === value ? '' : item.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === item.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
            {hasMore && (
              <CommandItem onSelect={handleLoadMore} className="cursor-pointer justify-center text-center">
                {loadingMore ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  'Load More'
                )}
              </CommandItem>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
