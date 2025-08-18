"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TablesTab } from "@/components/tables/TablesTab";
import { DataTab } from "@/components/tables/DataTab";
import { SettingsTab } from "@/components/tables/SettingsTab";
import { useRouter, useSearchParams } from "next/navigation";

export default function TablesPage() {
  const validTabs = ["data", "tables", "settings"];
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialTab = (searchParams && validTabs.includes(searchParams.get("tab") || "")) ? searchParams.get("tab")! : "data";
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.set("tab", tab);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, '', newUrl);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tables</h1>
        <p className="text-muted-foreground">
          Manage tables and data for the primary database
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="tables">Tables</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="space-y-4">
          <DataTab {...{setActiveTab: setActiveTab}} />
        </TabsContent>

        <TabsContent value="tables" className="space-y-4">
          <TablesTab />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
