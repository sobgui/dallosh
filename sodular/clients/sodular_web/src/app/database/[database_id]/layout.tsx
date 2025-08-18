"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSodularClient, initializeSodularClient, isClientReady } from "@/services";
import { toast } from "sonner";

import { DatabaseSidebar } from "@/components/layout/DatabaseSidebar";
import { DatabaseHeader } from "@/components/layout/DatabaseHeader";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

interface Database {
  uid: string;
  data: {
    name: string;
    description?: string;
  };
  createdAt: number;
}

export default function DatabaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const databaseId = params.database_id as string;
  const [database, setDatabase] = useState<Database | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAndFetch = async () => {
      try {
        // Now fetch database information
        const client = getSodularClient();
        const response = await client.database.get({
          filter: { uid: databaseId }
        });

        if (response.data) {
          setDatabase(response.data);
        } else {
          toast.error("Database not found");
        }
      } catch (error) {
        console.error("Failed to fetch database:", error);
        toast.error("Failed to load database information");
      } finally {
        setLoading(false);
      }
    };

    if (databaseId) {
      initializeAndFetch();
    }
  }, [databaseId]);

  const sidebarItems = [
    {
      title: "Overview",
      href: `/database/${databaseId}`,
      icon: "BarChart3"
    },
    {
      title: "Users",
      href: `/database/${databaseId}/users`,
      icon: "Users"
    },
    {
      title: "Databases",
      href: `/database/${databaseId}/databases`,
      icon: "Database"
    },
    {
      title: "Tables",
      href: `/database/${databaseId}/tables`,
      icon: "Table"
    },
    {
      title: "Settings",
      href: `/database/${databaseId}/settings`,
      icon: "Settings"
    }
  ];

  if (loading) {
    return (
      <SidebarProvider>
        <div className="flex h-screen w-full">
          <div className="w-64 border-r bg-muted/40">
            <div className="p-4">
              <div className="h-6 bg-muted rounded animate-pulse mb-4"></div>
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-8 bg-muted rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
          <SidebarInset>
            <div className="flex-1 p-6">
              <div className="text-center">Loading database...</div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  if (!database) {
    return (
      <SidebarProvider>
        <div className="flex h-screen w-full items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Database Not Found</h1>
            <p className="text-muted-foreground">
              The requested database could not be found.
            </p>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <DatabaseSidebar database={database} databaseId={databaseId} />
      <SidebarInset>
        <DatabaseHeader database={database} />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
