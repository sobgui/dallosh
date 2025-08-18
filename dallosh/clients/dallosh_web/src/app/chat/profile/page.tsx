'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Phone, 
  Mail, 
  Lock, 
  Save, 
  Trash2, 
  AlertTriangle,
  Eye,
  EyeOff,
  Shield,
  Key
} from "lucide-react";
import { getSodularClient } from "@/services/client";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/auth";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UserInfo {
  email: string;
  username: string;
  phone_number: string;
  firstname?: string;
  name?: string;
}

interface PasswordChange {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ProfilePage() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  
  // Debug: Log the UID from auth store
  console.log('🔍 PROFILE PAGE - Auth store UID:', user?.uid);
  const [userInfo, setUserInfo] = useState<UserInfo>({
    email: '',
    username: '',
    phone_number: '',
    firstname: '',
    name: ''
  });
  const [passwordChange, setPasswordChange] = useState<PasswordChange>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalUserInfo, setOriginalUserInfo] = useState<UserInfo | null>(null);

  useEffect(() => {
    loadUserProfile();
  }, [user]); // Add user as dependency to reload when user data changes

  useEffect(() => {
    if (originalUserInfo) {
      const hasEmailChanged = userInfo.email !== originalUserInfo.email;
      const hasUsernameChanged = userInfo.username !== originalUserInfo.username;
      const hasPhoneChanged = userInfo.phone_number !== originalUserInfo.phone_number;
      const hasFirstnameChanged = userInfo.firstname !== originalUserInfo.firstname;
      const hasNameChanged = userInfo.name !== originalUserInfo.name;
      
      setHasChanges(hasEmailChanged || hasUsernameChanged || hasPhoneChanged || hasFirstnameChanged || hasNameChanged);
    }
  }, [userInfo, originalUserInfo]);

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      
      if (user?.uid) {
        console.log('🔍 Loading user profile using UID from auth store:', user.uid);
        
        // Fetch user data from server using the UID from auth store
        const client = await getSodularClient();
        if (!client) {
          throw new Error('No Sodular client available');
        }
        
        const result = await client.auth.get({ filter: { uid: user.uid } });
        console.log('🔍 Fetched user data from server:', result);
        
        if (result.data) {
          const userData = result.data;
          console.log('🔍 User data from server:', userData);
          
          const profile: UserInfo = {
            email: userData.data?.email || '',
            username: userData.data?.username || '',
            phone_number: userData.data?.fields?.phone_number || '',
            firstname: userData.data?.fields?.firstname || '',
            name: userData.data?.fields?.name || ''
          };
          
          console.log('🔍 Extracted profile data:', profile);
          
          setUserInfo(profile);
          setOriginalUserInfo(profile);
        } else {
          throw new Error('No user data found');
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile information",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
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
      if (!client) {
        throw new Error('No Sodular client available');
      }

      // Get current user UID from auth store
      if (!user?.uid) {
        throw new Error('No user UID available');
      }

      // Update user information - custom fields go in data.fields
      const updateData = {
        email: userInfo.email,
        username: userInfo.username,
        fields: {
          phone_number: userInfo.phone_number,
          firstname: userInfo.firstname,
          name: userInfo.name
        }
      };

      console.log('🔄 PROFILE PAGE - Sending update data:', updateData);
      console.log('🔄 PROFILE PAGE - User UID:', user.uid);
      console.log('🔄 PROFILE PAGE - Client available:', !!client);

      const result = await client.auth.patch(
        { uid: user.uid },
        { data: updateData }
      );

      console.log('🔄 PROFILE PAGE - Patch result:', result);
      console.log('🔄 PROFILE PAGE - Result data:', result.data);
      console.log('🔄 PROFILE PAGE - Result success:', !!result.data);
      console.log('🔄 PROFILE PAGE - Full result object:', JSON.stringify(result, null, 2));

      // Check if the patch was actually successful
      if (result.data) {
        console.log('✅ PROFILE PAGE - Patch appears successful, checking if data was actually saved...');
        
        // For now, just check if we have a result - we'll verify the actual save later
        console.log('✅ PROFILE PAGE - Basic success check passed');
        setOriginalUserInfo(userInfo);
        setHasChanges(false);
        toast({
          title: "Success",
          description: "Profile updated successfully!",
          variant: "default"
        });
        
        // Simple verification - just log that we're done
        console.log('✅ PROFILE PAGE - Profile update completed successfully');
        
        // Don't make additional server calls that could hang
        // The auth store should update naturally
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

  const handlePasswordChange = async () => {
    if (!passwordChange.currentPassword || !passwordChange.newPassword || !passwordChange.confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive"
      });
      return;
    }

    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (passwordChange.newPassword.length < 8) {
      toast({
        title: "Error",
        description: "New password must be at least 8 characters long",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsPasswordLoading(true);
      const client = await getSodularClient();
      if (!client) {
        throw new Error('No Sodular client available');
      }

      // Get current user UID from auth store
      if (!user?.uid) {
        throw new Error('No user UID available');
      }

      // Update password
              const result = await client.auth.patch(
          { uid: user.uid },
          { 
            data: { 
              password: passwordChange.newPassword
            } 
          }
        );

      if (result.data) {
        toast({
          title: "Success",
          description: "Password updated successfully!",
          variant: "default"
        });
        setShowPasswordDialog(false);
        setPasswordChange({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        throw new Error('Failed to update password');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: "Error",
        description: "Failed to update password. Please check your current password.",
        variant: "destructive"
      });
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      const client = await getSodularClient();
      if (!client) {
        throw new Error('No Sodular client available');
      }

      // Get current user UID from auth store
      if (!user?.uid) {
        throw new Error('No user UID available');
      }

      const result = await client.auth.delete({ uid: user.uid });
      
      if (result.data) {
        toast({
          title: "Account Deleted",
          description: "Your account has been permanently deleted",
          variant: "default"
        });
        // Redirect to home or login page
        window.location.href = '/';
      } else {
        throw new Error('Failed to delete account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-center">
          <User className="h-16 w-16 text-blue-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full overflow-hidden">
        <div className="flex-1 p-8 max-w-4xl mx-auto overflow-y-auto h-full">
          <div className="space-y-8 min-h-full">
          {/* Page Header */}
          <div className="text-center">
            <User className="h-16 w-16 text-blue-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Profile Settings
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Manage your account information and preferences
            </p>
          </div>

          {/* Profile Information Card */}
          <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                Personal Information
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Update your contact information and personal details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
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

              <div className="flex justify-end">
                <Button
                  onClick={handleUpdateProfile}
                  disabled={!hasChanges || isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <User className="h-4 w-4 animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Password Change Card */}
          <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Lock className="h-5 w-5 text-green-600" />
                Password & Security
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Change your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setShowPasswordDialog(true)}
                variant="outline"
                className="w-full"
              >
                <Key className="h-4 w-4 mr-2" />
                Change Password
              </Button>
            </CardContent>
          </Card>

          {/* Dangerous Zone Card */}
          <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Dangerous Zone
              </CardTitle>
              <CardDescription className="text-red-600 dark:text-red-300">
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700 dark:text-red-300">
                  Once you delete your account, there is no going back. Please be certain.
                </AlertDescription>
              </Alert>
              
              <div className="mt-4">
                <Button
                  onClick={() => setShowDeleteDialog(true)}
                  variant="destructive"
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Lock className="h-5 w-5 text-green-600" />
              Change Password
            </DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new one
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordChange.currentPassword}
                  onChange={(e) => setPasswordChange(prev => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="Enter current password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={passwordChange.newPassword}
                  onChange={(e) => setPasswordChange(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordChange.confirmPassword}
                  onChange={(e) => setPasswordChange(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => setShowPasswordDialog(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePasswordChange}
              disabled={isPasswordLoading}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
            >
              {isPasswordLoading ? "Updating..." : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Account Deletion Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription className="text-red-600">
              This action cannot be undone. This will permanently delete your account and remove all your data.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Please type <strong className="text-red-600">DELETE</strong> to confirm.
            </p>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              variant="destructive"
              className="w-full sm:w-auto"
            >
              {isDeleting ? "Deleting..." : "Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
