"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsersManagement } from "@/components/users/UsersManagement";
import { SettingsTab } from "@/components/users/SettingsTab";
import { useParams } from "next/navigation";

export default function UsersPage() {
  const params = useParams();
  const databaseId = params.database_id as string;
  const validTabs = ["users", "settings"];
  const [activeTab, setActiveTab] = useState("users");

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
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
      </div>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <UsersManagement databaseId={databaseId} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <SettingsTab databaseId={databaseId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
