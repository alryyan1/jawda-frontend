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

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'x-goog-api-key': this.apiKey,
        },
      });
      console.log('Connection test response status:', response.status);
      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  async analyzeLabResults(testData: any, prompt?: string): Promise<GeminiAnalysisResponse> {
    try {
      const defaultPrompt = `Interpret CBC results focusing on TotalWBC, HB, PLT. Provide direct medical analysis in separate lines, maximum 5 lines:

${testData.results?.map((result: any) => 
  `${result.testName}: ${result.value}`
).join(', ') || 'No results available'}`;

      const analysisPrompt = prompt || defaultPrompt;

      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: analysisPrompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          topK: 32,
          topP: 1,
          maxOutputTokens: 256, // Increased to get complete response
        }
      };

      // Use text-only model for lab results analysis - try models without thinking capability first
      const modelsToTry = ['gemini-2.0-flash-001', 'gemini-2.0-flash', 'gemini-flash-latest', 'gemini-2.5-flash'];
      let data: any = null;
      let lastError = null;

      for (const model of modelsToTry) {
        try {
          console.log(`Trying model: ${model}`);
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

          console.log(`Response status for ${model}:`, response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.log(`Error response for ${model}:`, errorText);
            lastError = new Error(`HTTP error! status: ${response.status} - ${errorText}`);
            continue;
          }
          
          data = await response.json();
          console.log(`Success with model: ${model}`);
          break;
        } catch (error) {
          console.log(`Exception for model ${model}:`, error);
          lastError = error;
          continue;
        }
      }

      if (!data) {
        console.error('All models failed. Last error:', lastError);
        throw lastError || new Error('تعذر الوصول إلى خدمة Gemini');
      }
      
      if (data.candidates && data.candidates[0]) {
        const candidate = data.candidates[0];
        
        // Check if the response was truncated due to token limit
        if (candidate.finishReason === 'MAX_TOKENS') {
          console.warn('Response truncated due to token limit, but we have partial content.');
          
          // If we have partial content, use it
          if (candidate.content && candidate.content.parts && candidate.content.parts[0] && candidate.content.parts[0].text) {
            let partialAnalysis = candidate.content.parts[0].text;
            
            // Clean up common introductory phrases
            partialAnalysis = partialAnalysis.replace(/^Here's a hematologist's interpretation focusing on the key values:\s*/i, '');
            partialAnalysis = partialAnalysis.replace(/^Here's the interpretation:\s*/i, '');
            partialAnalysis = partialAnalysis.replace(/^Interpretation:\s*/i, '');
            partialAnalysis = partialAnalysis.replace(/^Analysis:\s*/i, '');
            partialAnalysis = partialAnalysis.replace(/^The results show:\s*/i, '');
            partialAnalysis = partialAnalysis.replace(/^Based on the CBC results:\s*/i, '');
            partialAnalysis = partialAnalysis.trim();
            
            return {
              success: true,
              data: {
                analysis: partialAnalysis + '\n\n[Note: Response truncated due to token limit, but this portion is useful]'
              }
            };
          }
          
          console.warn('No partial content available, trying shorter prompt...');
          // Try again with a shorter prompt
          const shorterPrompt = `CBC interpretation in 2 lines:

${testData.results?.slice(0, 3).map((result: any) => 
  `${result.testName}: ${result.value}`
).join(', ') || 'No results available'}`;

          const shorterRequestBody = {
            contents: [
              {
                parts: [
                  {
                    text: shorterPrompt
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.3,
              topK: 32,
              topP: 1,
              maxOutputTokens: 128, // Increased for fallback to get complete response
            }
          };

          // Try with shorter prompt
          const shorterResponse = await fetch(
            `${this.baseUrl}/models/gemini-2.5-flash:generateContent`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': this.apiKey,
              },
              body: JSON.stringify(shorterRequestBody),
            }
          );

          if (shorterResponse.ok) {
            const shorterData = await shorterResponse.json();
            if (shorterData.candidates && shorterData.candidates[0] && shorterData.candidates[0].content && shorterData.candidates[0].content.parts) {
              const analysis = shorterData.candidates[0].content.parts[0].text;
              return {
                success: true,
                data: {
                  analysis: analysis
                }
              };
            }
          }
          
          // If shorter prompt also fails, return a generic message
          return {
            success: true,
            data: {
              analysis: 'Results analyzed but response was too long. Please review results manually or reduce data amount.'
            }
          };
        }
        
        // Normal response handling
        if (candidate.content && candidate.content.parts && candidate.content.parts[0]) {
          let analysis = candidate.content.parts[0].text;
          
          // Clean up common introductory phrases
          analysis = analysis.replace(/^Here's a hematologist's interpretation focusing on the key values:\s*/i, '');
          analysis = analysis.replace(/^Here's the interpretation:\s*/i, '');
          analysis = analysis.replace(/^Interpretation:\s*/i, '');
          analysis = analysis.replace(/^Analysis:\s*/i, '');
          analysis = analysis.replace(/^The results show:\s*/i, '');
          analysis = analysis.replace(/^Based on the CBC results:\s*/i, '');
          analysis = analysis.trim();
          
          return {
            success: true,
            data: {
              analysis: analysis
            }
          };
        } else {
          throw new Error('No analysis found in response');
        }
      } else {
        throw new Error('No candidates found in response');
      }
    } catch (error) {
      console.error('Error analyzing lab results with Gemini:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'حدث خطأ في تحليل النتائج'
      };
    }
  }

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
        'gemini-2.0-flash-001',
        'gemini-2.0-flash',
        'gemini-flash-latest',
        'gemini-2.5-flash-image',
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

      // Final fallback: try gemini-2.5-flash explicitly
      return ['gemini-2.5-flash'];
    } catch (e) {
      // If list fails, fallback to a safe default
      return ['gemini-2.5-flash', 'gemini-2.0-flash-001', 'gemini-flash-latest'];
    }
  }
}

export default new GeminiService();
