'use client';

import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/auth";
import { getSodularClient } from "@/services/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, User, Phone, Mail, AlertTriangle, Lock, Eye, Zap, Trash } from "lucide-react";

// Cookie utility functions
const setCookie = (name: string, value: string, days: number) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  const cookieString = `${name}=${value};expires=${expires.toUTCString()};path=/`;
  document.cookie = cookieString;
  console.log('🍪 Setting cookie:', cookieString);
  console.log('🍪 All cookies after set:', document.cookie);
};

const getCookie = (name: string): string | null => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  console.log('🍪 Getting cookie:', name, 'from:', document.cookie);
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      const value = c.substring(nameEQ.length, c.length);
      console.log('🍪 Found cookie:', name, '=', value);
      return value;
    }
  }
  console.log('🍪 Cookie not found:', name);
  return null;
};

const deleteCookie = (name: string) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};

interface UserInfo {
  email: string;
  username: string;
  phone_number: string;
  firstname?: string;
  name?: string;
}

interface SecurityWrapperProps {
  children: React.ReactNode;
}

export default function SecurityWrapper({ children }: SecurityWrapperProps) {
  const { toast } = useToast();
  const { user } = useAuthStore();
  
  // Security state
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showUserInfoModal, setShowUserInfoModal] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [hasCompletedProfile, setHasCompletedProfile] = useState(false);
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // User info state
  const [userInfo, setUserInfo] = useState<UserInfo>({
    email: '',
    username: '',
    phone_number: '',
    firstname: '',
    name: ''
  });

  // Check security whenever user changes or component mounts
  useEffect(() => {
    if (user?.uid) {
      // Always check cookies first - this is the source of truth
      const accepted = getCookie('chat_terms_accepted');
      const profileCompleted = getCookie('chat_profile_completed');
      
      console.log('🔒 Checking cookies - Terms:', accepted, 'Profile:', profileCompleted);
      console.log('🔒 All cookies:', document.cookie);
      
      if (accepted === 'true') {
        setHasAcceptedTerms(true);
        
        if (profileCompleted === 'true') {
          setHasCompletedProfile(true);
        } else {
          // Check profile from database
          checkUserProfile();
        }
      } else {
        setShowTermsModal(true);
      }
    }
  }, [user?.uid]); // Run when user changes



  const checkUserProfile = async () => {
    if (isCheckingProfile || hasCompletedProfile) return;
    
    setIsCheckingProfile(true);
    
    try {
      if (user?.uid) {
        console.log('🔍 Checking user profile for UID:', user.uid);
        
        const client = await getSodularClient();
        if (!client) {
          throw new Error('No Sodular client available');
        }
        
        const result = await client.auth.get({ filter: { uid: user.uid } });
        console.log('🔍 User data result:', result);
        
        if (result.data) {
          const userData = result.data;
          console.log('🔍 User data:', userData);
          console.log('🔍 Phone number exists:', !!userData.data?.fields?.phone_number);
          
          // Check if phone number exists
          if (!userData.data?.fields?.phone_number) {
            console.log('📱 Phone number missing, showing profile modal');
            // Reset profile completion status
            setHasCompletedProfile(false);
            deleteCookie('chat_profile_completed');
            
            // Pre-fill form with existing data
            const existingData = {
              email: userData.data?.email || '',
              username: userData.data?.username || '',
              phone_number: '',
              firstname: userData.data?.fields?.firstname || '',
              name: userData.data?.fields?.name || ''
            };
            
            setUserInfo(existingData);
            setShowUserInfoModal(true);
          } else {
            console.log('✅ Phone number exists, profile complete');
            setHasCompletedProfile(true);
            setCookie('chat_profile_completed', 'true', 365); // 1 year expiry
          }
        }
      }
    } catch (error) {
      console.error('Error checking user profile:', error);
    } finally {
      setIsCheckingProfile(false);
    }
  };

  const handleAcceptTerms = () => {
    console.log('✅ User accepted terms, updating cookies and state');
    setCookie('chat_terms_accepted', 'true', 365); // 1 year expiry
    setHasAcceptedTerms(true);
    setShowTermsModal(false);
    // Check profile after accepting terms
    if (user?.uid) {
      checkUserProfile();
    }
  };

  const handleRejectTerms = () => {
    window.location.href = '/twitter';
  };

  const handleCancelProfile = () => {
    if (confirm('Are you sure you want to cancel? You must complete your profile to use the chat service. You will be redirected to Twitter.')) {
      // Only delete profile cookie, keep terms accepted
      deleteCookie('chat_profile_completed');
      window.location.href = '/twitter';
    }
  };

  const handleUpdateUserInfo = async () => {
    if (!userInfo.email || !userInfo.username || !userInfo.phone_number) {
      toast({
        title: "Error",
        description: "Please fill in all required fields (email, username, phone number)",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      const client = await getSodularClient();
      if (!client || !user?.uid) {
        throw new Error('No client or user available');
      }

      const updateData = {
        email: userInfo.email,
        username: userInfo.username,
        fields: {
          phone_number: userInfo.phone_number,
          firstname: userInfo.firstname,
          name: userInfo.name
        }
      };

      const result = await client.auth.patch(
        { uid: user.uid },
        { data: updateData }
      );

      if (result.data) {
        setHasCompletedProfile(true);
        setCookie('chat_profile_completed', 'true', 365); // 1 year expiry
        setShowUserInfoModal(false);
        toast({
          title: "Success",
          description: "Profile updated successfully!",
          variant: "default"
        });
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render children until security checks pass
  if (!hasAcceptedTerms || !hasCompletedProfile) {
    return (
      <>
        {/* Terms & Conditions Modal */}
        <Dialog open={showTermsModal} onOpenChange={() => {}} modal={true}>
          <DialogContent 
            className="max-w-4xl max-h-[90vh] overflow-y-auto"
            onPointerDownOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
                <Shield className="h-6 w-6 text-blue-600" />
                Terms & Conditions & Privacy Policy
              </DialogTitle>
              <DialogDescription className="text-center text-lg">
                Please read and accept our terms before using our AI chat service
              </DialogDescription>
              <div className="text-center text-sm text-red-600 dark:text-red-400 mt-2 font-medium">
                ⚠️ This dialog cannot be closed. You must accept or reject the terms to continue.
              </div>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Terms Section */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Lock className="h-5 w-5 text-green-600" />
                  Terms of Service
                </h3>
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-3">
                  <p>
                    By using our AI chat service, you agree to the following terms:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Our AI assistant is designed to provide helpful customer support</li>
                    <li>You may request human intervention when needed through our request system</li>
                    <li>We reserve the right to terminate service for misuse or abuse</li>
                    <li>Our service is provided "as is" without warranties</li>
                    <li>You must be at least 13 years old to use this service</li>
                  </ul>
                </div>
              </div>

              {/* GDPR & Data Collection Section */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Eye className="h-5 w-5 text-purple-600" />
                  Data Collection & Privacy (GDPR Compliant)
                </h3>
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-3">
                  <p>
                    We collect and process the following data to improve our customer service:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">Personal Information:</h4>
                      <ul className="list-disc pl-4 space-y-1 text-xs">
                        <li>Email address (for account management)</li>
                        <li>Phone number (for contact purposes)</li>
                        <li>Username/social media handle</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">Service Usage Data:</h4>
                      <ul className="list-disc pl-4 space-y-1 text-xs">
                        <li>Chat messages and conversations</li>
                        <li>Support requests and tickets</li>
                        <li>Feedback and ratings</li>
                        <li>Service interaction timestamps</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Usage Section */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-600" />
                  How We Use Your Data
                </h3>
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-3">
                  <p>Your data is used exclusively for:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Providing and improving customer support services</li>
                    <li>Training our AI to better assist customers</li>
                    <li>Analyzing service quality and user satisfaction</li>
                    <li>Resolving technical issues and bugs</li>
                    <li>Complying with legal obligations</li>
                  </ul>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    We do not sell, rent, or share your personal data with third parties for marketing purposes.
                  </p>
                </div>
              </div>

              {/* User Rights Section */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Trash className="h-5 w-5 text-red-600" />
                  Your Rights (GDPR Article 15-22)
                </h3>
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-3">
                  <p>Under GDPR, you have the right to:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Access:</strong> Request a copy of all data we hold about you</li>
                    <li><strong>Rectification:</strong> Correct inaccurate or incomplete data</li>
                    <li><strong>Erasure:</strong> Request deletion of your personal data</li>
                    <li><strong>Portability:</strong> Receive your data in a structured format</li>
                    <li><strong>Objection:</strong> Object to processing of your data</li>
                    <li><strong>Restriction:</strong> Limit how we process your data</li>
                  </ul>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    To exercise these rights, contact us at privacy@freemobile.com
                  </p>
                </div>
              </div>

              {/* Data Retention Section */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Data Retention
                </h3>
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-3">
                  <p>We retain your data for:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Active accounts:</strong> Duration of your account plus 2 years</li>
                    <li><strong>Inactive accounts:</strong> 3 years after last activity</li>
                    <li><strong>Legal requirements:</strong> As required by applicable law</li>
                  </ul>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Data is automatically deleted after retention periods expire.
                  </p>
                </div>
              </div>

              {/* Security Section */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Data Security
                </h3>
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-3">
                  <p>We implement industry-standard security measures:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>End-to-end encryption for all communications</li>
                    <li>Secure data centers with access controls</li>
                    <li>Regular security audits and penetration testing</li>
                    <li>Employee training on data protection</li>
                    <li>Incident response procedures</li>
                  </ul>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={handleRejectTerms}
                className="w-full sm:w-auto bg-red-50 hover:bg-red-100 text-red-700 border-red-200 hover:border-red-300"
              >
                Reject & Go to Twitter
              </Button>
              <Button
                onClick={handleAcceptTerms}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
              >
                Accept Terms & Continue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* User Information Modal */}
        <Dialog open={showUserInfoModal} onOpenChange={() => {}} modal={true}>
          <DialogContent 
            className="max-w-2xl"
            onPointerDownOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
                <User className="h-6 w-6 text-blue-600" />
                Complete Your Profile
              </DialogTitle>
              <DialogDescription className="text-center">
                Please provide your contact information to continue using our service
              </DialogDescription>
              <div className="text-center text-sm text-red-600 dark:text-red-400 mt-2 font-medium">
                ⚠️ This dialog cannot be closed. You must complete your profile or cancel to continue.
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={userInfo.email}
                    onChange={(e) => setUserInfo(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium">
                    Username <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="username"
                    value={userInfo.username}
                    onChange={(e) => setUserInfo(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="username"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number" className="text-sm font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone_number"
                  type="tel"
                  value={userInfo.phone_number}
                  onChange={(e) => setUserInfo(prev => ({ ...prev, phone_number: e.target.value }))}
                  placeholder="+33 6 12 34 56 78"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstname" className="text-sm font-medium">
                    First Name <span className="text-gray-400">(Optional)</span>
                  </Label>
                  <Input
                    id="firstname"
                    value={userInfo.firstname}
                    onChange={(e) => setUserInfo(prev => ({ ...prev, firstname: e.target.value }))}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Last Name <span className="text-gray-400">(Optional)</span>
                  </Label>
                  <Input
                    id="name"
                    value={userInfo.name}
                    onChange={(e) => setUserInfo(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Doe"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={handleCancelProfile}
                className="w-full sm:w-auto bg-red-50 hover:bg-red-100 text-red-700 border-red-200 hover:border-red-300"
              >
                Cancel & Go to Twitter
              </Button>
              <Button
                onClick={handleUpdateUserInfo}
                disabled={isLoading}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? "Updating..." : "Update Profile & Continue"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

                 {/* Loading state while checking security */}
         <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white dark:bg-black">
           <div className="text-center">
             <Shield className="h-16 w-16 text-blue-500 mx-auto mb-4 animate-pulse" />
             <p className="text-gray-600 dark:text-gray-400">Checking security requirements...</p>
             
             {/* Debug info */}
             <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded text-xs text-left">
               <p><strong>Debug Info:</strong></p>
               <p>Terms Cookie: {getCookie('chat_terms_accepted') || 'null'}</p>
               <p>Profile Cookie: {getCookie('chat_profile_completed') || 'null'}</p>
               <p>All Cookies: {document.cookie || 'none'}</p>
               <p>User UID: {user?.uid || 'null'}</p>
               <p>Has Accepted Terms: {hasAcceptedTerms.toString()}</p>
               <p>Has Completed Profile: {hasCompletedProfile.toString()}</p>
             </div>
           </div>
         </div>
      </>
    );
  }

  // Security checks passed, render children
  return <>{children}</>;
}
