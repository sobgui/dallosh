'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, MessageSquare, Ticket, Users, Clock, Zap, FileText, Shield, Lock, Eye, Trash, User, Phone } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth";

export default function ChatPage() {
  const { user } = useAuthStore();
  
  // Security is now handled by SecurityWrapper in layout.tsx
  // This page only shows content after security checks pass
  useEffect(() => {
    // Set security as passed since SecurityWrapper handles the checks
    // This ensures the page content is displayed
  }, []);

  return (
    <>
      {/* Main Page Content - Only shown after accepting terms and completing profile */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white dark:bg-black">
        <div className="text-center max-w-2xl">
          <div className="mb-6">
            <Bot className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome to Free Support
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Get help with your technical issues through AI assistance or request human intervention when needed.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 dark:bg-neutral-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <Ticket className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">My Tickets</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Chat with our AI assistant to get immediate help with your questions and issues.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Use the "My Tickets" tab in the sidebar to view your active support conversations.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-neutral-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <FileText className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">My Requests</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Create technical assistance requests when you need human intervention or specialized support.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Use the "My Requests" tab in the sidebar to manage your technical assistance requests.
              </p>
            </div>
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p>💡 <strong>Tip:</strong> Start by mentioning @free in a Twitter post to create your first support ticket!</p>
          </div>
        </div>
      </div>
    </>
  );
}

