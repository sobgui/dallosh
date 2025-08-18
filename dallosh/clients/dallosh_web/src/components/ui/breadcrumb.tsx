
'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

import { cn } from '@/lib/utils'

function Breadcrumb({ className, ...props }: React.ComponentProps<'nav'>) {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  const breadcrumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/')
    const isLast = index === segments.length - 1

    // Capitalize and replace dashes
    const label = segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

    return { href, label, isLast }
  })

  if (segments.length === 0) {
    return null; // Don't show on root page
  }
  
  return (
    <nav aria-label="Breadcrumb" className={cn('text-sm text-muted-foreground', className)} {...props}>
      <ol className="flex items-center gap-1.5">
        <li>
          <Link href="/home" className="hover:text-foreground transition-colors">
            <Home className="h-4 w-4" />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        {breadcrumbs.map(({ label, href, isLast }) => (
          <li key={href} className="flex items-center gap-1.5">
            <ChevronRight className="h-4 w-4" />
            {isLast ? (
              <span className="font-medium text-foreground">{label}</span>
            ) : (
              <Link href={href} className="hover:text-foreground transition-colors">
                {label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export { Breadcrumb }
