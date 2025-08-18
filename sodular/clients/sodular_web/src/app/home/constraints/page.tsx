"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Link2, Database, AlertCircle } from "lucide-react";
import { getSodularClient } from "@/services";
import { toast } from "sonner";
import { SchemaManagement } from "@/components/constraints/SchemaManagement";
import { RelationshipsManagement } from "@/components/constraints/RelationshipsManagement";
import { useRouter, useSearchParams } from "next/navigation";

interface Collection {
  uid: string;
  data: {
    name: string;
    description?: string;
  };
  createdAt: number;
  isActive?: boolean;
}

export default function ConstraintsPage() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnabling, setIsEnabling] = useState(false);
  const [schemaCollection, setSchemaCollection] = useState<Collection | null>(null);
  const [relationshipsCollection, setRelationshipsCollection] = useState<Collection | null>(null);
  const validTabs = ["schema", "relationships"];
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialTab = (searchParams && validTabs.includes(searchParams.get("tab") || "")) ? searchParams.get("tab")! : "schema";
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

  useEffect(() => {
    checkConstraintsStatus();
  }, []);

  const checkConstraintsStatus = async () => {
    try {
      const client = getSodularClient();
      
      // Check if schema and relationships collections exist
      const [schemaResult, relationshipsResult] = await Promise.all([
        client.tables.get({ filter: { 'data.name': 'schema' } }),
        client.tables.get({ filter: { 'data.name': 'relationships' } })
      ]);

      if (schemaResult.data && relationshipsResult.data) {
        setSchemaCollection(schemaResult.data);
        setRelationshipsCollection(relationshipsResult.data);
        setIsEnabled(true);
      }
    } catch (error: any) {
      console.error('Error checking constraints status:', error);
      toast.error('Failed to check constraints status');
    } finally {
      setIsLoading(false);
    }
  };

  const enableConstraints = async () => {
    setIsEnabling(true);
    try {
      const client = getSodularClient();
      
      // Create schema collection
      const schemaResult = await client.tables.create({
        data: {
          name: 'schema',
          description: 'Collection schemas and field definitions'
        }
      });

      // Create relationships collection
      const relationshipsResult = await client.tables.create({
        data: {
          name: 'relationships',
          description: 'Collection relationships and dependencies'
        }
      });

      if (schemaResult.data && relationshipsResult.data) {
        setSchemaCollection(schemaResult.data);
        setRelationshipsCollection(relationshipsResult.data);
        setIsEnabled(true);
        toast.success('Constraints enabled successfully');
      }
    } catch (error: any) {
      console.error('Error enabling constraints:', error);
      toast.error('Failed to enable constraints');
    } finally {
      setIsEnabling(false);
    }
  };

  // Show loading spinner until client is ready
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Constraints</h1>
          <p className="text-muted-foreground">Manage collection schemas and relationships</p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isEnabled) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Constraints</h1>
          <p className="text-muted-foreground">Manage collection schemas and relationships</p>
        </div>
        
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
              <Link2 className="w-6 h-6 text-muted-foreground" />
            </div>
            <CardTitle>Constraints Not Enabled</CardTitle>
            <CardDescription>
              Enable constraints to manage collection schemas and relationships for your database.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={enableConstraints} 
              disabled={isEnabling}
              size="lg"
            >
              {isEnabling ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Enabling...
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4 mr-2" />
                  Enable Constraints
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Constraints</h1>
          <p className="text-muted-foreground">Manage collection schemas and relationships</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            <Database className="w-3 h-3 mr-1" />
            Primary Database
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="schema">Schema</TabsTrigger>
          <TabsTrigger value="relationships">Relationships</TabsTrigger>
        </TabsList>

        <TabsContent value="schema" className="space-y-4">
          <SchemaManagement schemaCollectionId={schemaCollection?.uid} />
        </TabsContent>

        <TabsContent value="relationships" className="space-y-4">
          <RelationshipsManagement relationshipsCollectionId={relationshipsCollection?.uid} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
