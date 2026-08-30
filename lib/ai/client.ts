/**
 * AI Provider Client Abstraction.
 *
 * Configured for Google Gemini API (Free Tier compatible: gemini-1.5-flash / gemini-2.0-flash).
 * Provider & model are dynamically configurable via environment variables:
 *   - GEMINI_API_KEY or AI_API_KEY
 *   - GEMINI_MODEL or AI_MODEL (default: "gemini-1.5-flash")
 */

export interface AiImagePart {
  inlineData: {
    mimeType: string;
    data: string; // Base64
  };
}

export interface AiTextPart {
  text: string;
}

export type AiPart = AiTextPart | AiImagePart;

export interface GenerateContentOptions {
  systemInstruction?: string;
  parts: AiPart[];
  temperature?: number;
  responseMimeType?: "application/json" | "text/plain";
  responseSchema?: Record<string, unknown>;
}

export interface AiClientResponse {
  text: string;
  model: string;
}

export class AiClient {
  private apiKey: string | null;
  private model: string;

  constructor() {
    this.apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.AI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      null;

    this.model =
      process.env.GEMINI_MODEL ||
      process.env.AI_MODEL ||
      "gemini-1.5-flash";
  }

  public isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.trim().length > 0;
  }

  public getModelName(): string {
    return this.model;
  }

  /**
   * Generates content using Google Gemini API.
   */
  public async generateContent(
    options: GenerateContentOptions
  ): Promise<AiClientResponse> {
    if (!this.apiKey) {
      throw new Error(
        "Gemini API key is not configured. Please set GEMINI_API_KEY or AI_API_KEY in your environment (.env.local)."
      );
    }

    const {
      systemInstruction,
      parts,
      temperature = 0.1,
      responseMimeType = "application/json",
    } = options;

    // Use official SDK if available, with REST fallback
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { GoogleGenAI } = require("@google/genai");
      const ai = new GoogleGenAI({ apiKey: this.apiKey });

      // Transform parts into SDK format
      const contentsParts = parts.map((p) => {
        if ("inlineData" in p) {
          return {
            inlineData: {
              mimeType: p.inlineData.mimeType,
              data: p.inlineData.data,
            },
          };
        }
        return { text: p.text };
      });

      const config: Record<string, unknown> = {
        temperature,
      };

      if (systemInstruction) {
        config.systemInstruction = {
          parts: [{ text: systemInstruction }],
        };
      }

      if (responseMimeType === "application/json") {
        config.responseMimeType = "application/json";
      }

      const response = await ai.models.generateContent({
        model: this.model,
        contents: contentsParts,
        config,
      });

      const responseText = response.text || "";
      return {
        text: responseText,
        model: this.model,
      };
    } catch (sdkError) {
      // If SDK fails or is incompatible with payload, attempt direct REST call
      console.warn(
        "[ai-client] SDK call encountered error, attempting REST fallback:",
        sdkError instanceof Error ? sdkError.message : String(sdkError)
      );

      return this.generateContentRest(options);
    }
  }

  /**
   * Fallback direct REST invocation to Google Gemini API
   */
  private async generateContentRest(
    options: GenerateContentOptions
  ): Promise<AiClientResponse> {
    const {
      systemInstruction,
      parts,
      temperature = 0.1,
      responseMimeType = "application/json",
    } = options;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const bodyPayload: Record<string, unknown> = {
      contents: [
        {
          role: "user",
          parts: parts.map((p) => {
            if ("inlineData" in p) {
              return {
                inline_data: {
                  mime_type: p.inlineData.mimeType,
                  data: p.inlineData.data,
                },
              };
            }
            return { text: p.text };
          }),
        },
      ],
      generationConfig: {
        temperature,
        responseMimeType,
      },
    };

    if (systemInstruction) {
      bodyPayload.system_instruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyPayload),
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      const errorMsg =
        errorJson?.error?.message ||
        `Gemini API returned status ${res.status}: ${res.statusText}`;
      throw new Error(errorMsg);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const textPart = candidate?.content?.parts?.[0]?.text;

    if (!textPart) {
      throw new Error("No text content returned from Gemini API.");
    }

    return {
      text: textPart,
      model: this.model,
    };
  }
}

export const aiClient = new AiClient();
