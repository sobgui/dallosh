'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  Save, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Settings,
  AlertCircle,
  CheckCircle,
  Loader2
} from "lucide-react";
import { getSodularClient } from "@/services/client";
import { useToast } from "@/hooks/use-toast";

// Default system instructions (fallback)
const DEFAULT_SYSTEM_INSTRUCTIONS = `You are a helpful AI assistant working for a telecom network company named 'Free Mobile'. 
You are a customer service agent. 
You are responsible for answering questions and helping customers with their issues.

IMPORTANT RULES:
1. Keep responses concise and natural for voice realtime conversation with a customer.
2. Be helpful, friendly, and engaging. Also put some comma (,) to make pauses to make it sound more natural for the voice.
3. Avoid long responses, keep it short for voice realtime conversation and to the point, avoid using emojis, avoid using markdown or bullet point or numbered list, avoid using special characters, avoid using html tags, avoid using bold, italic, underline, etc.

NOTE: During your exchange with the user, sometimes the user could tell you that he needs to make a request or want to discuss with the real agent to intervene, 
you respond by asking what kind of issue the user wants the agent to intervene if his previous message did not mention it, then you should call the function 'send_user_request' to create a new request in the database to notify the agent.
You will do it once, you must not duplicate the request if the user ask you to do it again or if it does not exist already.`;

interface BotConfig {
  system_instructions: string;
  fields: Record<string, string>;
}

interface BotSettingsData {
  uid: string;
  data: BotConfig;
}

