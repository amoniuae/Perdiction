// Gemini AI Service
// This service handles interactions with Google's Gemini AI API

export interface GeminiResponse {
  text: string;
  error?: string;
}

export class GeminiService {
  private apiKey: string | null = null;

  constructor() {
    // Initialize with API key from environment or local storage
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key');
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    localStorage.setItem('gemini_api_key', apiKey);
  }

  async generateContent(prompt: string): Promise<GeminiResponse> {
    if (!this.apiKey) {
      return {
        text: '',
        error: 'API key not configured. Please set your Gemini API key.'
      };
    }

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        return {
          text: data.candidates[0].content.parts[0].text
        };
      } else {
        return {
          text: '',
          error: 'No content generated'
        };
      }
    } catch (error) {
      console.error('Gemini API error:', error);
      return {
        text: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

export const geminiService = new GeminiService();