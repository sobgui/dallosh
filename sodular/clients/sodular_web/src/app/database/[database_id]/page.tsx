"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Database, Table, Activity } from "lucide-react";
import { getSodularClient, initializeSodularClient, isClientReady } from "@/services";
import { toast } from "sonner";

interface DatabaseStats {
  totalUsers: number | null;
  totalChildDatabases: number;
  totalTables: number;
  recentActivity: Array<{
    id: string;
    action: string;
    resource: string;
    timestamp: string;
  }>;
}

interface DatabaseInfo {
  uid: string;
  data: {
    name: string;
    description?: string;
  };
  createdAt: number;
  updatedAt?: number;
  createdBy?: string;
}

export default function DatabaseOverviewPage() {
  const params = useParams();
  const databaseId = params.database_id as string;
  const [database, setDatabase] = useState<DatabaseInfo | null>(null);
  const [stats, setStats] = useState<DatabaseStats>({
    totalUsers: null,
    totalChildDatabases: 0,
    totalTables: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Ensure client is initialized
        if (!isClientReady()) {
          console.log("Initializing Sodular client...");
          const { isReady, error } = await initializeSodularClient();
          if (!isReady) {
            toast.error(`Failed to initialize client: ${error}`);
            return;
          }
        }

        const client = getSodularClient();

        // Fetch database info from primary database
        const databaseResponse = await client.database.get({
          filter: { uid: databaseId }
        });

        if (!databaseResponse.data) {
          toast.error("Database not found");
          return;
        }

        setDatabase(databaseResponse.data);

        // Switch to database context for fetching stats
        client.use(databaseId);

        // Check if users table exists before fetching users count
        let totalUsers = null;
        try {
          const usersTable = await client.tables.get({ filter: { 'data.name': 'users' } });
          if (usersTable.data) {
            const usersCountResponse = await client.auth.count({});
            totalUsers = usersCountResponse.data?.total || 0;
          }
        } catch (error) {
          // Users table might not exist in this database
          console.log("No users table in this database");
        }

        // Fetch child databases count
        let totalChildDatabases = 0;
        try {
          const childDatabasesResponse = await client.database.count({});
          totalChildDatabases = childDatabasesResponse.data?.total || 0;
        } catch (error) {
          console.log("Error fetching child databases count:", error);
        }

        // Fetch tables count
        let totalTables = 0;
        try {
          const tablesResponse = await client.tables.count({});
          totalTables = tablesResponse.data?.total || 0;
        } catch (error) {
          console.log("Error fetching tables count:", error);
        }

        setStats({
          totalUsers,
          totalChildDatabases,
          totalTables,
          recentActivity: [
            {
              id: "1",
              action: "Created",
              resource: "Database context",
              timestamp: new Date().toISOString()
            },
            {
              id: "2",
              action: "Accessed",
              resource: "Database overview",
              timestamp: new Date(Date.now() - 3600000).toISOString()
            }
          ]
        });
      } catch (error) {
        console.error("Failed to fetch database overview:", error);
        toast.error("Failed to load database information");
      } finally {
        setLoading(false);
      }
    };

    if (databaseId) {
      fetchData();
    }
  }, [databaseId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Database Overview</h1>
          <p className="text-muted-foreground">Loading database information...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Database Overview</h1>
        <p className="text-muted-foreground">
          {database?.data.name} - {database?.data.description || "Database management dashboard"}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Only show Users card if users collection exists */}
        {stats.totalUsers !== null && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalUsers === 0 ? "No users" : "Active users"}
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Child Databases</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalChildDatabases}</div>
            <p className="text-xs text-muted-foreground">
              Nested databases
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tables</CardTitle>
            <Table className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTables}</div>
            <p className="text-xs text-muted-foreground">
              Collections in database
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activity</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentActivity.length}</div>
            <p className="text-xs text-muted-foreground">
              Recent actions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Database Info */}
      <Card>
        <CardHeader>
          <CardTitle>Database Information</CardTitle>
          <CardDescription>
            Details about this database instance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Database ID</p>
              <p className="text-sm text-muted-foreground font-mono">{database?.uid}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Created</p>
              <p className="text-sm text-muted-foreground">
                {database?.createdAt ? new Date(database.createdAt).toLocaleString() : "Unknown"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Name</p>
              <p className="text-sm text-muted-foreground">{database?.data.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Description</p>
              <p className="text-sm text-muted-foreground">
                {database?.data.description || "No description provided"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest actions performed in this database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline">{activity.action}</Badge>
                    <span className="text-sm">{activity.resource}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(activity.timestamp).toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
