'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import type { PaginationState, SortingState } from '@tanstack/react-table';
import { useDebounce } from './use-debounce';

interface DataTableStateConfig {
    pageParam?: string;
    sizeParam?: string;
    sortParam?: string;
    searchParam?: string;
    defaultPageSize?: number;
    namespace?: string;
}

/**
 * A custom hook to manage data table state (pagination, sorting, searching) via URL query parameters.
 * This makes the table state persistent across reloads and shareable.
 */
export function useDataTableState({
    pageParam = 'page',
    sizeParam = 'size',
    sortParam = 'sort',
    searchParam = 'search',
    defaultPageSize = 10,
    namespace = '',
}: DataTableStateConfig = {}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Prefix all params with namespace if provided
    if (namespace) {
        pageParam = `${namespace}_${pageParam}`;
        sizeParam = `${namespace}_${sizeParam}`;
        sortParam = `${namespace}_${sortParam}`;
        searchParam = `${namespace}_${searchParam}`;
    }

    // Derive state from URL search parameters
    const pagination = useMemo<PaginationState>(() => ({
        pageIndex: Number(searchParams.get(pageParam) ?? '0'),
        pageSize: Number(searchParams.get(sizeParam) ?? defaultPageSize),
    }), [searchParams, pageParam, sizeParam, defaultPageSize]);

    const sorting = useMemo<SortingState>(() => {
        const sort = searchParams.get(sortParam);
        if (!sort) return [];
        const [id, dir] = sort.split('.');
        return [{ id, desc: dir === 'desc' }];
    }, [searchParams, sortParam]);
    
    const searchTerm = searchParams.get(searchParam) ?? '';
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    // Helper to create and update the URL query string
    const createQueryString = useCallback(
        (params: Record<string, string | number | null>) => {
            const newSearchParams = new URLSearchParams(searchParams.toString());
            for (const [key, value] of Object.entries(params)) {
                if (value === null || value === '') {
                    newSearchParams.delete(key);
                } else {
                    newSearchParams.set(key, String(value));
                }
            }
            return newSearchParams.toString();
        },
        [searchParams]
    );

    // Handlers to be passed to the DataTable component
    const onPaginationChange = (updater: any) => {
        const newState: PaginationState = typeof updater === 'function' ? updater(pagination) : updater;
        router.push(`${pathname}?${createQueryString({ [pageParam]: newState.pageIndex, [sizeParam]: newState.pageSize })}`);
    };

    const onSortingChange = (updater: any) => {
        const newState: SortingState = typeof updater === 'function' ? updater(sorting) : updater;
        const newSort = newState?.[0] ? `${newState[0].id}.${newState[0].desc ? 'desc' : 'asc'}` : null;
        router.push(`${pathname}?${createQueryString({ [sortParam]: newSort, [pageParam]: 0 })}`);
    };
    
    const onSearchChange = (value: string) => {
        router.push(`${pathname}?${createQueryString({ [searchParam]: value, [pageParam]: 0 })}`);
    };

    return {
        pagination,
        sorting,
        searchTerm,
        debouncedSearchTerm,
        onPaginationChange,
        onSortingChange,
        onSearchChange,
    };
}
