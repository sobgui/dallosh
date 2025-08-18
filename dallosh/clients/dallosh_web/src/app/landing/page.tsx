'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Bot, MessageSquare, Ticket, Zap, Shield, Globe, Headphones, BarChart3, Users, Clock } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Navbar } from "@/components/navbar";

const appName = "Dallosh";

export default function LandingPage() {
  const { isLoggedIn } = useAuthStore();
  const router = useRouter();

  // Allow visiting landing page even when logged in - no automatic redirect

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">
              🚀 Now Available for Enterprise
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
              AI-Powered Customer Support for
              <span className="text-primary"> Enterprises</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Transform your customer support with intelligent chatbots that integrate seamlessly with your social media platforms.
              Reduce response times by 80% and boost customer satisfaction.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/auth/register">
                <Button size="lg" className="bg-primary hover:bg-primary/90">
                  Start Free Trial
                </Button>
              </Link>
              <Button size="lg" variant="outline">
                Watch Demo
              </Button>
            </div>
            <div className="mt-8 flex items-center justify-center gap-x-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-x-1">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <span>4.9/5 from 500+ reviews</span>
              </div>
              <div className="flex items-center gap-x-1">
                <Users className="h-4 w-4 text-primary" />
                <span>10,000+ happy customers</span>
            </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section id="features" className="py-20 bg-muted/50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything You Need for Customer Support
            </h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              From AI-powered responses to seamless ticket management, {appName} provides comprehensive customer support solutions.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-foreground">
                  <Bot className="h-5 w-5 flex-none text-primary" />
                  AI-Powered Responses
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-muted-foreground">
                  <p className="flex-auto">Intelligent chatbot that understands context and provides accurate, helpful responses to customer inquiries.</p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-foreground">
                  <MessageSquare className="h-5 w-5 flex-none text-primary" />
                  Social Media Integration
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-muted-foreground">
                  <p className="flex-auto">Seamlessly integrate with Twitter and other social platforms to capture customer mentions and respond instantly.</p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex flex-col">
                  <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-foreground">
                    <Ticket className="h-5 w-5 flex-none text-primary" />
                    Smart Ticket Management
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-muted-foreground">
                    <p className="flex-auto">Automatically create support tickets from social media mentions and track customer interactions.</p>
                  </dd>
                </dt>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-foreground">
                  <Zap className="h-5 w-5 flex-none text-primary" />
                  Instant Response
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-muted-foreground">
                  <p className="flex-auto">Respond to customer inquiries in real-time, reducing wait times and improving satisfaction.</p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-foreground">
                  <Shield className="h-5 w-5 flex-none text-primary" />
                  Enterprise Security
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-muted-foreground">
                  <p className="flex-auto">Bank-level security with encrypted communications and secure data handling for enterprise customers.</p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-foreground">
                  <Globe className="h-5 w-5 flex-none text-primary" />
                  Multi-Language Support
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-muted-foreground">
                  <p className="flex-auto">Support customers in multiple languages with automatic translation and localization features.</p>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-background">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              Choose the plan that fits your business needs
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-y-6 sm:mt-20 sm:max-w-none sm:grid-cols-3">
            <Card className="relative">
              <CardHeader>
                <CardTitle>Starter</CardTitle>
                <CardDescription>Perfect for small businesses</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$29</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Up to 1,000 conversations/month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Basic AI responses</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Twitter integration</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Email support</span>
                  </li>
                </ul>
                <Link href="/auth/register" className="mt-6 block">
                  <Button className="w-full">Start Free Trial</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="relative border-primary">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
              </div>
              <CardHeader>
                <CardTitle>Professional</CardTitle>
                <CardDescription>Ideal for growing companies</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Up to 10,000 conversations/month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Advanced AI with custom training</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Multi-platform integration</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Priority support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Analytics dashboard</span>
                  </li>
                </ul>
                <Link href="/auth/register" className="mt-6 block">
                  <Button className="w-full bg-primary hover:bg-primary/90">Start Free Trial</Button>
                    </Link>
              </CardContent>
            </Card>

            <Card className="relative">
              <CardHeader>
                <CardTitle>Enterprise</CardTitle>
                <CardDescription>For large organizations</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">Custom</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Unlimited conversations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Custom AI model training</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Full platform integration</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Dedicated support team</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Custom integrations</span>
                  </li>
                </ul>
                <Button className="w-full mt-6" variant="outline">Contact Sales</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 bg-muted">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Trusted by Industry Leaders
            </h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              Join thousands of companies already using {appName}
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-y-8 sm:mt-20 sm:max-w-none sm:grid-cols-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">98%</div>
              <div className="text-muted-foreground">Customer Satisfaction</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">24/7</div>
              <div className="text-muted-foreground">Support Availability</div>
              </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">80%</div>
              <div className="text-muted-foreground">Faster Response Time</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">50+</div>
              <div className="text-muted-foreground">Languages Supported</div>
              </div>
            </div>
          </div>
        </section>

      {/* How It Works */}
      <section id="about" className="py-20 bg-background">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              Get started with {appName} in three simple steps
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-y-8 sm:mt-20 sm:max-w-none sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="mt-6 text-lg font-semibold text-foreground">Connect Your Social Media</h3>
              <p className="mt-2 text-muted-foreground">Integrate your Twitter account and other social platforms with our secure API.</p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <h3 className="mt-6 text-lg font-semibold text-foreground">AI Monitors Mentions</h3>
              <p className="mt-2 text-muted-foreground">Our AI automatically detects when customers mention your brand and creates support tickets.</p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h3 className="mt-6 text-lg font-semibold text-foreground">Engage & Resolve</h3>
              <p className="mt-2 text-muted-foreground">Chat with customers in real-time and resolve issues through our intuitive interface.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
              Ready to Transform Your Customer Support?
            </h2>
            <p className="mt-4 text-lg leading-8 text-primary-foreground/80">
              Join thousands of companies already using {appName} to provide exceptional customer service.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/auth/register">
                <Button size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                  Start Free Trial
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-primary-foreground border-primary-foreground hover:bg-primary-foreground/10">
                Schedule Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center">
                <Bot className="h-8 w-8 text-primary mr-2" />
                <span className="text-xl font-bold text-foreground">{appName}</span>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                AI-powered customer support that transforms how businesses interact with their customers.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Product</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">API</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Company</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li><a href="#about" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Support</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Community</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Status</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-border pt-8">
            <p className="text-sm text-muted-foreground text-center">
              © 2024 {appName}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
