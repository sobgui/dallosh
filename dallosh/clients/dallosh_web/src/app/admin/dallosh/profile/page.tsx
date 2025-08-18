'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Mail, 
  Shield, 
  Save, 
  Edit, 
  X,
  Calendar,
  Clock
} from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { getSodularClient } from "@/services/client";
import { Label } from "@/components/ui/label";

export default function AdminProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [profile, setProfile] = useState({
    displayName: '',
    username: '',
    email: '',
    bio: '',
    imageUrl: '',
  });

  useEffect(() => {
    if (user) {
      setProfile({
        displayName: user.data.fields?.displayName || user.data.username || '',
        username: user.data.username || '',
        email: user.data.email || '',
        bio: user.data.fields?.bio || '',
        imageUrl: user.data.imageUrl || '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const client = await getSodularClient();
      if (!client) {
        alert("Connection error. Please try again.");
        return;
      }

      const updateData = {
        data: {
          username: profile.username,
          imageUrl: profile.imageUrl,
          fields: {
            displayName: profile.displayName,
            bio: profile.bio,
          },
        },
      };

      const result = await client.auth.patch({ uid: user.uid }, updateData);

      if (result.data) {
        console.log("Profile updated successfully!");
        
        // Update the auth store with fresh user data
        updateUser(result.data);
        
        setIsEditing(false);
        alert("Profile updated successfully!");
      } else {
        console.error("Failed to update profile:", result.error);
        alert("Failed to update profile. Please try again.");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Error updating profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    if (user) {
      setProfile({
        displayName: user.data.fields?.displayName || user.data.username || '',
        username: user.data.username || '',
        email: user.data.email || '',
        bio: user.data.fields?.bio || '',
        imageUrl: user.data.imageUrl || '',
      });
    }
    setIsEditing(false);
  };

  const getUserRole = () => {
    if (!user) return 'Unknown';
    
    if (user.data.email === 'admin@dallosh.com') {
      return 'Admin';
    }
    
    if (user.data.fields?.role === 'agent') {
      return 'Support Agent';
    }
    
    return 'User';
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 mb-4">User not found</div>
        <div className="text-gray-400">Please log in to view your profile.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Profile</h1>
          <p className="text-gray-400">Manage your account information and settings</p>
        </div>
        <div className="flex gap-3">
          {isEditing ? (
            <>
              <Button variant="ghost" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* Profile Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6 text-center">
              <Avatar className="h-24 w-24 mx-auto mb-4">
                <AvatarImage src={profile.imageUrl} alt={profile.displayName} />
                <AvatarFallback className="bg-gray-600 text-white text-2xl">
                  {(profile.displayName || profile.username || "U")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <h2 className="text-xl font-bold text-white mb-2">
                {profile.displayName || profile.username}
              </h2>
              
              <Badge className="mb-3">
                <Shield className="h-3 w-3 mr-1" />
                {getUserRole()}
              </Badge>
              
              <p className="text-gray-400 text-sm mb-4">
                @{profile.username}
              </p>
              
              {profile.bio && (
                <p className="text-gray-300 text-sm">{profile.bio}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Profile Details */}
        <div className="lg:col-span-2">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Profile Information</CardTitle>
              <CardDescription className="text-gray-400">
                Your account details and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="displayName" className="text-white">Display Name</Label>
                  <Input
                    id="displayName"
                    value={profile.displayName}
                    onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
                    disabled={!isEditing}
                    className="bg-gray-800 border-gray-700 text-white disabled:bg-gray-700 disabled:text-gray-300"
                  />
                </div>
                <div>
                  <Label htmlFor="username" className="text-white">Username</Label>
                  <Input
                    id="username"
                    value={profile.username}
                    onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value }))}
                    disabled={!isEditing}
                    className="bg-gray-800 border-gray-700 text-white disabled:bg-gray-700 disabled:text-gray-300"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email" className="text-white">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  disabled
                  className="bg-gray-700 border-gray-600 text-gray-300 cursor-not-allowed"
                />
                <p className="text-gray-400 text-xs mt-1">Email cannot be changed</p>
              </div>
              
              <div>
                <Label htmlFor="imageUrl" className="text-white">Profile Image URL</Label>
                <Input
                  id="imageUrl"
                  value={profile.imageUrl}
                  onChange={(e) => setProfile(prev => ({ ...prev, imageUrl: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="https://example.com/your-photo.jpg"
                  className="bg-gray-800 border-gray-700 text-white disabled:bg-gray-700 disabled:text-gray-300"
                />
              </div>
              
              <div>
                <Label htmlFor="bio" className="text-white">Bio</Label>
                <Input
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="Tell us about yourself..."
                  className="bg-gray-800 border-gray-700 text-white disabled:bg-gray-700 disabled:text-gray-300"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Account Information */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Account Information</CardTitle>
          <CardDescription className="text-gray-400">
            System information about your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-400">Created:</span>
                <span className="text-sm text-white">{formatDate(user.data.createdAt)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-400">Last Updated:</span>
                <span className="text-sm text-white">{formatDate(user.data.updatedAt)}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-400">Role:</span>
                <Badge variant="secondary">
                  {getUserRole()}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-400">Account Status:</span>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Active
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
