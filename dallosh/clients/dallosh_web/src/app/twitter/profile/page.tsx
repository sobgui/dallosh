'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/stores/auth";
import { getSodularClient } from "@/services/client";
import { ArrowLeft, User, Mail, FileText, Save, Upload } from "lucide-react";
import { useRouter } from "next/navigation";

interface UserProfile {
  username: string;
  email: string;
  displayName: string;
  bio?: string;
  imageUrl?: string;
  location?: string;
  website?: string;
}

export default function ProfilePage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [profile, setProfile] = useState<UserProfile>({
    username: '',
    email: '',
    displayName: '',
    bio: '',
    imageUrl: '',
    location: '',
    website: ''
  });

  // Track original values to detect changes
  const [originalProfile, setOriginalProfile] = useState<UserProfile>({
    username: '',
    email: '',
    displayName: '',
    bio: '',
    imageUrl: '',
    location: '',
    website: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load user profile data using auth module
  useEffect(() => {
    if (user) {
      const loadProfile = async () => {
        setIsLoading(true);
        try {
          const client = await getSodularClient();
          if (!client) {
            console.error("Failed to get Sodular client");
            return;
          }

          console.log("Loading user profile using auth module...");
          
          // Use auth module to get current user data
          const userResult = await client.auth.get({ filter: { uid: user.uid } });
          
          if (userResult.data) {
            const userData = userResult.data.data;
            console.log("Loaded user data:", userData);
            
            const profileData = {
              username: userData.username || '',
              email: userData.email || '',
              displayName: userData.fields?.displayName || userData.fields?.name || userData.username || '',
              bio: userData.fields?.bio || '',
              imageUrl: userData.imageUrl || '',
              location: userData.fields?.location || '',
              website: userData.fields?.website || ''
            };
            setProfile(profileData);
            setOriginalProfile(profileData);
          } else {
            console.log("No user data found, using current user from auth store");
            // Fallback to auth store data
            const fallbackData = {
              username: user.data.username || '',
              email: user.data.email || '',
              displayName: user.data.fields?.displayName || user.data.fields?.name || user.data.username || '',
              bio: user.data.fields?.bio || '',
              imageUrl: user.data.imageUrl || '',
              location: user.data.fields?.location || '',
              website: user.data.fields?.website || ''
            };
            setProfile(fallbackData);
            setOriginalProfile(fallbackData);
          }
        } catch (error) {
          console.error("Error loading profile:", error);
          // Fallback to auth store data on error
          const errorFallbackData = {
            username: user.data.username || '',
            email: user.data.email || '',
            displayName: user.data.fields?.displayName || user.data.fields?.name || user.data.username || '',
            bio: user.data.fields?.bio || '',
            imageUrl: user.data.imageUrl || '',
            location: user.data.fields?.location || '',
            website: user.data.fields?.website || ''
          };
          setProfile(errorFallbackData);
          setOriginalProfile(errorFallbackData);
        } finally {
          setIsLoading(false);
        }
      };

      loadProfile();
    }
  }, [user]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Only validate username as required field
    if (!profile.username.trim()) {
      newErrors.username = "Username is required";
    } else if (profile.username.length < 2) {
      newErrors.username = "Username must be at least 2 characters";
    } else if (profile.username.length > 50) {
      newErrors.username = "Username must not exceed 50 characters";
    }

    // Optional field validations (only if provided)
    if (profile.bio && profile.bio.length > 160) {
      newErrors.bio = "Bio must be 160 characters or less";
    }

    if (profile.website && profile.website.trim() && !profile.website.match(/^https?:\/\/.+/)) {
      newErrors.website = "Website must start with http:// or https://";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm() || !user) return;

    setIsSaving(true);
    try {
      const client = await getSodularClient();
      if (!client) {
        alert("Connection error. Please try again.");
        return;
      }

      // Build update data with only changed fields
      const updateData: any = {};
      
      // Check core fields (username, imageUrl)
      if (profile.username.trim() !== originalProfile.username) {
        updateData.username = profile.username.trim();
      }
      
      if (profile.imageUrl?.trim() !== originalProfile.imageUrl) {
        updateData.imageUrl = profile.imageUrl?.trim() || '';
      }

      // Build fields object only with changed custom fields
      const currentCustomFields: Record<string, string> = {};
      const originalCustomFields: Record<string, string> = {};
      
      // Current values
      if (profile.displayName?.trim()) currentCustomFields.displayName = profile.displayName.trim();
      if (profile.bio?.trim()) currentCustomFields.bio = profile.bio.trim();
      if (profile.location?.trim()) currentCustomFields.location = profile.location.trim();
      if (profile.website?.trim()) currentCustomFields.website = profile.website.trim();
      
      // Original values
      if (originalProfile.displayName?.trim()) originalCustomFields.displayName = originalProfile.displayName.trim();
      if (originalProfile.bio?.trim()) originalCustomFields.bio = originalProfile.bio.trim();
      if (originalProfile.location?.trim()) originalCustomFields.location = originalProfile.location.trim();
      if (originalProfile.website?.trim()) originalCustomFields.website = originalProfile.website.trim();

      // Check if custom fields changed
      const fieldsChanged = JSON.stringify(currentCustomFields) !== JSON.stringify(originalCustomFields);
      
      if (fieldsChanged) {
        updateData.fields = currentCustomFields;
      }

      // If no changes detected, don't make API call
      if (Object.keys(updateData).length === 0) {
        alert("No changes detected.");
        setIsSaving(false);
        return;
      }

      console.log("Updating profile using auth module with changed data only:", updateData);

      // Use auth module to update user profile
      const result = await client.auth.patch(
        { uid: user.uid }, 
        { data: updateData }
      );

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.data) {
        console.log("✅ Profile updated successfully!");
        
        // Get updated user data
        const userResult = await client.auth.get({ filter: { uid: user.uid } });
        if (userResult.data) {
          // Update the auth store with fresh user data
          useAuthStore.getState().updateUser(userResult.data);
          
          // Update original profile to new values
          setOriginalProfile({ ...profile });
        }
        
        alert("Profile updated successfully!");
      } else {
        console.error("Failed to update profile:", result);
        alert("Failed to update profile. Please try again.");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert(`Error updating profile: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Check if there are any changes
  const hasChanges = () => {
    return JSON.stringify(profile) !== JSON.stringify(originalProfile);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Please log in to view your profile.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 bg-black bg-opacity-80 backdrop-blur-md border-b border-gray-800 z-10">
        <div className="flex items-center gap-4 px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-white hover:bg-gray-800 p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Edit Profile</h1>
            <p className="text-sm text-gray-400">Update your profile information</p>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <div className="max-w-2xl mx-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.imageUrl} alt={profile.displayName} />
                  <AvatarFallback className="bg-gray-600 text-white text-xl">
                    {(profile.displayName || profile.username || "U")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Profile Image URL
                  </label>
                  <Input
                    value={profile.imageUrl}
                    onChange={(e) => handleInputChange('imageUrl', e.target.value)}
                    placeholder="https://example.com/your-photo.jpg"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Username *
                </label>
                <Input
                  value={profile.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="your_username"
                  className={`bg-gray-800 border-gray-700 text-white ${
                    errors.username ? 'border-red-500' : ''
                  }`}
                />
                {errors.username && (
                  <p className="text-red-400 text-sm mt-1">{errors.username}</p>
                )}
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Display Name
                </label>
                <Input
                  value={profile.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  placeholder="Your Display Name (optional)"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Email
                </label>
                <Input
                  type="email"
                  value={profile.email}
                  readOnly
                  className="bg-gray-700 border-gray-600 text-gray-300 cursor-not-allowed"
                />
                <p className="text-gray-400 text-xs mt-1">Email cannot be changed</p>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <FileText className="h-4 w-4 inline mr-2" />
                  Bio
                </label>
                <Textarea
                  value={profile.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Tell us about yourself... (optional)"
                  maxLength={160}
                  className={`bg-gray-800 border-gray-700 text-white resize-none ${
                    errors.bio ? 'border-red-500' : ''
                  }`}
                  rows={3}
                />
                <div className="flex justify-between mt-1">
                  <div>
                    {errors.bio && (
                      <p className="text-red-400 text-sm">{errors.bio}</p>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm">
                    {profile.bio?.length || 0}/160
                  </p>
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Location
                </label>
                <Input
                  value={profile.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="City, Country (optional)"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              {/* Website */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Website
                </label>
                <Input
                  value={profile.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="https://yourwebsite.com (optional)"
                  className={`bg-gray-800 border-gray-700 text-white ${
                    errors.website ? 'border-red-500' : ''
                  }`}
                />
                {errors.website && (
                  <p className="text-red-400 text-sm mt-1">{errors.website}</p>
                )}
              </div>

              {/* Save Button */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <Button
                  variant="ghost"
                  onClick={() => router.back()}
                  className="text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges()}
                  className="bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50"
                >
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
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
