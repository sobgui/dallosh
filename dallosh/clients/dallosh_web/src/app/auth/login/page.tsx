'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bot, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { getSodularClient } from "@/services/client";
import { Navbar } from "@/components/navbar";
import { useIsClient } from "@/hooks/use-is-client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { login, isLoggedIn } = useAuthStore();
  const isClient = useIsClient();

  // Redirect if already logged in
  useEffect(() => {
    if (isClient && isLoggedIn) {
      // Redirect based on user role
      const userRole = useAuthStore.getState().getUserRole();
      if (userRole === 'admin') {
        router.push("/admin/dallosh");
      } else if (userRole === 'agent') {
        router.push("/admin/dallosh");
      } else {
        router.push("/twitter");
      }
    }
  }, [isClient, isLoggedIn, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const client = await getSodularClient();
      if (!client) {
        setError("Failed to connect to service");
        return;
      }

      // Try to authenticate
      const authResult = await client.auth.login({
        data: {
          email,
          password,
        },
      });

      if (authResult.error) {
        setError(authResult.error || "Login failed");
        return;
      }

      if (authResult.data) {
        // Store auth data
        login(authResult.data.user, authResult.data.tokens);
        
        // Redirect based on user role
        const userRole = useAuthStore.getState().getUserRole();
        if (userRole === 'admin') {
          router.push("/admin/dallosh");
        } else if (userRole === 'agent') {
          router.push("/admin/dallosh");
        } else {
          router.push("/twitter");
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if logged in (redirecting)
  if (isClient && isLoggedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <div className="w-full max-w-md">
          <Card className="w-full">
            <CardHeader className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>
                Sign in to your Dallosh account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
              
              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">Don't have an account? </span>
                <Link href="/auth/register" className="text-primary hover:underline">
                  Sign up
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
