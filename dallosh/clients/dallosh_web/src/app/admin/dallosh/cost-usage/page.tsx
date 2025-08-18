'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  CreditCard, 
  DollarSign, 
  Users, 
  MessageSquare, 
  Bot, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Plus,
  Settings,
  Eye,
  FileText,
  Calendar,
  ArrowRight,
  Zap,
  Shield,
  Globe,
  Headphones
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Mock data for realistic feel
const mockSubscriptionData = {
  currentPlan: {
    name: "Professional",
    price: 99,
    currency: "USD",
    billingCycle: "monthly",
    features: [
      "Up to 10,000 conversations/month",
      "Advanced AI with custom training",
      "Multi-platform integration",
      "Priority support",
      "Analytics dashboard"
    ],
    limits: {
      conversations: 10000,
      agents: 5,
      users: 1000,
      languages: 25
    }
  },
  usage: {
    conversations: 7234,
    agents: 3,
    users: 456,
    languages: 8,
    aiTokens: 1250000
  },
  billing: {
    nextBillingDate: "2024-02-15",
    currentBalance: 0,
    pendingCharges: 0,
    overageCharges: 0
  }
};

const mockBillingHistory = [
  {
    id: "inv_001",
    date: "2024-01-15",
    amount: 99.00,
    status: "paid",
    description: "Professional Plan - January 2024",
    type: "subscription"
  },
  {
    id: "inv_002",
    date: "2024-01-20",
    amount: 15.50,
    status: "paid",
    description: "Overage charges - AI conversations",
    type: "overage"
  },
  {
    id: "inv_003",
    date: "2024-01-25",
    amount: 25.00,
    status: "paid",
    description: "Additional agent license",
    type: "addon"
  },
  {
    id: "inv_004",
    date: "2024-02-01",
    amount: 99.00,
    status: "pending",
    description: "Professional Plan - February 2024",
    type: "subscription"
  }
];

const mockPaymentMethods = [
  {
    id: "pm_001",
    type: "card",
    last4: "4242",
    brand: "Visa",
    expiryMonth: 12,
    expiryYear: 2025,
    isDefault: true
  },
  {
    id: "pm_002",
    type: "card",
    last4: "5555",
    brand: "Mastercard",
    expiryMonth: 8,
    expiryYear: 2026,
    isDefault: false
  }
];

