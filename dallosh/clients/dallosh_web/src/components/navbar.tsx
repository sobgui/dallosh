'use client';

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuthStore } from "@/stores/auth";
import { Bot, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface NavbarProps {
  className?: string;
}

export function Navbar({ className = "" }: NavbarProps) {
  const { isLoggedIn, isAdmin, isAgent, getUserRole } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Get user role for conditional rendering
  const userRole = getUserRole();

  return (
    <nav className={`bg-background border-b border-border ${className}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Bot className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-foreground">Dallosh</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-6">
            <Link href="/#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="/#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link href="/#about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
          </div>

          {/* Right side - Auth buttons and theme toggle */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            <ThemeToggle />
            {!isLoggedIn ? (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button size="sm">
                    Get Started
                  </Button>
                </Link>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                {/* Show appropriate dashboard link based on role */}
                {userRole === 'admin' || userRole === 'agent' ? (
                  <Link href="/admin/dallosh">
                    <Button size="sm">
                      Admin Dashboard
                    </Button>
                  </Link>
                ) : (
                  <Link href="/twitter">
                    <Button size="sm">
                      Go to Demo
                    </Button>
                  </Link>
                )}
                
                {/* Show Twitter admin link for admin users */}
                {userRole === 'admin' && (
                  <Link href="/admin/twitter">
                    <Button variant="outline" size="sm">
                      Twitter Admin
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMobileMenu}
              className="p-2"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="space-y-1 pb-3 pt-2 border-t border-border">
              <Link
                href="/#features"
                className="block px-3 py-2 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="/#pricing"
                className="block px-3 py-2 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                href="/#about"
                className="block px-3 py-2 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                About
              </Link>
              
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm font-medium text-muted-foreground">Theme</span>
                  <ThemeToggle />
                </div>
                {!isLoggedIn ? (
                  <div className="space-y-2 px-3">
                    <Link href="/auth/login" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/auth/register" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button className="w-full justify-start">
                        Get Started
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="px-3">
                    {/* Show appropriate dashboard link based on role */}
                    {userRole === 'admin' || userRole === 'agent' ? (
                      <Link href="/admin/dallosh" onClick={() => setIsMobileMenuOpen(false)}>
                        <Button className="w-full justify-start">
                          Admin Dashboard
                        </Button>
                      </Link>
                    ) : (
                      <Link href="/twitter" onClick={() => setIsMobileMenuOpen(false)}>
                        <Button className="w-full justify-start">
                          Go to Demo
                        </Button>
                      </Link>
                    )}
                    
                    {/* Show Twitter admin link for admin users */}
                    {userRole === 'admin' && (
                      <Link href="/admin/twitter" onClick={() => setIsMobileMenuOpen(false)}>
                        <Button variant="outline" className="w-full justify-start">
                          Twitter Admin
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}


