"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, Users, Table, FileText } from "lucide-react";
import { getSodularClient } from "@/services";

interface DashboardStats {
  users: number;
  databases: number;
  tables: number;
  documents: number;
}

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats>({
    users: 0,
    databases: 0,
    tables: 0,
    documents: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const client = getSodularClient();

        // Get user count
        const usersResult = await client.auth.count({ filter: {} });
        const userCount = usersResult.data?.total || 0;

        // Get database count
        const databasesResult = await client.database.count({ filter: {} });
        const databaseCount = databasesResult.data?.total || 0;

        // Get tables count
        const tablesResult = await client.tables.count({ filter: {} });
        const tableCount = tablesResult.data?.total || 0;

        // For documents, we'll need to sum across all tables
        // For now, let's just show 0 or implement a simple count
        const documentCount = 0; // TODO: Implement document counting across tables

        setStats({
          users: userCount,
          databases: databaseCount,
          tables: tableCount,
          documents: documentCount
        });
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard stats");
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Overview</h1>
          <p className="text-muted-foreground">Primary database management dashboard</p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loading...</CardTitle>
                <div className="h-4 w-4 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Overview</h1>
          <p className="text-muted-foreground">Primary database management dashboard</p>
        </div>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          Primary Database
        </Badge>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users}</div>
            <p className="text-xs text-muted-foreground">
              Registered users in primary database
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Child Databases</CardTitle>
            <Database className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.databases}</div>
            <p className="text-xs text-muted-foreground">
              Managed child databases
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tables</CardTitle>
            <Table className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tables}</div>
            <p className="text-xs text-muted-foreground">
              Collections in primary database
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.documents}</div>
            <p className="text-xs text-muted-foreground">
              Total documents across tables
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5 text-secondary" />
              Manage Users
            </CardTitle>
            <CardDescription>
              Add, edit, or remove users from the primary database
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="mr-2 h-5 w-5 text-primary" />
              Create Database
            </CardTitle>
            <CardDescription>
              Set up a new child database for multi-tenant applications
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Table className="mr-2 h-5 w-5 text-accent" />
              Manage Tables
            </CardTitle>
            <CardDescription>
              Create and configure tables for your data structures
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
