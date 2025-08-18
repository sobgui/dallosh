"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Database, Eye, EyeOff } from "lucide-react";
import { initializeSodularClient } from '@/services';

export default function LoginPage() {
  const [email, setEmail] = useState("root@sodular.com");
  const [password, setPassword] = useState("root123");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // No auth checks or polling here; guard handles all access control

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      // Dynamically import the SDK and call login
      const { getSodularClient, initializeSodularClient } = await import('@/services');
      await initializeSodularClient(); // Ensure client is initialized
      const client = getSodularClient();
      const result = await client.auth.login({ email, password });
      console.log('Login result:', result); // Debug log
      if (result.data?.tokens) {
        // After login, re-initialize the client to update in-memory tokens
        await initializeSodularClient();
        setIsLoading(false);
        router.replace("/home"); // Redirect to home on success
        return;
      } else {
        setError(result.error || "Login failed");
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Database className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to Sodular</CardTitle>
          <CardDescription>
            Sign in to your admin dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Default root credentials:</p>
            <p>Email: root@sodular.com</p>
            <p>Password: root123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
