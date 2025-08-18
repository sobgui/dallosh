'use client';

import * as React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
  getSortedRowModel,
  getPaginationRowModel,
  PaginationState,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from './skeleton';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  pageCount?: number;
  pagination?: PaginationState;
  onPaginationChange?: React.Dispatch<React.SetStateAction<PaginationState>>;
  sorting?: SortingState;
  onSortingChange?: React.Dispatch<React.SetStateAction<SortingState>>;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  loading = false,
  pageCount: controlledPageCount,
  pagination: controlledPagination,
  onPaginationChange: setControlledPagination,
  sorting: controlledSorting,
  onSortingChange: setControlledSorting,
}: DataTableProps<TData, TValue>) {
  const isServerSide = controlledPageCount != null;

  const [internalSorting, setInternalSorting] = React.useState<SortingState>([]);
  const [internalPagination, setInternalPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // Provide safe fallbacks for controlled state
  const pagination = isServerSide
    ? controlledPagination ?? { pageIndex: 0, pageSize: 10 }
    : internalPagination;
  const sorting = isServerSide ? controlledSorting ?? [] : internalSorting;

  const onPaginationChange = isServerSide
    ? setControlledPagination
    : setInternalPagination;
  const onSortingChange = isServerSide
    ? setControlledSorting
    : setInternalSorting;

  const table = useReactTable({
    data,
    columns,
    pageCount: isServerSide ? controlledPageCount : -1,
    state: {
      pagination,
      sorting,
    },
    onPaginationChange,
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: isServerSide,
    manualSorting: isServerSide,
    // Add a default empty function for setters if they are not provided in server-side mode to prevent crashes.
    ...(isServerSide && !onPaginationChange && { onPaginationChange: () => {} }),
    ...(isServerSide && !onSortingChange && { onSortingChange: () => {} }),
  });

  const pageSize = table.getState().pagination.pageSize || 10;

  return (
    <div>
      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {(loading && data.length === 0) ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((col, j) => (
                     <TableCell key={j}>
                        <Skeleton className="h-6 w-full" />
                     </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
