import { GoogleGenAI, Type } from "@google/genai";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env manually
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      process.env[key] = value;
    }
  });
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("No API Key");
  process.exit(1);
}

const client = new GoogleGenAI({ apiKey });

async function testModel() {
  console.log("Testing gemini-3-flash-preview...");
  try {
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: "Hello, world!" }] }
    });
    console.log("Success with gemini-3-flash-preview:", response.text ? response.text().substring(0, 50) : "No text");
  } catch (error) {
    console.error("Failed with gemini-3-flash-preview:", error.message);
    
    console.log("Falling back to gemini-2.0-flash...");
    try {
        const response2 = await client.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: { parts: [{ text: "Hello, world!" }] }
        });
        console.log("Success with gemini-2.0-flash:", response2.text ? response2.text().substring(0, 50) : "No text");
    } catch (e2) {
        console.error("Failed with gemini-2.0-flash:", e2.message);
    }
  }
}

testModel();
