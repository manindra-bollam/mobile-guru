// --- Secure Node.js Express Server ---

// 1. Setup Environment Variables (for security)
import { config } from "dotenv";
config();

// 2. Import necessary modules
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

// 3. Configuration
const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";
const SYSTEM_INSTRUCTION =
  "You are 'MobileGuru', a world-class, extremely helpful and detailed expert on mobile phones, processors, pricing, and purchasing decisions. Your goal is to guide the user in selecting the best smartphone for their needs and budget. Provide clear comparisons, explain technical terms simply, and always ask clarifying questions to narrow down the recommendation (e.g., budget, usage, camera priority). Maintain a friendly, professional, and knowledgeable tone. Format your responses using Markdown for readability (bolding, lists).";

// 4. Middleware
app.use(cors()); // Allow all origins for development (RESTRINCT IN PRODUCTION)
app.use(express.json()); // To parse JSON bodies from the client

// 5. Secure Chat Endpoint
app.post("/chat", async (req, res) => {
  console.log("Received chat request:", req.body);
  // 5a. Check for API Key security
  if (!GEMINI_API_KEY) {
    return res
      .status(500)
      .json({ error: "Server error: GEMINI_API_KEY is not set." });
  }

  const { chatHistory } = req.body;

  try {
    const payload = {
      contents: chatHistory,
      systemInstruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }],
      },
    };

    // 5b. Call Gemini API securely from the server
    const geminiResponse = await fetch(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const result = await geminiResponse.json();

    if (
      geminiResponse.ok &&
      result.candidates?.[0]?.content?.parts?.[0]?.text
    ) {
      const responseText = result.candidates[0].content.parts[0].text;
      res.json({ answer: responseText });
    } else {
      // Handle errors from the Gemini API call itself
      console.error("Gemini API Error:", result);
      res.status(502).json({
        error:
          result.error?.message ||
          "Failed to get a valid response from the AI service.",
      });
    }
  } catch (error) {
    console.error("Server Fetch Error:", error);
    res
      .status(500)
      .json({ error: "Internal server error during API request." });
  }
});

// 6. Start Server
app.listen(PORT, () => {
  console.log(`MobileGuru Secure Backend running on http://localhost:${PORT}`);
  console.log("Connect your frontend to /chat endpoint.");
});

// To run this:
// 1. npm init -y
// 2. npm install express node-fetch cors dotenv
// 3. node server.js