export default function BotSettingsPage() {
  const { toast } = useToast();
  const [botConfig, setBotConfig] = useState<BotConfig>({
    system_instructions: DEFAULT_SYSTEM_INSTRUCTIONS,
    fields: {}
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false); // Prevent multiple simultaneous initializations
  const [tableUID, setTableUID] = useState<string | null>(null);
  const [documentUID, setDocumentUID] = useState<string | null>(null);
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [originalConfig, setOriginalConfig] = useState<BotConfig | null>(null);

  // Load bot settings from database
  useEffect(() => {
    if (!isInitializing && !tableUID) {
      loadBotSettings();
    }
  }, [isInitializing, tableUID]);

  // Check for changes
  useEffect(() => {
    if (originalConfig) {
      const hasSystemInstructionsChanged = botConfig.system_instructions !== originalConfig.system_instructions;
      const hasFieldsChanged = JSON.stringify(botConfig.fields) !== JSON.stringify(originalConfig.fields);
      setHasChanges(hasSystemInstructionsChanged || hasFieldsChanged);
    }
  }, [botConfig, originalConfig]);

  const loadBotSettings = async () => {
    // Prevent multiple simultaneous initializations
    if (isInitializing) {
      console.log('⚠️ Already initializing, skipping...');
      return;
    }
    
    try {
      setIsInitializing(true);
      setIsLoading(true);
      const client = await getSodularClient();
      if (!client) {
        throw new Error('No Sodular client available');
      }

      // First, try to get existing bot_settings table
      console.log('🔍 Checking for existing bot_settings table...');
      let botSettingsTable = await client.tables.get({ filter: { 'data.name': 'bot_settings' } });
      
      if (!botSettingsTable.data) {
        // Double-check with a more specific filter to avoid duplicates
        console.log('🔍 No table found, checking if it might exist with different criteria...');
        
        // Try to get all tables and filter by name to be extra sure
        const allTables = await client.tables.query({ take: 100 });
        const existingTable = allTables.data?.list?.find(table => 
          table.data?.name === 'bot_settings'
        );
        
        if (existingTable) {
          console.log('✅ Found existing bot_settings table with UID:', existingTable.uid);
          botSettingsTable = { data: existingTable };
        } else {
          // Only create if we're absolutely sure it doesn't exist
          console.log('📋 Creating bot_settings table...');
          const tableSchema = {
            name: 'bot_settings',
            description: 'Bot configuration settings',
            fields: [
              { name: 'system_instructions', type: 'text', required: true },
              { name: 'fields', type: 'json', required: true }
            ],
          };

          const createResult = await client.tables.create({ data: tableSchema });
          if (createResult.data?.uid) {
            botSettingsTable = createResult;
            console.log('✅ bot_settings table created with UID:', createResult.data.uid);
          } else {
            throw new Error('Failed to create bot_settings table');
          }
        }
      } else {
        console.log('✅ Found existing bot_settings table with UID:', botSettingsTable.data.uid);
      }

      if (!botSettingsTable.data?.uid) {
        throw new Error('Failed to get bot_settings table UID');
      }
      
      setTableUID(botSettingsTable.data.uid);

      // Query for existing bot settings
      const result = await client.ref.from(botSettingsTable.data.uid).query({ take: 1 });
      
             if (result.data?.list && result.data.list.length > 0) {
         // Use existing settings
         const existingSettings = result.data.list[0];
         const config: BotConfig = {
           system_instructions: existingSettings.data.system_instructions || DEFAULT_SYSTEM_INSTRUCTIONS,
           fields: existingSettings.data.fields || {}
         };
         
         setDocumentUID(existingSettings.uid);
         setBotConfig(config);
         setOriginalConfig(config);
         console.log('✅ Loaded existing bot settings:', config);
       } else {
        // Create default settings
        console.log('📝 Creating default bot settings...');
        const defaultConfig: BotConfig = {
          system_instructions: DEFAULT_SYSTEM_INSTRUCTIONS,
          fields: {}
        };
        
        if (!botSettingsTable.data?.uid) {
          throw new Error('Failed to get bot_settings table UID for creating default settings');
        }
        
        const createResult = await client.ref.from(botSettingsTable.data.uid).create({
          data: defaultConfig
        });
        
                 if (createResult.data) {
           setDocumentUID(createResult.data.uid);
           setBotConfig(defaultConfig);
           setOriginalConfig(defaultConfig);
           console.log('✅ Created default bot settings');
         } else {
          throw new Error('Failed to create default bot settings');
        }
      }
    } catch (error) {
      console.error('❌ Error loading bot settings:', error);
      toast({
        title: "Error",
        description: "Failed to load bot settings",
        variant: "destructive"
      });
      
      // Fallback to default config
      const fallbackConfig: BotConfig = {
        system_instructions: DEFAULT_SYSTEM_INSTRUCTIONS,
        fields: {}
      };
      setBotConfig(fallbackConfig);
      setOriginalConfig(fallbackConfig);
    } finally {
      setIsLoading(false);
      setIsInitializing(false);
    }
  };

     const saveBotSettings = async () => {
     if (!documentUID) {
       toast({
         title: "Error",
         description: "No document UID available",
         variant: "destructive"
       });
       return;
     }

    try {
      setIsSaving(true);
      const client = await getSodularClient();
      if (!client) {
        throw new Error('No Sodular client available');
      }

             // Update existing settings
       const result = await client.ref.from(tableUID!).patch({ uid: documentUID! }, { data: botConfig });

      if (result.data) {
        setOriginalConfig(botConfig);
        setHasChanges(false);
        toast({
          title: "Success",
          description: "Bot settings saved successfully!",
          variant: "default"
        });
        console.log('✅ Bot settings saved:', botConfig);
      } else {
        throw new Error('Failed to save bot settings');
      }
    } catch (error) {
      console.error('❌ Error saving bot settings:', error);
      toast({
        title: "Error",
        description: "Failed to save bot settings",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefault = () => {
    const defaultConfig: BotConfig = {
      system_instructions: DEFAULT_SYSTEM_INSTRUCTIONS,
      fields: {}
    };
    setBotConfig(defaultConfig);
    setHasChanges(true);
    toast({
      title: "Info",
      description: "Reset to default settings",
      variant: "default"
    });
  };

  const addDynamicField = () => {
    if (!newFieldKey.trim() || !newFieldValue.trim()) {
      toast({
        title: "Error",
        description: "Please enter both key and value",
        variant: "destructive"
      });
      return;
    }

    if (botConfig.fields[newFieldKey.trim()]) {
      toast({
        title: "Error",
        description: "Field key already exists",
        variant: "destructive"
      });
      return;
    }

    setBotConfig(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [newFieldKey.trim()]: newFieldValue.trim()
      }
    }));

    setNewFieldKey('');
    setNewFieldValue('');
          toast({
        title: "Success",
        description: "Dynamic field added",
        variant: "default"
      });
  };

  const removeDynamicField = (key: string) => {
    setBotConfig(prev => {
      const newFields = { ...prev.fields };
      delete newFields[key];
      return {
        ...prev,
        fields: newFields
      };
    });
    toast({
      title: "Success",
      description: "Dynamic field removed",
      variant: "default"
    });
  };

  const updateDynamicField = (key: string, value: string) => {
    setBotConfig(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [key]: value
      }
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-400" />
          <p className="text-gray-400">Loading bot settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Bot Settings</h1>
          <p className="text-gray-400">Configure your AI assistant's behavior and responses</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={resetToDefault}
            disabled={isSaving}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
          <Button 
            onClick={saveBotSettings}
            disabled={!hasChanges || isSaving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
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
      </div>

      {/* System Instructions */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-400" />
            System Instructions
          </CardTitle>
          <CardDescription className="text-gray-400">
            Define how your AI assistant should behave and respond to users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="system-instructions" className="text-white mb-2 block">
                AI Behavior Instructions
              </Label>
              <Textarea
                id="system-instructions"
                value={botConfig.system_instructions}
                onChange={(e) => setBotConfig(prev => ({
                  ...prev,
                  system_instructions: e.target.value
                }))}
                placeholder="Enter system instructions for your AI assistant..."
                className="min-h-[200px] bg-gray-800 border-gray-700 text-white resize-none"
                rows={10}
              />
              <p className="text-sm text-gray-400 mt-2">
                These instructions define the AI's personality, behavior, and response style.
              </p>
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <AlertCircle className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-blue-300">
                Changes to system instructions will take effect immediately for new conversations.
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dynamic Fields */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="h-5 w-5 text-green-400" />
            Dynamic Configuration Fields
          </CardTitle>
          <CardDescription className="text-gray-400">
            Add custom key-value pairs for dynamic bot configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Add New Field */}
            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-4">Add New Field</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="field-key" className="text-white mb-2 block">Field Key</Label>
                  <Input
                    id="field-key"
                    value={newFieldKey}
                    onChange={(e) => setNewFieldKey(e.target.value)}
                    placeholder="e.g., max_response_length"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="field-value" className="text-white mb-2 block">Field Value</Label>
                  <Input
                    id="field-value"
                    value={newFieldValue}
                    onChange={(e) => setNewFieldValue(e.target.value)}
                    placeholder="e.g., 150"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>
              <Button 
                onClick={addDynamicField}
                className="mt-4 bg-green-600 hover:bg-green-700"
                disabled={!newFieldKey.trim() || !newFieldValue.trim()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </div>

            {/* Existing Fields */}
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Current Fields</h4>
              {Object.keys(botConfig.fields).length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Settings className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                  <p>No dynamic fields configured yet</p>
                  <p className="text-sm">Add fields above to customize your bot's behavior</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(botConfig.fields).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="bg-blue-600 text-white">
                            {key}
                          </Badge>
                        </div>
                        <Input
                          value={value}
                          onChange={(e) => updateDynamicField(key, e.target.value)}
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDynamicField(key)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-sm text-green-300">
                Dynamic fields allow you to configure bot behavior without changing code.
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Preview */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-400" />
            Configuration Preview
          </CardTitle>
          <CardDescription className="text-gray-400">
            Preview of the current bot configuration that will be sent to the AI server
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-3">System Instructions Preview</h4>
              <div className="bg-gray-900 p-3 rounded border border-gray-600">
                <p className="text-gray-300 text-sm whitespace-pre-wrap">
                  {botConfig.system_instructions}
                </p>
              </div>
            </div>

            {Object.keys(botConfig.fields).length > 0 && (
              <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                <h4 className="text-lg font-semibold text-white mb-3">Dynamic Fields Preview</h4>
                <div className="bg-gray-900 p-3 rounded border border-gray-600">
                  <pre className="text-gray-300 text-sm overflow-x-auto">
                    {JSON.stringify(botConfig.fields, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            <div className="p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
              <h4 className="text-lg font-semibold text-white mb-2">Server Payload Structure</h4>
              <div className="bg-gray-900 p-3 rounded border border-gray-600">
                <pre className="text-gray-300 text-sm overflow-x-auto">
{`{
  "bot_settings": {
    "system_instructions": "${botConfig.system_instructions.substring(0, 50)}...",
    "fields": ${JSON.stringify(botConfig.fields, null, 2)}
  }
}`}
                </pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Status */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 bg-yellow-600 text-white px-4 py-3 rounded-lg shadow-lg border border-yellow-500">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>You have unsaved changes</span>
          </div>
        </div>
      )}
    </div>
  );
}
