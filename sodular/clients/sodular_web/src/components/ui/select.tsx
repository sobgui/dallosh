"use client"

import * as React from "react"
import { ChevronDownIcon, CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

interface SelectTriggerProps {
  className?: string
  children: React.ReactNode
}

interface SelectContentProps {
  children: React.ReactNode
}

interface SelectItemProps {
  value: string
  children: React.ReactNode
  onSelect?: () => void
}

interface SelectValueProps {
  placeholder?: string
}

function Select({ value, onValueChange, children }: SelectProps) {
  return (
    <DropdownMenu>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          const type = (child.type as any)?.displayName || (child.type as any)?.name;
          if (type === 'SelectContent' || type === 'SelectItem' || type === 'CommandInput') {
            return React.cloneElement(child, { value, onValueChange } as any);
          }
          return React.cloneElement(child);
        }
        return child;
      })}
    </DropdownMenu>
  )
}

function SelectTrigger({ className, children }: SelectTriggerProps) {
  return (
    <DropdownMenuTrigger asChild>
      <Button
        variant="outline"
        className={cn(
          "w-full justify-between",
          className
        )}
      >
        {children}
        <ChevronDownIcon className="h-4 w-4 opacity-50" />
      </Button>
    </DropdownMenuTrigger>
  )
}

function SelectContent({ children }: SelectContentProps) {
  return (
    <DropdownMenuContent className="w-full min-w-[var(--radix-dropdown-menu-trigger-width)]">
      {children}
    </DropdownMenuContent>
  )
}

function SelectItem({ value, children, onSelect }: SelectItemProps) {
  return (
    <DropdownMenuItem onSelect={onSelect}>
      {children}
    </DropdownMenuItem>
  )
}

function SelectValue({ placeholder }: SelectValueProps) {
  return <span>{placeholder}</span>
}

export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
}
