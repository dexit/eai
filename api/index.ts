import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json({ limit: "15mb" }));

// Lazy initialize Gemini client safely
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set. Please add it via Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}


// API route to proxy API requests
app.post("/api/import", async (req, res) => {
  const { url, method, headers, body } = req.body;

  if (!url) {
    return res.status(400).json({ error: "API URL is required" });
  }

  const start = Date.now();
  try {
    const fetchOptions: RequestInit = {
      method: method || "GET",
      headers: new Headers(headers || {}),
    };

    // Add body only for non-GET/HEAD requests and if a body exists
    if (method && !["GET", "HEAD"].includes(method.toUpperCase())) {
      if (typeof body === "string") {
        fetchOptions.body = body;
      } else if (body) {
        fetchOptions.body = JSON.stringify(body);
      }
    }

    const response = await fetch(url, fetchOptions);
    const end = Date.now();
    const duration = end - start;

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const bodyText = await response.text();
    let isJson = false;
    
    // Attempt JSON check
    try {
      const ct = responseHeaders["content-type"] || "";
      if (ct.includes("application/json") || bodyText.trim().startsWith("{") || bodyText.trim().startsWith("[")) {
        JSON.parse(bodyText); // verify it's valid JSON
        isJson = true;
      }
    } catch (err) {
      // failed parse, fall back to plain text
      isJson = false;
    }

    res.status(200).json({
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: bodyText,
      timeMs: duration,
      sizeBytes: Buffer.byteLength(bodyText, "utf8"),
      isJson,
    });
  } catch (error: any) {
    const end = Date.now();
    console.error("Proxy integration error:", error);
    res.status(200).json({
      status: 500,
      statusText: "Internal Gateway Error",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        error: "Failed to fetch remote API.",
        message: error?.message || "Verify your backend URL, corporate intranet rules, or schema correctness.",
      }),
      timeMs: end - start,
      sizeBytes: 0,
      isJson: true,
    });
  }
});

// AI-Assisted Documentation / Schema Spec Generator
app.post("/api/generate-ai-doc", async (req, res) => {
  const { endpointName, url, method, requestHeaders, requestBody, responseBody, responseStatus } = req.body;

  try {
    const ai = getGeminiClient();
    
    const payloadPrompt = `
    You are an elite Enterprise Solutions architect.
    You are analyzing an API HTTP execution result. Analyze the input details and response payload below to generate rich technical descriptors.
    
    API Metadata:
    - Name: ${endpointName || "Untitled Endpoint"}
    - Request URL: ${url}
    - HTTP Method: ${method}
    - Response Status Code: ${responseStatus || 200}
    
    Request Headers Configured:
    ${JSON.stringify(requestHeaders || {}, null, 2)}
    
    Request Body Context:
    ${requestBody || "None"}
    
    Actual Response Body Payload:
    ${responseBody ? (responseBody.length > 50000 ? responseBody.substring(0, 50000) + "... [Truncated for Context limits]" : responseBody) : "Empty"}
    
    Please perform these exact activities and output a structured JSON response corresponding to the following schema:
    
    JSON schema details expected in response:
    {
      "markdownDoc": "A clean, production-ready, beautifully designed technical README or markdown document explaining the endpoint purpose, authentication, usage variables, input parameters, response data fields description, and example curl scenario.",
      "openApiSpec": "A strict OpenAPI 3.0 YAML or JSON specification chunk detailing this dynamic endpoint. Ensure proper JSON string formatting.",
      "mockData": "A realistic JSON mock object template matching this data structure but populated with varied mock enterprise entities.",
      "architectureSecurityAdvice": "A deep cybersecurity / architectural review of the payload quality, headers (checking for common missing security/rate-limit blocks), data leak vulnerabilities, and best practices."
    }

    Return standard raw JSON compliant string only. Do not wrap in markdown \`\`\`json blocks in your final string. Just output the valid raw stringified JSON.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: payloadPrompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const responseText = response.text || "{}";
    const cleanedResponse = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    res.status(200).json(JSON.parse(cleanedResponse));
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    res.status(500).json({ 
      error: "AI Generation failed", 
      message: error?.message || "Check your API Key settings in AI Studio panel." 
    });
  }
});

export default app;
