"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Navbar } from "@/components/layout/Navbar";

interface Database {
  uid: string;
  data: {
    name: string;
    description?: string;
  };
  createdAt: number;
}

interface DatabaseHeaderProps {
  database: Database;
}

export function DatabaseHeader({ database }: DatabaseHeaderProps) {
  const pathname = usePathname();

  // Extract the current page from pathname
  const pathSegments = pathname.split('/').filter(Boolean);
  const currentPage = pathSegments[pathSegments.length - 1];

  // Map path segments to readable names
  const getPageTitle = (segment: string) => {
    switch (segment) {
      case 'overview':
      case pathSegments[2]: // database_id
        return 'Overview';
      case 'users':
        return 'Users';
      case 'databases':
        return 'Databases';
      case 'tables':
        return 'Tables';
      case 'settings':
        return 'Settings';
      default:
        return segment.charAt(0).toUpperCase() + segment.slice(1);
    }
  };

  const pageTitle = getPageTitle(currentPage);

  return (
    <>
      {/* Top Navbar */}
      <Navbar title={`${database.data.name} - Database`} database={database} />

      {/* Breadcrumb Header */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink asChild>
                  <Link href="/home">
                    <Home className="h-4 w-4" />
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/database/${database.uid}`}>
                    {database.data.name}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {pageTitle !== 'Overview' && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
    </>
  );
}
