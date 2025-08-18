import { create } from 'zustand';
import { getSodularClient } from '@/services/client';
import { Ref } from '@/lib/sodular';

const defaultSettings = {
    system: true,
    general: { appName: "AutoScan", appDescription: "Industrial", timezone: "UTC", dateFormat: "MM/DD/YYYY", adminEmail: "", maintenanceMode: false },
    preferences: { primaryColor: "#3b82f6", secondaryColor: "#a855f7", thirdColor: "#f59e42", logoUrl: "" },
    ai: { tool: "AutoScan", prompt: "answer politely to my requests related to sodular cms, only use technicals information. Also act as personal sales representative, offer demos when needed" }
};

interface SettingsState {
  appName: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  fetchSettings: () => Promise<void>;
}

async function getOrCreateSettings(client: any): Promise<Ref | null> {
    let settingsCollection = await client.tables.get({ filter: { 'data.name': 'settings' } });
    if (!settingsCollection.data) {
        settingsCollection = await client.tables.create({ data: { name: 'settings', description: 'Application settings' } });
        if(!settingsCollection.data) return null;
    }
    const collectionId = settingsCollection.data.uid;

    let settings = await client.ref.from(collectionId).get({ filter: { 'data.system': true } });
    if (!settings.data) {
        settings = await client.ref.from(collectionId).create({ data: defaultSettings });
    }
    return settings.data;
}

function cleanAndEncodeUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  let cleanUrl = url.trim().replace(/\s+/g, '');
  if (cleanUrl && cleanUrl.includes('?')) {
    const [base, query] = cleanUrl.split('?');
    const params = new URLSearchParams(query);
    const encodedParams = Array.from(params.entries()).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    cleanUrl = `${base}?${encodedParams}`;
  }
  return cleanUrl;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  appName: defaultSettings.general.appName,
  logoUrl: cleanAndEncodeUrl(defaultSettings.preferences.logoUrl) || '',
  primaryColor: defaultSettings.preferences.primaryColor,
  accentColor: defaultSettings.preferences.secondaryColor,
  fetchSettings: async () => {
    try {
      const client = await getSodularClient();
      if (!client) {
        console.warn("Sodular client not ready, using default settings.");
        return;
      }
      const settings = await getOrCreateSettings(client);
      if (settings?.data) {
        set({
          appName: settings.data.general?.appName || defaultSettings.general.appName,
          logoUrl: cleanAndEncodeUrl(settings.data.preferences?.logoUrl || defaultSettings.preferences.logoUrl) || '',
          primaryColor: settings.data.preferences?.primaryColor || defaultSettings.preferences.primaryColor,
          accentColor: settings.data.preferences?.secondaryColor || defaultSettings.preferences.secondaryColor,
        });
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      // Fallback to default settings in case of error
      set({
        appName: defaultSettings.general.appName,
        logoUrl: cleanAndEncodeUrl(defaultSettings.preferences.logoUrl) || '',
        primaryColor: defaultSettings.preferences.primaryColor,
        accentColor: defaultSettings.preferences.secondaryColor,
      });
    }
  },
}));
