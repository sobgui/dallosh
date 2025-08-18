"use client";

import { DatabasesManagement } from "@/components/databases/DatabasesManagement";

export default function DatabasePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Databases</h1>
        <p className="text-muted-foreground">
          Manage child databases in the primary database
        </p>
      </div>

      <DatabasesManagement />
    </div>
  );
}
