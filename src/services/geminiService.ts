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

  async analyzeImage(imageUrl: string, prompt: string = 'قم بتحليل الصوره'): Promise<GeminiAnalysisResponse> {
    try {
      // First, we need to convert the image to base64
      const base64Image = await this.convertImageToBase64(imageUrl);
      
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: prompt
              },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Image
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

      const response = await fetch(
        `${this.baseUrl}/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
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

  private async convertImageToBase64(imageUrl: string): Promise<string> {
    try {
      // Use backend proxy to bypass CORS and return base64
      const proxied = await apiClient.get(`/image-proxy/base64`, { params: { url: imageUrl } });
      if (proxied.data && proxied.data.success && proxied.data.base64) {
        return proxied.data.base64 as string;
      }
      throw new Error(proxied.data?.error || 'فشل في جلب الصورة من الخادم');
    } catch (error) {
      throw new Error('فشل في تحويل الصورة إلى base64');
    }
  }
}

export default new GeminiService();