export default function CostUsagePage() {
  const [selectedPlan, setSelectedPlan] = useState("professional");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const calculateUsagePercentage = (used: number, limit: number) => {
    return Math.min((used / limit) * 100, 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'failed': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const handleUpgrade = () => {
    setShowUpgradeModal(true);
  };

  const handlePaymentMethod = () => {
    setShowPaymentModal(true);
  };

  const handleViewReceipt = (invoice: any) => {
    setSelectedInvoice(invoice);
    setShowReceiptModal(true);
  };

  const handleDownloadInvoice = (invoice: any) => {
    // Mock download functionality
    const blob = new Blob([`Invoice ${invoice.id}\nAmount: $${invoice.amount}\nDate: ${invoice.date}\nDescription: ${invoice.description}`], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoice.id}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Cost Usage & Billing</h1>
          <p className="text-gray-400">Manage your subscription, billing, and payment methods</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handlePaymentMethod}>
            <CreditCard className="h-4 w-4 mr-2" />
            Payment Methods
          </Button>
          <Button onClick={handleUpgrade}>
            <Plus className="h-4 w-4 mr-2" />
            Upgrade Plan
          </Button>
        </div>
      </div>

      {/* Current Plan & Usage Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Plan */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-400" />
              Current Plan
            </CardTitle>
            <CardDescription className="text-gray-400">
              Your active subscription details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">
                {mockSubscriptionData.currentPlan.name}
              </div>
              <div className="text-2xl font-bold text-white">
                ${mockSubscriptionData.currentPlan.price}
                <span className="text-sm text-gray-400 font-normal">/month</span>
              </div>
              <Badge variant="secondary" className="mt-2">
                {mockSubscriptionData.currentPlan.billingCycle}
              </Badge>
            </div>
            
            <div className="space-y-2">
              {mockSubscriptionData.currentPlan.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  {feature}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Usage Metrics */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-400" />
              Usage This Month
            </CardTitle>
            <CardDescription className="text-gray-400">
              Current month's resource consumption
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Conversations</span>
                  <span className="text-white">
                    {mockSubscriptionData.usage.conversations.toLocaleString()} / {mockSubscriptionData.currentPlan.limits.conversations.toLocaleString()}
                  </span>
                </div>
                <Progress 
                  value={calculateUsagePercentage(mockSubscriptionData.usage.conversations, mockSubscriptionData.currentPlan.limits.conversations)} 
                  className="h-2"
                />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Active Agents</span>
                  <span className="text-white">
                    {mockSubscriptionData.usage.agents} / {mockSubscriptionData.currentPlan.limits.agents}
                  </span>
                </div>
                <Progress 
                  value={calculateUsagePercentage(mockSubscriptionData.usage.agents, mockSubscriptionData.currentPlan.limits.agents)} 
                  className="h-2"
                />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Users</span>
                  <span className="text-white">
                    {mockSubscriptionData.usage.users.toLocaleString()} / {mockSubscriptionData.currentPlan.limits.users.toLocaleString()}
                  </span>
                </div>
                <Progress 
                  value={calculateUsagePercentage(mockSubscriptionData.usage.users, mockSubscriptionData.currentPlan.limits.users)} 
                  className="h-2"
                />
              </div>
            </div>
            
            <div className="pt-2 border-t border-gray-700">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">AI Tokens Used</span>
                <span className="text-white">{mockSubscriptionData.usage.aiTokens.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Billing Summary */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-yellow-400" />
              Billing Summary
            </CardTitle>
            <CardDescription className="text-gray-400">
              Your current billing status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Next Billing Date</span>
                <span className="text-white font-medium">
                  {new Date(mockSubscriptionData.billing.nextBillingDate).toLocaleDateString()}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Current Balance</span>
                <span className="text-white font-medium">
                  ${mockSubscriptionData.billing.currentBalance.toFixed(2)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Pending Charges</span>
                <span className="text-white font-medium">
                  ${mockSubscriptionData.billing.pendingCharges.toFixed(2)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Overage Charges</span>
                <span className="text-white font-medium">
                  ${mockSubscriptionData.billing.overageCharges.toFixed(2)}
                </span>
              </div>
            </div>
            
            <div className="pt-2 border-t border-gray-700">
              <Button variant="outline" className="w-full" onClick={handlePaymentMethod}>
                <CreditCard className="h-4 w-4 mr-2" />
                Manage Billing
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Billing History */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-400" />
            Billing History
          </CardTitle>
          <CardDescription className="text-gray-400">
            Your recent invoices and payment history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockBillingHistory.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(invoice.status)}
                    <Badge className={getStatusColor(invoice.status)}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </Badge>
                  </div>
                  
                  <div>
                    <div className="font-medium text-white">{invoice.description}</div>
                    <div className="text-sm text-gray-400">
                      {new Date(invoice.date).toLocaleDateString()} • {invoice.id}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-bold text-white">${invoice.amount.toFixed(2)}</div>
                    <div className="text-xs text-gray-400 capitalize">{invoice.type}</div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewReceipt(invoice)}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadInvoice(invoice)}
                      className="text-green-400 hover:text-green-300"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-green-400" />
            Payment Methods
          </CardTitle>
          <CardDescription className="text-gray-400">
            Your saved payment methods for automatic billing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockPaymentMethods.map((method) => (
              <div key={method.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{method.brand}</span>
                  </div>
                  
                  <div>
                    <div className="font-medium text-white">
                      {method.brand} •••• {method.last4}
                    </div>
                    <div className="text-sm text-gray-400">
                      Expires {method.expiryMonth}/{method.expiryYear}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {method.isDefault && (
                    <Badge variant="secondary" className="bg-green-600 text-white">
                      Default
                    </Badge>
                  )}
                  
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            <Button variant="outline" className="w-full" onClick={handlePaymentMethod}>
              <Plus className="h-4 w-4 mr-2" />
              Add Payment Method
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-400" />
            Cost Breakdown
          </CardTitle>
          <CardDescription className="text-gray-400">
            Detailed breakdown of your monthly costs and usage-based charges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Base Subscription */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">Base Subscription</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium text-white">Professional Plan</div>
                    <div className="text-sm text-gray-400">Monthly subscription</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-white">$99.00</div>
                    <div className="text-xs text-gray-400">per month</div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium text-white">Active Agents</div>
                    <div className="text-sm text-gray-400">3 of 5 included</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-white">$0.00</div>
                    <div className="text-xs text-gray-400">included</div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium text-white">Users</div>
                    <div className="text-sm text-gray-400">456 of 1,000 included</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-white">$0.00</div>
                    <div className="text-xs text-gray-400">included</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Usage-Based Charges */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">Usage-Based Charges</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium text-white">AI Conversations</div>
                    <div className="text-sm text-gray-400">7,234 of 10,000 included</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-white">$0.00</div>
                    <div className="text-xs text-gray-400">within limit</div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium text-white">AI Tokens</div>
                    <div className="text-sm text-gray-400">1,250,000 used</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-white">$0.00</div>
                    <div className="text-xs text-gray-400">included</div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium text-white">Languages</div>
                    <div className="text-sm text-gray-400">8 of 25 included</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-white">$0.00</div>
                    <div className="text-xs text-gray-400">included</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-700">
            <div className="flex justify-between items-center p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <div>
                <div className="font-bold text-white text-lg">Total Monthly Cost</div>
                <div className="text-sm text-blue-300">All charges included in your plan</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-white text-2xl">$99.00</div>
                <div className="text-sm text-blue-300">per month</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Plans Section */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-400" />
            Available Plans
          </CardTitle>
          <CardDescription className="text-gray-400">
            Choose the plan that best fits your business needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Starter Plan */}
            <div className="border border-gray-700 rounded-lg p-6 bg-gray-800">
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-white mb-2">Starter</h3>
                <div className="text-3xl font-bold text-white">$29<span className="text-sm text-gray-400">/month</span></div>
                <p className="text-gray-400 text-sm">Perfect for small businesses</p>
              </div>
              
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  Up to 1,000 conversations/month
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  Basic AI responses
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  Twitter integration
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  Email support
                </li>
              </ul>
              
              <Button variant="outline" className="w-full" onClick={handleUpgrade}>
                Select Plan
              </Button>
            </div>

            {/* Professional Plan (Current) */}
            <div className="border-2 border-blue-500 rounded-lg p-6 bg-gray-800 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-blue-600 text-white">Current Plan</Badge>
              </div>
              
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-white mb-2">Professional</h3>
                <div className="text-3xl font-bold text-white">$99<span className="text-sm text-gray-400">/month</span></div>
                <p className="text-gray-400 text-sm">Ideal for growing companies</p>
              </div>
              
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  Up to 10,000 conversations/month
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  Advanced AI with custom training
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  Multi-platform integration
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  Priority support
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  Analytics dashboard
                </li>
              </ul>
              
              <Button className="w-full bg-blue-600 hover:bg-blue-700" disabled>
                Current Plan
              </Button>
            </div>

            {/* Enterprise Plan */}
            <div className="border border-gray-700 rounded-lg p-6 bg-gray-800">
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-white mb-2">Enterprise</h3>
                <div className="text-3xl font-bold text-white">Custom</div>
                <p className="text-gray-400 text-sm">For large organizations</p>
              </div>
              
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  Unlimited conversations
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  Custom AI model training
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  Full platform integration
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  Dedicated support team
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  Custom integrations
                </li>
              </ul>
              
              <Button variant="outline" className="w-full" onClick={handleUpgrade}>
                Contact Sales
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      
      {/* Upgrade Plan Modal */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Upgrade Your Plan
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Choose a new plan to upgrade your subscription
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-white mb-2 block">Select Plan</Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  <SelectItem value="starter">Starter - $29/month</SelectItem>
                  <SelectItem value="professional">Professional - $99/month</SelectItem>
                  <SelectItem value="enterprise">Enterprise - Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="text-sm text-gray-400">
              <p>Your new plan will be effective from the next billing cycle.</p>
              <p className="mt-2">Next billing date: {new Date(mockSubscriptionData.billing.nextBillingDate).toLocaleDateString()}</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUpgradeModal(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Upgrade Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Method Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Add Payment Method
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Add a new credit card for automatic billing
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-white mb-2 block">Card Number</Label>
              <Input 
                placeholder="1234 5678 9012 3456" 
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white mb-2 block">Expiry Date</Label>
                <Input 
                  placeholder="MM/YY" 
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label className="text-white mb-2 block">CVC</Label>
                <Input 
                  placeholder="123" 
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-white mb-2 block">Cardholder Name</Label>
              <Input 
                placeholder="John Doe" 
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaymentModal(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button className="bg-green-600 hover:bg-green-700">
              Add Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Modal */}
      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice Details
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              View invoice information and download receipt
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="bg-gray-700 p-4 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Invoice ID:</span>
                  <span className="text-white font-mono">{selectedInvoice.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Date:</span>
                  <span className="text-white">{new Date(selectedInvoice.date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Amount:</span>
                  <span className="text-white font-bold">${selectedInvoice.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <Badge className={getStatusColor(selectedInvoice.status)}>
                    {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Type:</span>
                  <span className="text-white capitalize">{selectedInvoice.type}</span>
                </div>
              </div>
              
              <div className="bg-gray-700 p-4 rounded-lg">
                <h4 className="font-medium text-white mb-2">Description</h4>
                <p className="text-gray-300">{selectedInvoice.description}</p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReceiptModal(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Close
            </Button>
            {selectedInvoice && (
              <Button 
                onClick={() => handleDownloadInvoice(selectedInvoice)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
