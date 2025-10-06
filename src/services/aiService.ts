// src/services/aiService.ts
import * as vscode from 'vscode';
import OpenAI from "openai";

let groq: OpenAI;

export function initializeAiService() {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        vscode.window.showErrorMessage("Groq API Key is not configured. Please add GROQ_API_KEY to your .env file.");
        throw new Error("GROQ_API_KEY is not set in environment variables.");
    }
    
    groq = new OpenAI({
        baseURL: "https://api.groq.com/openai/v1",
        apiKey: apiKey,
    });
    console.log("Groq AI Service Initialized Successfully.");
}

export async function generatePlan(userInput: string, projectStructure: string): Promise<any> {
    if (!groq) {
        throw new Error("Groq AI service is not initialized.");
    }

    const systemPrompt = `You are an expert software architect AI. Your task is to analyze a user's request and create a detailed, step-by-step implementation plan. Based on the request and the project structure, create a plan. The plan should consist of a series of steps. Each step must specify: 'file', 'action' ('CREATE' or 'MODIFY'), and 'description'. VERY IMPORTANT: Your output MUST be a valid JSON object only, with a single key "plan" which is an array of step objects. Do not include any other text, explanations, or markdown formatting.`;

    const userPrompt = `User Request: "${userInput}"\n\nCurrent Project Structure:\n\`\`\`\n${projectStructure}\n\`\`\``;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            model: "gemma2-9b-it", // <-- The new, confirmed active model
            temperature: 0.1,
            response_format: { type: "json_object" },
        });

        const responseContent = chatCompletion.choices[0]?.message?.content;
        if (responseContent) {
            return JSON.parse(responseContent);
        }
        throw new Error("Received an empty response from the AI.");

    } catch (error) {
        console.error("Error generating plan:", error);
        vscode.window.showErrorMessage("Failed to generate plan from AI. Check the extension logs for details.");
        return { plan: [] };
    }
}

export async function generateCodeForStep(step: any, fileContent: string | null): Promise<string> {
    if (!groq) {
        throw new Error("Groq AI service is not initialized.");
    }

    const actionVerb = step.action === 'CREATE' ? 'Create the full code content' : 'Modify the existing content';
    const existingCode = fileContent ? `Here is the existing code in the file:\n\`\`\`\n${fileContent}\n\`\`\`` : "The file is new and empty.";
    const systemPrompt = `You are an expert programmer AI. Your task is to generate the complete code for a single file based on a specific instruction. Output ONLY the complete, raw source code for the file. Do not include any explanations, comments about your work, or markdown formatting.`;

    const userPrompt = `Instruction: "${step.description}"\nFile Path: "${step.file}"\n\n${existingCode}\n\nYour task: ${actionVerb} for the file "${step.file}" to accomplish the instruction.`;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            model: "gemma2-9b-it", // <-- The new, confirmed active model
            temperature: 0.1,
        });
        return chatCompletion.choices[0]?.message?.content?.replace(/```(typescript|javascript|json|html|css)?/g, '').replace(/```/g, '').trim() || "// Error: No code generated.";
    } catch (error) {
        console.error("Error generating code:", error);
        vscode.window.showErrorMessage("Failed to generate code for a step.");
        return "// Error generating code.";
    }
}