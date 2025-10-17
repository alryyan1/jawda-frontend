import apiClient from './api';

interface GeminiAnalysisResponse {
  success: boolean;
  data?: {
    analysis: string;
  };
  error?: string;
}

class GeminiService {
  private apiKey = 'AIzaSyDux8HjIUF9SE3DNFkIloJ2GQHlTemZ8MQ';
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  private cachedModel: string | null = null;

  async analyzeImage(imageUrl: string, prompt: string = 'استخرج من الصوره التعليق و المبلغ فقط'): Promise<GeminiAnalysisResponse> {
    try {
      // First, we need to convert the image to base64 (and get mime)
      const { base64, mime } = await this.convertImageToBase64(imageUrl);
      
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: prompt
              },
              {
                inline_data: {
                  mime_type: mime || "image/jpeg",
                  data: base64
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 4096,
        }
      };

      // Resolve model dynamically and cache it
      const modelsToTry = await this.resolveImageModel();
      let data: any = null;
      let last404 = false;
      for (const model of modelsToTry) {
        const response = await fetch(
          `${this.baseUrl}/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': this.apiKey,
            },
            body: JSON.stringify(requestBody),
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            last404 = true;
            continue;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        data = await response.json();
        this.cachedModel = model;
        break;
      }
      if (!data) {
        throw new Error(last404 ? 'لم يتم العثور على نموذج متاح لهذه النسخة' : 'تعذر الوصول إلى خدمة Gemini');
      }
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const analysis = data.candidates[0].content.parts[0].text;
        return {
          success: true,
          data: {
            analysis: analysis
          }
        };
      } else {
        throw new Error('No analysis found in response');
      }
    } catch (error) {
      console.error('Error analyzing image with Gemini:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'حدث خطأ في تحليل الصورة'
      };
    }
  }

  private async convertImageToBase64(imageUrl: string): Promise<{ base64: string; mime: string | null }> {
    try {
      // Use backend proxy to bypass CORS and return base64
      const proxied = await apiClient.get(`/image-proxy/base64`, { params: { url: imageUrl } });
      if (proxied.data && proxied.data.success && proxied.data.base64) {
        return { base64: proxied.data.base64 as string, mime: proxied.data.mime || null };
      }
      throw new Error(proxied.data?.error || 'فشل في جلب الصورة من الخادم');
    } catch (error) {
      throw new Error('فشل في تحويل الصورة إلى base64');
    }
  }

  private async resolveImageModel(): Promise<string[]> {
    if (this.cachedModel) {
      return [this.cachedModel];
    }
    try {
      const resp = await fetch(`${this.baseUrl}/models`, {
        headers: { 'x-goog-api-key': this.apiKey }
      });
      if (!resp.ok) {
        throw new Error(`ListModels failed ${resp.status}`);
      }
      const json = await resp.json();
      const names: string[] = (json.models || [])
        .map((m: any) => m.name?.replace('models/', ''))
        .filter(Boolean);

      // Prefer known image-capable models
      const preferredOrder = [
        'gemini-2.5-flash',
        'gemini-pro-vision',
        'gemini-1.5-flash',
        'gemini-1.5-flash-latest',
        'gemini-1.5-pro-vision',
      ];

      const byPreference = preferredOrder.filter((m) => names.includes(m));
      if (byPreference.length > 0) {
        return byPreference;
      }

      // Fallback: any model that contains vision or flash keywords
      const heuristic = names.filter((n) => /vision|flash/i.test(n));
      if (heuristic.length > 0) {
        return heuristic;
      }

      // Final fallback: try gemini-pro-vision explicitly
      return ['gemini-2.5-flash'];
    } catch (e) {
      // If list fails, fallback to a safe default
      return ['gemini-2.5-flash', 'gemini-pro-vision', 'gemini-1.5-flash'];
    }
  }
}

export default new GeminiService();
