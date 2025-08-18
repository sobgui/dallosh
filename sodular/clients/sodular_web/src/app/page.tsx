"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Database, Users, Table, FileText, Zap, Settings } from "lucide-react";
import { initializeSodularClient } from "@/services";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

function getLocalConfig() {
  if (typeof window === 'undefined') return { baseUrl: '', aiBaseUrl: '', databaseId: '' };
  return {
    baseUrl: localStorage.getItem('sodular_base_url') || '',
    aiBaseUrl: localStorage.getItem('sodular_ai_base_url') || '',
    databaseId: localStorage.getItem('sodular_database_id') || '',
  };
}

export default function Home() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [aiBaseUrl, setAiBaseUrl] = useState('');
  const [databaseId, setDatabaseId] = useState('');

  useEffect(() => {
    const config = getLocalConfig();
    setBaseUrl(config.baseUrl);
    setAiBaseUrl(config.aiBaseUrl);
    setDatabaseId(config.databaseId);
  }, [settingsOpen]);

  const handleSaveSettings = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sodular_base_url', baseUrl);
      localStorage.setItem('sodular_ai_base_url', aiBaseUrl);
      localStorage.setItem('sodular_database_id', databaseId);
    }
    setSettingsOpen(false);
    window.location.reload();
  };

  useEffect(() => {
    const testConnection = async () => {
      try {
        const { isReady, error } = await initializeSodularClient();
        setIsConnected(isReady);
        if (error) {
          setError(error);
        }
      } catch (err: any) {
        setIsConnected(false);
        setError(err.message || 'Failed to connect');
      }
    };

    testConnection();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Database className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Sodular</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected === true ? 'bg-green-500' : isConnected === false ? 'bg-red-500' : 'bg-yellow-500'}`} />
              <span className="text-sm text-muted-foreground">
                {isConnected === true ? 'Connected' : isConnected === false ? 'Disconnected' : 'Connecting...'}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} title="Connection Settings">
              <Settings className="h-5 w-5" />
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>
      {/* Settings Modal */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connection Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Server Base URL</label>
              <Input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="http://your-backend:5001/api/v1" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">AI Base URL</label>
              <Input value={aiBaseUrl} onChange={e => setAiBaseUrl(e.target.value)} placeholder="http://your-backend:4200/api/v1" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Default Database ID</label>
              <Input value={databaseId} onChange={e => setDatabaseId(e.target.value)} placeholder="UUID..." />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveSettings}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Multi-Tenant Database Management Platform
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Build scalable applications with our headless CMS. Manage multiple databases,
            collections, and users with a single, powerful API.
          </p>

          {error && (
            <Card className="max-w-md mx-auto mb-8 border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Connection Error</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{error}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Make sure the backend server is running on {process.env.NEXT_PUBLIC_SODULAR_BASE_URL}
                </p>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-center space-x-4">
            <Link href="/auth/login">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                Get Started
              </Button>
            </Link>
            <Button variant="outline" size="lg">
              View Documentation
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card>
            <CardHeader>
              <Database className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Multi-Database</CardTitle>
              <CardDescription>
                Create and manage multiple isolated databases with ease
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-8 w-8 text-secondary mb-2" />
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Built-in authentication and user management for each database
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Table className="h-8 w-8 text-accent mb-2" />
              <CardTitle>Dynamic Tables</CardTitle>
              <CardDescription>
                Create tables and collections dynamically with flexible schemas
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-8 w-8 text-primary mb-2" />
              <CardTitle>REST API</CardTitle>
              <CardDescription>
                Powerful REST API with MongoDB-style querying and filtering
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* SDK Status */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>SDK Status</CardTitle>
            <CardDescription>
              Frontend SDK connection to Sodular Backend
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Backend URL:</span>
                <code className="text-sm bg-muted px-2 py-1 rounded">
                  {process.env.NEXT_PUBLIC_SODULAR_BASE_URL}
                </code>
              </div>
              <div className="flex justify-between">
                <span>Connection Status:</span>
                <span className={`font-medium ${isConnected === true ? 'text-green-600' : isConnected === false ? 'text-red-600' : 'text-yellow-600'}`}>
                  {isConnected === true ? '✅ Connected' : isConnected === false ? '❌ Failed' : '⏳ Testing...'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>SDK Version:</span>
                <span className="text-muted-foreground">v1.0.0</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
