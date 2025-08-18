"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DatabasesManagement } from "@/components/databases/DatabasesManagement";
import { getSodularClient } from "@/services";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DatabasesPage() {
  const params = useParams();
  const databaseId = params.database_id as string;

  useEffect(() => {
    // Set database context when component mounts
    if (databaseId) {
      const client = getSodularClient();
      client.use(databaseId);
    }
  }, [databaseId]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Child Databases</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Manage child databases for this database (databaseId: {databaseId})</p>
          <DatabasesManagement parentDatabaseId={databaseId} />
        </CardContent>
      </Card>
    </div>
  );
}
