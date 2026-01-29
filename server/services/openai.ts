import { Category } from "@shared/schema";
import { logger } from "../lib/logger";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export class OpenAIService {
    private isConfigured: boolean;

    constructor() {
        this.isConfigured = !!OPENROUTER_API_KEY;
        if (!this.isConfigured) {
            logger.openai.warn("OPENROUTER_API_KEY not set. AI categorization will be disabled.");
        }
    }

    async categorizeTransaction(description: string, categories: Category[]): Promise<number | null> {
        if (!this.isConfigured || categories.length === 0) {
            return null;
        }

        try {
            const categoriesList = categories.map(c => `- ID: ${c.id}, Name: ${c.name}`).join("\n");

            const prompt = `Which category best fits this transaction?
Transaction: "${description}"

Categories:
${categoriesList}

Reply ONLY with the ID of the best matching category. If unsure, reply 'null'.`;

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "google/gemini-2.0-flash-001", // Very cheap and fast
                    messages: [
                        { role: "system", content: "You are a helpful financial assistant. You categorize transactions." },
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.1
                })
            });

            if (!response.ok) {
                throw new Error(`OpenRouter API error: ${response.statusText}`);
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content?.trim();

            if (!content || content.toLowerCase() === "null") {
                return null;
            }

            const categoryId = parseInt(content);
            if (isNaN(categoryId)) {
                return null;
            }

            // Verify the category exists
            if (categories.some(c => c.id === categoryId)) {
                return categoryId;
            }

            return null;
        } catch (error) {
            logger.openai.error("AI Categorization error:", error);
            return null;
        }
    }
}

export const aiService = new OpenAIService();
