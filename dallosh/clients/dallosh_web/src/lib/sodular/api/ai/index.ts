// AI API module for chat and streaming chat
import axios, { AxiosInstance } from 'axios';
import { BaseClient } from '../base-client';

export interface GenerateChatParams {
  input: any;
  agents?: any;
  context?: any;
}

export interface StreamCallbacks {
  onData: (data: any) => void;
  onFinish?: () => void;
  onError?: (err: any) => void;
}

export class AIAPI {
  private baseUrl: string;
  private client: BaseClient;
  private axiosInstance: AxiosInstance;
  constructor(client: BaseClient, baseUrl: string) {
    this.client = client;
    this.baseUrl = baseUrl;
    this.axiosInstance = axios.create({
      baseURL: baseUrl,
      headers: { 'Content-Type': 'application/json' },
    });
    // Attach token and refresh logic
    this.axiosInstance.interceptors.request.use((config) => {
      if (this.client['accessToken']) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${this.client['accessToken']}`;
      }
      return config;
    });
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          if (!(this.client as any).isRefreshing) {
            (this.client as any).refreshPromise = this.client['performTokenRefresh']();
          }
          const refreshed = await (this.client as any).refreshPromise;
          if (refreshed) {
            originalRequest.headers.Authorization = `Bearer ${this.client['accessToken']}`;
            return this.axiosInstance(originalRequest);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async generateChat({ input, agents, context }: GenerateChatParams) {
    const res = await this.axiosInstance.post('/ai/chat', { input, agents, context, stream: false });
    return res.data;
  }

  async generateStreamChat(
    { input, agents, context }: GenerateChatParams,
    { onData, onFinish, onError }: StreamCallbacks
  ): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.client['accessToken']) headers['Authorization'] = `Bearer ${this.client['accessToken']}`;
    let res = await fetch(`${this.baseUrl}/ai/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ input, agents, context, stream: true }),
    });
    if (res.status === 401) {
      // Try refresh
      const refreshed = await (this.client as any).performTokenRefresh();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.client['accessToken']}`;
        res = await fetch(`${this.baseUrl}/ai/chat`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ input, agents, context, stream: true }),
        });
      }
    }
    if (!res.body) {
      const err = new Error('No response body for streaming');
      onError?.(err);
      throw err;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.trim() === '') continue;
          try {
            const parsed = JSON.parse(line);
            onData(parsed.data);
          } catch (e) {
            // Optionally, you can call onError here for parse errors
          }
        }
      }
      if (buffer.trim() !== '') {
        try {
          const parsed = JSON.parse(buffer);
          onData(parsed.data);
        } catch (e) {
          // Optionally, you can call onError here for parse errors
        }
      }
      onFinish?.();
    } catch (err) {
      onError?.(err);
      throw err;
    }
  }

  async getModels({ baseUrl, apiKey }: { baseUrl: string; apiKey: string }) {
    const res = await this.axiosInstance.post('/ai/models', { baseUrl, apiKey });
    return res.data;
  }
}
