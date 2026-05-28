/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  Play, 
  Save, 
  Terminal, 
  Sparkles, 
  Copy, 
  History, 
  HelpCircle, 
  Globe, 
  Code, 
  Check, 
  Search, 
  Layers, 
  Sliders, 
  BookOpen, 
  ShieldAlert, 
  Database,
  ArrowRight,
  RefreshCw,
  FolderOpen
} from "lucide-react";
import { 
  HeaderItem, 
  HeaderPreset, 
  EnvVariable, 
  QueryParamItem, 
  SavedEndpoint, 
  ExecutionHistoryItem, 
  ResponseData, 
  AIDocumentationResult 
} from "./types";
import RequestBodyEditor from "./components/RequestBodyEditor";
import ImportJobsManager from "./components/ImportJobsManager";

// Enterprise standard preloaded Apprenticeship presets
const APPRENTICESHIP_PRESETS = [
  {
    name: "Advert V2: Search Vacancies",
    url: "https://api.apprenticeships.education.gov.uk/vacancies?pageNumber=1&pageSize=10&sort=Age&searchTerm=Software%20Developer",
    method: "GET",
    headers: [
      { key: "Ocp-Apim-Subscription-Key", value: "{{APPRENTICESHIPS_SUB_KEY}}", enabled: true },
      { key: "X-Version", value: "2", enabled: true },
      { key: "Accept", value: "application/json", enabled: true }
    ],
    queryParams: [
      { key: "pageNumber", value: "1", enabled: true },
      { key: "pageSize", value: "10", enabled: true },
      { key: "sort", value: "Age", enabled: true },
      { key: "searchTerm", value: "Software Developer", enabled: true }
    ],
    body: ""
  },
  {
    name: "Advert V2: Find by Reference",
    url: "https://api.apprenticeships.education.gov.uk/vacancies/{{VACANCY_REFERENCE}}",
    method: "GET",
    headers: [
      { key: "Ocp-Apim-Subscription-Key", value: "{{APPRENTICESHIPS_SUB_KEY}}", enabled: true },
      { key: "X-Version", value: "2", enabled: true },
      { key: "Accept", value: "application/json", enabled: true }
    ],
    queryParams: [],
    body: ""
  },
  {
    name: "Recruit V1: Create Advert draft",
    url: "https://api.apprenticeships.education.gov.uk/recruitment/vacancies",
    method: "POST",
    headers: [
      { key: "Ocp-Apim-Subscription-Key", value: "{{APPRENTICESHIPS_SUB_KEY}}", enabled: true },
      { key: "Authorization", value: "Bearer {{RECRUITER_BEARER_TOKEN}}", enabled: true },
      { key: "Content-Type", value: "application/json", enabled: true }
    ],
    queryParams: [],
    body: JSON.stringify({
      title: "Junior full-stack code consultant apprentice",
      shortDescription: "Excellent trainee opportunity working with modern React platforms, Git flows, and REST architectures.",
      numberOfPositions: 1,
      employerName: "Innovate Solutions Ltd",
      apprenticeshipRoute: "Digital",
      programmeId: "96",
      wage: {
        wageType: "ApprenticeshipMinimum",
        workingWeekDescription: "Monday to Friday, 9:00 AM - 5:30 PM with 1 hour for lunch break."
      }
    }, null, 2)
  },
  {
    name: "Recruit V1: Read applications",
    url: "https://api.apprenticeships.education.gov.uk/recruitment-sandbox/vacancies?pageNumber=1&pageSize=10",
    method: "GET",
    headers: [
      { key: "Ocp-Apim-Subscription-Key", value: "{{APPRENTICESHIPS_SUB_KEY}}", enabled: true },
      { key: "Authorization", value: "Bearer {{RECRUITER_BEARER_TOKEN}}", enabled: true }
    ],
    queryParams: [
      { key: "pageNumber", value: "1", enabled: true },
      { key: "pageSize", value: "10", enabled: true }
    ],
    body: ""
  }
];

export default function App() {
  // Main Request Configuration State
  const [endpointName, setEndpointName] = useState("Apprenticeship Vacancy Search (v2)");
  const [url, setUrl] = useState("https://api.apprenticeships.education.gov.uk/vacancies?pageNumber=1&pageSize=10&sort=Age&searchTerm=Software%20Developer");
  const [method, setMethod] = useState("GET");
  const [headers, setHeaders] = useState<HeaderItem[]>([
    { key: "Ocp-Apim-Subscription-Key", value: "{{APPRENTICESHIPS_SUB_KEY}}", enabled: true },
    { key: "X-Version", value: "2", enabled: true },
    { key: "Accept", value: "application/json", enabled: true }
  ]);
  const [body, setBody] = useState("");
  const [queryParams, setQueryParams] = useState<QueryParamItem[]>([
    { key: "pageNumber", value: "1", enabled: true },
    { key: "pageSize", value: "10", enabled: true },
    { key: "sort", value: "Age", enabled: true },
    { key: "searchTerm", value: "Software Developer", enabled: true }
  ]);

  // Environments variables
  const [envVars, setEnvVars] = useState<EnvVariable[]>([
    { key: "APPRENTICESHIPS_SUB_KEY", value: "your_subscription_key_here", enabled: true },
    { key: "VACANCY_REFERENCE", value: "1000012345", enabled: true },
    { key: "RECRUITER_BEARER_TOKEN", value: "your_recruitment_auth_token", enabled: true }
  ]);

  // Saved Endpoints and History
  const [savedEndpoints, setSavedEndpoints] = useState<SavedEndpoint[]>([]);
  const [history, setHistory] = useState<ExecutionHistoryItem[]>([]);
  
  // Workspace Mode (Playground VS Paginated Jobs Runner)
  const [workspaceMode, setWorkspaceMode] = useState<"playground" | "jobs">("playground");
  
  // Interaction/UI States
  const [activeTab, setActiveTab] = useState<"headers" | "params" | "body">("headers");
  const [activeOutputTab, setActiveOutputTab] = useState<"response" | "types" | "schema" | "snippets" | "ai">("response");
  const [activeSnippetLang, setActiveSnippetLang] = useState<"fetch" | "axios" | "python" | "curl">("fetch");
  const [curlPaste, setCurlPaste] = useState("");
  const [showCurlModal, setShowCurlModal] = useState(false);
  const [jsonValidationError, setJsonValidationError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Execution Response State
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<ResponseData | null>(null);

  // AI analysis State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIDocumentationResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Load saved configuration on mount
  useEffect(() => {
    try {
      const storedEndpoints = localStorage.getItem("api_importer_saved");
      if (storedEndpoints) setSavedEndpoints(JSON.parse(storedEndpoints));

      const storedHistory = localStorage.getItem("api_importer_history");
      if (storedHistory) setHistory(JSON.parse(storedHistory));

      const storedEnvs = localStorage.getItem("api_importer_envs");
      if (storedEnvs) setEnvVars(JSON.parse(storedEnvs));
    } catch (e) {
      console.error("Failed to load state from localStorage:", e);
    }
  }, []);

  // Save changes to localStorage helper
  const updateSavedEndpointsInLocal = (items: SavedEndpoint[]) => {
    setSavedEndpoints(items);
    localStorage.setItem("api_importer_saved", JSON.stringify(items));
  };

  const updateHistoryInLocal = (items: ExecutionHistoryItem[]) => {
    setHistory(items);
    localStorage.setItem("api_importer_history", JSON.stringify(items));
  };

  const updateEnvsInLocal = (items: EnvVariable[]) => {
    setEnvVars(items);
    localStorage.setItem("api_importer_envs", JSON.stringify(items));
  };

  // Live Sync: Parse Query URL string properties
  useEffect(() => {
    try {
      const urlObj = new URL(url);
      const paramsList: QueryParamItem[] = [];
      urlObj.searchParams.forEach((val, k) => {
        paramsList.push({ key: k, value: val, enabled: true });
      });
      if (paramsList.length > 0 && queryParams.length === 0) {
        setQueryParams(paramsList);
      }
    } catch (e) {
      // url might be partially typed, ignore
    }
  }, [url]);

  // Sync back Params list edits into the URL bar string
  const syncParamsToUrl = (paramsList: QueryParamItem[]) => {
    try {
      const activeParams = paramsList.filter((p) => p.enabled && p.key);
      const urlObj = new URL(url);
      
      // Clean query search
      urlObj.search = "";
      activeParams.forEach((param) => {
        urlObj.searchParams.set(param.key, param.value);
      });
      setUrl(urlObj.toString());
    } catch (e) {
      // fallback if relative URL or incomplete
      if (url.includes("?")) {
        const baseUrl = url.split("?")[0];
        const queryString = paramsList
          .filter(p => p.enabled && p.key)
          .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
          .join("&");
        setUrl(queryString ? `${baseUrl}?${queryString}` : baseUrl);
      }
    }
  };

  // Variable Substitutor for URL, headers, and request body variables template
  const substituteVariables = (text: string): string => {
    if (!text) return "";
    let substituted = text;
    envVars.forEach((ev) => {
      if (ev.enabled && ev.key) {
        // Replace all instances of {{KEY}} with VALUE
        const placeholder = `{{${ev.key}}}`;
        substituted = substituted.split(placeholder).join(ev.value);
      }
    });
    return substituted;
  };

  // Header Handlers
  const addHeader = () => setHeaders([...headers, { key: "", value: "", enabled: true }]);
  const removeHeader = (index: number) => setHeaders(headers.filter((_, i) => i !== index));
  const updateHeader = (index: number, field: "key" | "value" | "enabled", val: any) => {
    const updated = [...headers];
    updated[index] = { ...updated[index], [field]: val };
    setHeaders(updated);
  };

  // Query Params Handlers
  const addQueryParam = () => {
    const newParams = [...queryParams, { key: "", value: "", enabled: true }];
    setQueryParams(newParams);
  };
  const removeQueryParam = (index: number) => {
    const newParams = queryParams.filter((_, i) => i !== index);
    setQueryParams(newParams);
    syncParamsToUrl(newParams);
  };
  const updateQueryParam = (index: number, field: "key" | "value" | "enabled", val: any) => {
    const newParams = [...queryParams];
    newParams[index] = { ...newParams[index], [field]: val };
    setQueryParams(newParams);
    syncParamsToUrl(newParams);
  };

  // Body JSON live validation
  const handleBodyChange = (text: string) => {
    setBody(text);
    if (!text.trim()) {
      setJsonValidationError(null);
      return;
    }
    try {
      JSON.parse(text);
      setJsonValidationError(null);
    } catch (e: any) {
      setJsonValidationError(e?.message || "Invalid JSON syntax formatting");
    }
  };

  // Quick header templates selector
  const applyHeaderPreset = (presetName: string) => {
    let presetItems: HeaderItem[] = [];
    if (presetName === "json") {
      presetItems = [
        { key: "Content-Type", value: "application/json", enabled: true },
        { key: "Accept", value: "application/json", enabled: true }
      ];
    } else if (presetName === "bearer") {
      presetItems = [
        { key: "Authorization", value: "Bearer {{TOKEN}}", enabled: true },
        { key: "Content-Type", value: "application/json", enabled: true }
      ];
    } else if (presetName === "api-key") {
      presetItems = [
        { key: "X-API-Key", value: "{{API_KEY}}", enabled: true },
        { key: "X-Client-Version", value: "v1.2.0", enabled: true }
      ];
    }
    setHeaders([...headers.filter(h => h.key !== ""), ...presetItems]);
  };

  // Quick environment setups
  const addEnvVar = () => setEnvVars([...envVars, { key: "", value: "", enabled: true }]);
  const removeEnvVar = (index: number) => {
    const filtered = envVars.filter((_, i) => i !== index);
    updateEnvsInLocal(filtered);
  };
  const updateEnvVar = (index: number, field: "key" | "value" | "enabled", val: any) => {
    const updated = [...envVars];
    updated[index] = { ...updated[index], [field]: val };
    updateEnvsInLocal(updated);
  };

  // cURL parser trigger
  const handleImportCurl = () => {
    if (!curlPaste.trim()) return;
    
    let parsedMethod = "GET";
    let parsedUrl = "";
    const parsedHeaders: HeaderItem[] = [];
    let parsedBody = "";

    try {
      // Find URL from the raw command
      const urlMatches = curlPaste.match(/curl\s+(?:-X\s+)?["']?(https?:\/\/[^\s"']+)["']?/i) || 
                         curlPaste.match(/(?:['"])(https?:\/\/[^\s"']+)(?:['"])/i) ||
                         curlPaste.match(/["'](https?:\/\/[^\s"']+)["']/i);
                         
      if (urlMatches && urlMatches[1]) {
        parsedUrl = urlMatches[1];
      } else {
        // Fallback simple search for HTTP(S) protocol address
        const fallbackUrl = curlPaste.match(/https?:\/\/[^\s"']+/i);
        if (fallbackUrl) parsedUrl = fallbackUrl[0];
      }

      // Find method override: -X POST, --request POST
      const methodMatch = curlPaste.match(/(?:-X|--request)\s+([A-Z]+)/i);
      if (methodMatch && methodMatch[1]) {
        parsedMethod = methodMatch[1].toUpperCase();
      } else if (curlPaste.toLowerCase().includes("-d ") || curlPaste.toLowerCase().includes("--data")) {
        parsedMethod = "POST";
      }

      // Parse headers
      const headerRegex = /(?:-H|--header)\s+["']([^"']+)["']/gi;
      let match;
      while ((match = headerRegex.exec(curlPaste)) !== null) {
        const parts = match[1].split(":");
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const val = parts.slice(1).join(":").trim();
          parsedHeaders.push({ key, value: val, enabled: true });
        }
      }

      // Check key-value alternative format e.g. -H 'auth: token'
      const singleHeaderRegex = /(?:-H|--header)\s+'([^']+)'/gi;
      let singleMatch;
      while ((singleMatch = singleHeaderRegex.exec(curlPaste)) !== null) {
        const parts = singleMatch[1].split(":");
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const val = parts.slice(1).join(":").trim();
          if (!parsedHeaders.some(h => h.key.toLowerCase() === key.toLowerCase())) {
            parsedHeaders.push({ key, value: val, enabled: true });
          }
        }
      }

      // Parse data payloads
      const dataRegex = /(?:-d|--data|--data-raw)\s+['"]({[\s\S]*?})['"]/i;
      const dataMatch = curlPaste.match(dataRegex);
      if (dataMatch && dataMatch[1]) {
        parsedBody = dataMatch[1];
      } else {
        const anyDataRegex = /(?:-d|--data|--data-raw)\s+['"]([^'"]+)['"]/i;
        const anyMatch = curlPaste.match(anyDataRegex);
        if (anyMatch && anyMatch[1]) {
          parsedBody = anyMatch[1];
        }
      }

      // Set states
      if (parsedUrl) setUrl(parsedUrl);
      setMethod(parsedMethod);
      if (parsedHeaders.length > 0) {
        setHeaders(parsedHeaders);
      }
      if (parsedBody) {
        setBody(parsedBody);
        setJsonValidationError(null);
      }
      
      setEndpointName(`cURL parsed Endpoint ${new Date().toLocaleTimeString()}`);
      setShowCurlModal(false);
      setCurlPaste("");
    } catch (e) {
      alert("Failed parsing cURL block. Format may be unsupported or contains terminal control sequences.");
    }
  };

  // Perform Request Proxy invocation
  const executeRequest = async () => {
    setIsLoading(true);
    setResponse(null);
    setAiResult(null);
    setAiError(null);

    // Apply variable substitutions
    const substitutedUrl = substituteVariables(url);
    const substitutedHeaders: Record<string, string> = {};
    headers.forEach((h) => {
      if (h.enabled && h.key) {
        substitutedHeaders[h.key] = substituteVariables(h.value);
      }
    });
    
    // Add default user-agent for consistency
    if (!substitutedHeaders["User-Agent"] && !substitutedHeaders["user-agent"]) {
      substitutedHeaders["User-Agent"] = "Enterprise API Importer Agent";
    }

    const substitutedBody = substituteVariables(body);

    try {
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: substitutedUrl,
          method,
          headers: substitutedHeaders,
          body: substitutedBody,
        }),
      });

      const data: ResponseData = await response.json();
      setResponse(data);

      // Add to execution history
      const newHistoryItem: ExecutionHistoryItem = {
        id: Math.random().toString(36).substring(5),
        url: url,
        method: method,
        status: data.status,
        timeMs: data.timeMs,
        timestamp: new Date().toLocaleTimeString(),
        headers: [...headers],
        queryParams: [...queryParams],
        body: body,
        responseBody: data.body,
      };
      updateHistoryInLocal([newHistoryItem, ...history.slice(0, 19)]);
    } catch (error: any) {
      setResponse({
        status: 504,
        statusText: "Gateway Execution Fault",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ error: error?.message || "Execution engine timed out" }),
        timeMs: 0,
        sizeBytes: 0,
        isJson: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Store entire configuration draft
  const handleSaveEndpoint = () => {
    const newEndpoint: SavedEndpoint = {
      id: Math.random().toString(36).substring(5),
      name: endpointName || `Endpoint - ${method} ${url.substring(0, 15)}`,
      url,
      method,
      headers,
      body,
      queryParams,
      createdAt: new Date().toLocaleDateString(),
    };
    updateSavedEndpointsInLocal([newEndpoint, ...savedEndpoints]);
    alert("API config saved securely to your workspace browser drafts!");
  };

  // Delete saved endpoint config
  const handleDeleteSaved = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = savedEndpoints.filter((se) => se.id !== id);
    updateSavedEndpointsInLocal(filtered);
  };

  // Load a saved endpoint to workspace
  const handleLoadEndpoint = (se: SavedEndpoint) => {
    setEndpointName(se.name);
    setUrl(se.url);
    setMethod(se.method);
    setHeaders(se.headers || []);
    setBody(se.body || "");
    setQueryParams(se.queryParams || []);
    setResponse(null);
    setAiResult(null);
  };

  // Dedicated loader for UK Apprenticeships presets
  const loadApprenticeshipPreset = (preset: any) => {
    setEndpointName(preset.name);
    setUrl(preset.url);
    setMethod(preset.method);
    setHeaders(preset.headers || []);
    setBody(preset.body || "");
    setQueryParams(preset.queryParams || []);
    setResponse(null);
    setAiResult(null);

    // Ensure all required placeholder tags exist in the Environment variables list
    const updatedVars = [...envVars];
    
    // Check headers for variables
    preset.headers?.forEach((h: any) => {
      if (h.value && h.value.startsWith("{{") && h.value.endsWith("}}")) {
        const key = h.value.slice(2, -2);
        if (!updatedVars.some(ev => ev.key === key)) {
          updatedVars.push({ key, value: `sandbox_key_${key.toLowerCase()}`, enabled: true });
        }
      }
    });

    // Check URL string pattern for variables
    const matches = preset.url.match(/\{\{([^}]+)\}\}/g);
    if (matches) {
      matches.forEach((m: string) => {
        const key = m.slice(2, -2);
        if (!updatedVars.some(ev => ev.key === key)) {
          updatedVars.push({ key, value: `1000018520`, enabled: true });
        }
      });
    }

    setEnvVars(updatedVars);
  };

  // Load a call history item to workspace
  const handleLoadHistoryItem = (item: ExecutionHistoryItem) => {
    setUrl(item.url);
    setMethod(item.method);
    if (item.headers) {
      setHeaders(item.headers);
    }
    if (item.queryParams) {
      setQueryParams(item.queryParams);
    }
    if (item.body !== undefined) {
      setBody(item.body);
    }
    if (item.responseBody) {
      setResponse({
        status: item.status,
        statusText: item.status === 200 ? "OK" : "Loaded from history",
        headers: { "content-type": "application/json" },
        body: item.responseBody,
        timeMs: item.timeMs,
        sizeBytes: item.responseBody.length,
        isJson: true
      });
    } else {
      setResponse(null);
    }
    setAiResult(null);
  };

  // Generate dynamic Typescript Interfaces
  const generateTypescriptInterfaces = (jsonObj: any, rootName = "RootResponse"): string => {
    if (!jsonObj) return "export type RootResponse = any;";
    
    const output: string[] = [];
    const processedInterfaces = new Set<string>();

    function typeChecker(obj: any, name: string): string {
      if (obj === null) return "null";
      if (Array.isArray(obj)) {
        if (obj.length === 0) return "any[]";
        const itemTypes = Array.from(new Set(obj.map((item: any) => {
          if (typeof item === "object") {
            const subName = name + "Item";
            typeChecker(item, subName);
            return subName;
          }
          return typeof item;
        })));
        return `(${itemTypes.join(" | ")})[]`;
      }
      if (typeof obj === "object") {
        const subName = name.charAt(0).toUpperCase() + name.slice(1);
        if (processedInterfaces.has(subName)) return subName;
        processedInterfaces.add(subName);

        const fields = Object.entries(obj).map(([key, val]) => {
          const type = typeof val === "object" && val !== null ? typeChecker(val, key) : typeof val;
          return `  ${key}: ${type};`;
        });
        output.push(`export interface ${subName} {\n${fields.join("\n")}\n}`);
        return subName;
      }
      return typeof obj;
    }

    try {
      typeChecker(jsonObj, rootName);
      return output.reverse().join("\n\n");
    } catch (e) {
      return "/* Error parsing object structure for production mapping */";
    }
  };

  // Generate JSON schema
  const generateJsonSchema = (jsonObj: any, rootName = "RootResponse"): string => {
    if (!jsonObj) return "{}";
    function parseValue(val: any): any {
      if (val === null) return { type: "null" };
      if (Array.isArray(val)) {
        const items = val.length > 0 ? parseValue(val[0]) : { type: "string" };
        return { type: "array", items };
      }
      if (typeof val === "object") {
        const properties: any = {};
        const required: string[] = [];
        Object.entries(val).forEach(([k, v]) => {
          properties[k] = parseValue(v);
          required.push(k);
        });
        return { type: "object", properties, required };
      }
      if (typeof val === "number") return { type: Number.isInteger(val) ? "integer" : "number" };
      if (typeof val === "boolean") return { type: "boolean" };
      return { type: "string" };
    }

    try {
      const schema = {
        $schema: "http://json-schema.org/draft-07/schema#",
        title: rootName,
        ...parseValue(jsonObj),
      };
      return JSON.stringify(schema, null, 2);
    } catch (e) {
      return "/* Error synthesizing JSON Schema output */";
    }
  };

  // Client Snippets Generator
  const buildClientSnippets = () => {
    const formattedHeaders = headers
      .filter((h) => h.enabled && h.key)
      .map((h) => `    "${h.key}": "${h.value}"`)
      .join(",\n");
    
    const requestBodyText = body || "";
    const activeUrl = url || "https://api.example.com";

    const fetchSnippet = `// Production JavaScript Fetch Client
fetch("${activeUrl}", {
  method: "${method}",
  headers: {
${formattedHeaders ? formattedHeaders : '    "Content-Type": "application/json"'}
  }${method !== "GET" && requestBodyText ? `,\n  body: JSON.stringify(${requestBodyText.trim()})` : ""}
})
.then(response => {
  if (!response.ok) throw new Error(\`HTTP failure status: \${response.status}\`);
  return response.json();
})
.then(data => console.log("Import Successful:", data))
.catch(error => console.error("Endpoint Execution Error:", error));`;

    const axiosSnippet = `// Production TypeScript Axios client
import axios from "axios";

export async function importEndpointData() {
  const options = {
    method: "${method}",
    url: "${activeUrl}",
    headers: {
${formattedHeaders ? formattedHeaders : '      "Content-Type": "application/json"'}
    }${method !== "GET" && requestBodyText ? `,\n    data: ${requestBodyText.trim()}` : ""}
  };

  try {
    const { data } = await axios.request(options);
    return data;
  } catch (error) {
    console.error("Enterprise Axios Gateway Execution failed:", error);
    throw error;
  }
}`;

    const pythonSnippet = `# Production Python Requests Client
import requests
import json

url = "${activeUrl}"
headers = {
${headers.filter(h => h.enabled && h.key).map(h => `    "${h.key}": "${h.value}"`).join(",\n")}
}

${method !== "GET" && requestBodyText ? `payload = ${requestBodyText.trim()}\n` : ""}
try:
    response = requests.request(
        "${method}",
        url,
        headers=headers${method !== "GET" && requestBodyText ? ",\n        json=payload" : ""}
    )
    response.raise_for_status()
    print("Execution timing:", response.elapsed.total_seconds() * 1000, "ms")
    print(response.json())
except requests.exceptions.RequestException as e:
    print("Network/Auth failure:", e)`;

    const curlSnippet = `curl -X ${method} "${activeUrl}" \\
${headers.filter(h => h.enabled && h.key).map(h => `  -H "${h.key}: ${h.value}" \\`).join("\n")}${method !== "GET" && requestBodyText ? `  -d '${requestBodyText.replace(/'/g, "'\\''")}'` : ""}`;

    return { fetchSnippet, axiosSnippet, pythonSnippet, curlSnippet };
  };

  // Invoke server side Gemini AI for generating beautiful specs and OpenAPI definitions
  const invokeAIEngine = async () => {
    if (!response) {
      alert("Please execute the API importer tool once first to provide response parameters context!");
      return;
    }

    setIsAiLoading(true);
    setAiResult(null);
    setAiError(null);

    const substitutedHeaders: Record<string, string> = {};
    headers.forEach((h) => {
      if (h.enabled && h.key) substitutedHeaders[h.key] = h.value;
    });

    try {
      const res = await fetch("/api/generate-ai-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpointName,
          url,
          method,
          requestHeaders: substitutedHeaders,
          requestBody: body,
          responseBody: response.body,
          responseStatus: response.status,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed connecting to Gemini SDK service. Ensure variable keys are set.");
      }

      const outcomeData = await res.json();
      if (outcomeData.error) {
        throw new Error(outcomeData.message || outcomeData.error);
      }

      setAiResult(outcomeData);
    } catch (e: any) {
      setAiError(e?.message || "An unexpected issue occurred while requesting Gemini 3.5 content synthesis.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Copy code utility
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Helper variables for clean formatting of response
  const parsedResponseObj = (() => {
    if (!response || !response.isJson) return null;
    try {
      return JSON.parse(response.body);
    } catch (e) {
      return null;
    }
  })();

  const snippets = buildClientSnippets();

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-gray-800 font-sans flex flex-col">
      {/* Visual Header */}
      <header id="app-header" className="bg-[#111827] text-white py-4 px-6 shadow-md flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-blue-500 to-indigo-600 p-2.5 rounded-lg shadow-inner">
            <Layers className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Enterprise API Importer <span className="text-xs bg-blue-500/20 text-blue-400 font-mono px-2 py-0.5 rounded border border-blue-500/40">Workspace v2.0</span>
            </h1>
            <p className="text-xs text-gray-400">Spec writer, multi-header configurations, and synthetic model generation</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            id="import-curl-btn"
            onClick={() => setShowCurlModal(true)} 
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold py-2 px-3.5 rounded-lg border border-gray-700 transition"
          >
            <Terminal className="w-4 h-4 text-gray-400" />
            Paste cURL Setup
          </button>
          <a 
            href="https://github.com/dexit/enterprise-api-importer" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-gray-400 hover:text-white text-xs flex items-center gap-1 transition"
          >
            <Globe className="w-4 h-4" /> Github Base docs
          </a>
        </div>
      </header>

      {/* Workspace Selection Navigation */}
      <div className="bg-[#1f2937] text-white px-6 py-2.5 flex flex-wrap items-center justify-between border-b border-gray-800 gap-3">
        <div className="flex bg-[#111827] p-1 rounded-xl shadow-inner border border-gray-800">
          <button
            onClick={() => setWorkspaceMode("playground")}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              workspaceMode === "playground"
                ? "bg-blue-600 text-white shadow-md font-extrabold"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            API Playground
          </button>
          <button
            onClick={() => setWorkspaceMode("jobs")}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              workspaceMode === "jobs"
                ? "bg-[#4f46e5] text-white shadow-md font-extrabold"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Import Job Runner ({localStorage.getItem("api_importer_jobs") ? JSON.parse(localStorage.getItem("api_importer_jobs")!).length : 0})
          </button>
        </div>
        
        <div className="text-xs text-gray-400 font-medium font-mono hidden sm:block">
          Environment Synchronizer: <span className="text-indigo-400 font-bold font-mono">{envVars.filter(ev => ev.enabled && ev.value).length} variable sets active</span>
        </div>
      </div>

      {/* Workspace Area Layout */}
      <div id="main-workspace-container" className="flex-1 max-w-[1700px] w-full mx-auto p-5">
        {workspaceMode === "jobs" ? (
          <ImportJobsManager
            currentUrl={url}
            currentMethod={method}
            currentHeaders={headers}
            currentQueryParams={queryParams}
            currentBody={body}
            currentName={endpointName}
            envVars={envVars}
            substituteVariables={substituteVariables}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left panels: Saved parameters, Environment variables, Run logs */}
        <div id="sidebar-panel" className="lg:col-span-3 flex flex-col gap-5">
          
          {/* Draft Title Box */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-blue-500" /> Draft Configuration Name
            </h3>
            <input 
              type="text" 
              value={endpointName} 
              onChange={(e) => setEndpointName(e.target.value)} 
              placeholder="e.g. Products Endpoint" 
              className="w-full text-sm outline-none font-semibold text-gray-800 p-2 border border-gray-200 rounded-lg focus:border-blue-500 transition placeholder:text-gray-400"
            />
          </div>

          {/* UK Education & Apprenticeships API Presets block */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-xl border border-indigo-950 p-4 shadow-md flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5 border-b border-indigo-700/40 pb-2">
              <Sparkles className="w-4 h-4 text-purple-300 animate-pulse" />
              <div>
                <h3 className="text-xs font-extrabold tracking-wider uppercase text-purple-200">
                  UK Apprenticeships Portal
                </h3>
                <p className="text-[10px] text-indigo-200">Display Advert API v2 & Sandboxes</p>
              </div>
            </div>
            
            <p className="text-[11px] text-indigo-100/80 leading-relaxed">
              Auto-populate the client with multiheaders (<span className="font-mono text-indigo-300">Ocp-Apim-Subscription-Key</span>), query schemas, and request payloads:
            </p>

            <div className="grid grid-cols-1 gap-1.5 pt-1">
              {APPRENTICESHIP_PRESETS.map((preset, index) => {
                const isActive = endpointName === preset.name;
                return (
                  <button
                    key={index}
                    onClick={() => loadApprenticeshipPreset(preset)}
                    className={`text-left text-[11px] py-1.5 px-2.5 rounded font-medium flex items-center justify-between transition-all group ${
                      isActive 
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm border border-blue-500" 
                        : "bg-indigo-950 hover:bg-indigo-800/60 text-indigo-100 border border-indigo-850"
                    }`}
                  >
                    <span className="truncate">{preset.name}</span>
                    <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      preset.method === "GET" 
                        ? "bg-green-500/20 text-green-300" 
                        : "bg-blue-500/20 text-blue-300"
                    }`}>{preset.method}</span>
                  </button>
                );
              })}
            </div>
            
            <div className="text-[10px] text-indigo-300 bg-indigo-950/80 p-2 rounded border border-indigo-800/40 mt-1 leading-normal">
              💡 Register at <a href="https://developer.apprenticeships.education.gov.uk/" target="_blank" rel="noopener noreferrer" className="underline text-purple-300 hover:text-purple-100 font-semibold">apprenticeships dev hub</a> to acquire subscription keys.
            </div>
          </div>

          {/* Active Environments */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-blue-500" /> Environment Variables
                </h3>
                <p className="text-[11px] text-gray-400">Use placeholder keys as <span className="font-mono text-gray-500">{"{{KEY}}"}</span></p>
              </div>
              <button 
                onClick={addEnvVar} 
                className="p-1.5 bg-blue-50 hover:bg-blue-100 rounded text-blue-600 transition"
                title="Add Environment Variable"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-4 max-h-[170px] overflow-y-auto space-y-2">
              {envVars.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No environment variables. Quick bind to dynamically adapt URLs.</p>
              ) : (
                envVars.map((ev, index) => (
                  <div key={index} className="flex items-center gap-1.5">
                    <input 
                      type="checkbox" 
                      checked={ev.enabled} 
                      onChange={(e) => updateEnvVar(index, "enabled", e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-400 w-3.5 h-3.5"
                    />
                    <input 
                      type="text" 
                      placeholder="KEY" 
                      value={ev.key} 
                      onChange={(e) => updateEnvVar(index, "key", e.target.value)}
                      className="w-1/3 text-xs font-mono p-1 border rounded bg-gray-50 outline-none text-gray-700" 
                    />
                    <input 
                      type="text" 
                      placeholder="Value" 
                      value={ev.value} 
                      onChange={(e) => updateEnvVar(index, "value", e.target.value)}
                      className="w-2/3 text-xs p-1 border rounded outline-none" 
                    />
                    <button 
                      onClick={() => removeEnvVar(index)} 
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-gray-50 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Saved Endpoint Configurations */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col flex-1 min-h-[220px]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4 text-blue-500" /> Endpoint Workspaces ({savedEndpoints.length})
              </h3>
              <button 
                onClick={handleSaveEndpoint} 
                className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-1.5 rounded hover:bg-blue-100 flex items-center gap-1 transition"
              >
                <Save className="w-3 h-3" /> Save Draft
              </button>
            </div>
            <div className="p-2 overflow-y-auto flex-1 space-y-1.5 max-h-[260px]">
              {savedEndpoints.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <BookOpen className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No saved endpoints locally.</p>
                  <p className="text-[10px] mt-1 text-gray-400">Draft configurations will appear here.</p>
                </div>
              ) : (
                savedEndpoints.map((se) => (
                  <div 
                    key={se.id} 
                    onClick={() => handleLoadEndpoint(se)}
                    className="flex flex-col p-2.5 rounded-lg border border-gray-150 hover:bg-gray-50 cursor-pointer transition relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700 truncate max-w-[80%]">{se.name}</span>
                      <button 
                        onClick={(e) => handleDeleteSaved(se.id, e)}
                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-0.5 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={`text-[9px] font-mono font-bold px-1 rounded ${
                        se.method === "GET" ? "bg-green-100 text-green-700" :
                        se.method === "POST" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                      }`}>{se.method}</span>
                      <span className="text-[10px] font-mono text-gray-400 truncate w-[75%]">{se.url}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* History Item list */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[200px]">
            <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-xl">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-gray-500" /> Call History (Recent)
              </h3>
              {history.length > 0 && (
                <button 
                  onClick={() => updateHistoryInLocal([])} 
                  className="text-[10px] text-red-500 hover:underline"
                >
                  Clear Logs
                </button>
              )}
            </div>
            <div className="p-1.5 overflow-y-auto flex-1 space-y-1">
              {history.length === 0 ? (
                <p className="text-[11px] text-gray-400 text-center py-8">Requests you send will log here.</p>
              ) : (
                history.map((h, i) => (
                  <button 
                    key={h.id || i} 
                    onClick={() => handleLoadHistoryItem(h)}
                    className="w-full flex items-center justify-between p-2 rounded text-left hover:bg-gray-100/80 active:bg-gray-200 border border-gray-100 hover:border-gray-200/80 transition cursor-pointer group"
                    title="Click to restore this request payload and state"
                  >
                    <div className="flex items-center gap-2 overflow-hidden mr-1">
                      <span className={`text-[9px] font-bold py-0.5 px-1.5 rounded flex-shrink-0 ${
                        h.method === "GET" ? "bg-green-100 text-green-700 font-bold" : "bg-blue-100 text-blue-700 font-bold"
                      }`}>{h.method}</span>
                      <span className="text-[10px] text-gray-700 truncate font-mono" title={h.url}>{h.url}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                        String(h.status).startsWith("2") ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"
                      }`}>{h.status}</span>
                      <span className="text-[9px] text-gray-400 font-mono">{h.timeMs}ms</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Central Controller Box & Right Analysis display */}
        <div id="central-workbench" className="lg:col-span-9 flex flex-col gap-5">
          
          {/* Primary Importer Bar */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex flex-col md:flex-row gap-3 items-stretch">
              <div className="relative">
                <select 
                  value={method} 
                  onChange={(e) => setMethod(e.target.value)} 
                  className="w-full md:w-36 h-full text-sm font-semibold bg-gray-50 p-3.5 border border-gray-200 rounded-xl focus:border-blue-500 outline-none transition cursor-pointer text-gray-700"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                  <option value="OPTIONS">OPTIONS</option>
                </select>
              </div>

              {/* URL address search container */}
              <div className="flex-1 relative">
                <input 
                  type="text" 
                  value={url} 
                  onChange={(e) => setUrl(e.target.value)} 
                  placeholder="Enter endpoint target URL e.g. {{BASE_URL}}/users" 
                  className="w-full h-full p-3.5 pl-10 border border-gray-200 rounded-xl font-mono text-xs focus:border-blue-500 outline-none transition"
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Globe className="w-4 fill-white" />
                </div>
              </div>
              
              <button 
                onClick={executeRequest}
                disabled={isLoading}
                className="w-full md:w-44 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold p-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white text-white" />
                    <span>Import Endpoint</span>
                  </>
                )}
              </button>
            </div>

            {/* In-sync variables notice status indicator */}
            {url.includes("{{") && (
              <div className="mt-3 flex items-center gap-1.5 bg-amber-50 text-amber-700 text-[11px] p-2 rounded-lg border border-amber-200">
                <HelpCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Notice: Your target URL includes environment tags. Before connecting, the template engine will substitute these with live keys. 
                  Resolved address: <strong className="font-mono">{substituteVariables(url)}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Workbench Controls Section Tabs */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
            <div className="border-b border-gray-200 bg-gray-50 flex items-center justify-between px-4 rounded-t-xl">
              <nav className="flex gap-4">
                <button 
                  onClick={() => setActiveTab("headers")} 
                  className={`py-3.5 px-1.5 text-xs font-bold uppercase tracking-wider border-b-2 transition relative ${
                    activeTab === "headers" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Multi-Headers ({headers.filter(h => h.key).length})
                </button>
                <button 
                  onClick={() => setActiveTab("params")} 
                  className={`py-3.5 px-1.5 text-xs font-bold uppercase tracking-wider border-b-2 transition relative ${
                    activeTab === "params" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Query Parameters ({queryParams.filter(q => q.key).length})
                </button>
                <button 
                  onClick={() => setActiveTab("body")} 
                  className={`py-3.5 px-1.5 text-xs font-bold uppercase tracking-wider border-b-2 transition relative ${
                    activeTab === "body" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Request payload Body {body ? "●" : ""}
                </button>
              </nav>

              {/* Context Action Helper based on Active Tab */}
              {activeTab === "headers" && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase">Presets:</span>
                  <button onClick={() => applyHeaderPreset("json")} className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded transition">JSON Content</button>
                  <button onClick={() => applyHeaderPreset("bearer")} className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded transition">Bearer Token</button>
                  <button onClick={() => applyHeaderPreset("api-key")} className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded transition">Header Key</button>
                </div>
              )}
            </div>

            <div className="p-5">
              {/* Tab 1: Multi-Headers config */}
              {activeTab === "headers" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-400">Manage multiple authentication and tenant context headers for the targeted API call.</p>
                    <button 
                      onClick={addHeader} 
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Add custom parameter
                    </button>
                  </div>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto p-1 bg-gray-50 rounded-lg border border-gray-100">
                    {headers.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">No headers assigned. Click Add Custom Parameter above.</p>
                    ) : (
                      headers.map((h, index) => (
                        <div key={index} className="flex gap-2.5 items-center">
                          <input 
                            type="checkbox" 
                            checked={h.enabled} 
                            onChange={(e) => updateHeader(index, "enabled", e.target.checked)}
                            className="rounded text-blue-600 focus:ring-blue-400 w-4 h-4 ml-2"
                          />
                          <input 
                            type="text" 
                            placeholder="HTTP Header Key (e.g. Authorization)" 
                            value={h.key} 
                            onChange={(e) => updateHeader(index, "key", e.target.value)}
                            className="flex-1 text-xs font-mono p-2 border border-gray-200 rounded-lg bg-white" 
                          />
                          <input 
                            type="text" 
                            placeholder="Value" 
                            value={h.value} 
                            onChange={(e) => updateHeader(index, "value", e.target.value)}
                            className="flex-1 text-xs font-mono p-2 border border-gray-200 rounded-lg bg-white" 
                          />
                          <button 
                            onClick={() => removeHeader(index)} 
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition mr-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Query Parameters config */}
              {activeTab === "params" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-400">These will be appended to the end of the address URL securely (e.g. <span className="font-mono text-gray-500">?limit=10</span>).</p>
                    <button 
                      onClick={addQueryParam} 
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Add parameter
                    </button>
                  </div>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto p-1 bg-gray-50 rounded-lg border border-gray-100">
                    {queryParams.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">No query search keys detected. Click add parameter above or write directly in the Address bar URL.</p>
                    ) : (
                      queryParams.map((qp, index) => (
                        <div key={index} className="flex gap-2.5 items-center">
                          <input 
                            type="checkbox" 
                            checked={qp.enabled} 
                            onChange={(e) => updateQueryParam(index, "enabled", e.target.checked)}
                            className="rounded text-blue-600 focus:ring-blue-400 w-4 h-4 ml-2"
                          />
                          <input 
                            type="text" 
                            placeholder="Parameter Name" 
                            value={qp.key} 
                            onChange={(e) => updateQueryParam(index, "key", e.target.value)}
                            className="flex-1 text-xs font-mono p-2 border border-gray-200 rounded-lg bg-white" 
                          />
                          <input 
                            type="text" 
                            placeholder="Value" 
                            value={qp.value} 
                            onChange={(e) => updateQueryParam(index, "value", e.target.value)}
                            className="flex-1 text-xs font-mono p-2 border border-gray-200 rounded-lg bg-white" 
                          />
                          <button 
                            onClick={() => removeQueryParam(index)} 
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition mr-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Request Payload body config */}
              {activeTab === "body" && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Configure raw JSON request payloads for POST, PUT, or PATCH calls here. Hover features enable syntax checks, bracket counting, line offsets, format filters, and environment variables (e.g., <code className="px-1.5 py-0.5 rounded font-mono text-[10.5px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-semibold inline-block">{"{{APPRENTICESHIPS_SUB_KEY}}"}</code>) interpolation.
                  </p>
                  <RequestBodyEditor 
                    value={body}
                    onChange={handleBodyChange}
                    jsonValidationError={jsonValidationError}
                  />
                </div>
              )}
            </div>
          </div>

          {/* OUTPUT & TRANSLATION SPACE */}
          {response ? (
            <div id="output-tabs-panel" className="bg-white rounded-xl border border-gray-200 shadow-lg flex flex-col transition-all">
              
              {/* Output status row */}
              <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Importer Result:</span>
                  <span className={`text-xs font-extrabold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm ${
                    String(response.status).startsWith("2") ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20" : "bg-rose-500/10 text-rose-700 border border-rose-500/20"
                  }`}>
                    {response.status === 200 ? "200 Success OK" : `${response.status} ${response.statusText}`}
                  </span>
                  
                  {/* Performance latency badge */}
                  <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-200/50 px-2.5 py-1.5 rounded-lg border border-slate-300">
                    Timing: <strong className="text-slate-800">{response.timeMs} ms</strong>
                  </span>

                  {/* Size Indicator */}
                  <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-200/50 px-2.5 py-1.5 rounded-lg border border-slate-300">
                    Content Size: <strong className="text-slate-800">{(response.sizeBytes / 1024).toFixed(2)} KB</strong>
                  </span>
                </div>

                {/* Main Action tools triggers */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={invokeAIEngine}
                    disabled={isAiLoading}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center gap-1.5 transition shadow"
                  >
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    {isAiLoading ? "Synthesizing AI Engine Specs..." : "Enhance with Gemini AI"}
                  </button>
                  <button 
                    onClick={() => copyToClipboard(response.body, "response-raw")} 
                    className="p-1 px-2.5 bg-gray-200 text-slate-700 text-xs font-semibold hover:bg-gray-300 rounded-lg flex items-center gap-1 transition"
                  >
                    {copiedKey === "response-raw" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Response</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Translation Output Selector tabs */}
              <div className="border-b border-gray-150 bg-white">
                <nav className="flex px-4 gap-4">
                  <button 
                    onClick={() => setActiveOutputTab("response")} 
                    className={`py-3 px-1.5 text-xs font-bold uppercase border-b-2 transition ${
                      activeOutputTab === "response" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Response Body {response.isJson ? "(JSON)" : "(Raw Content)"}
                  </button>
                  <button 
                    onClick={() => setActiveOutputTab("types")} 
                    className={`py-3 px-1.5 text-xs font-bold uppercase border-b-2 transition ${
                      activeOutputTab === "types" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    TypeScript Models
                  </button>
                  <button 
                    onClick={() => setActiveOutputTab("schema")} 
                    className={`py-3 px-1.5 text-xs font-bold uppercase border-b-2 transition ${
                      activeOutputTab === "schema" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    JSON Schema Specs
                  </button>
                  <button 
                    onClick={() => setActiveOutputTab("snippets")} 
                    className={`py-3 px-1.5 text-xs font-bold uppercase border-b-2 transition ${
                      activeOutputTab === "snippets" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Client Code Snippets
                  </button>
                  <button 
                    onClick={() => setActiveOutputTab("ai")} 
                    className={`py-3 px-1.5 text-xs font-bold uppercase border-b-2 transition flex items-center gap-1 ${
                      activeOutputTab === "ai" ? "border-purple-600 text-purple-600" : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                    OpenAPI Spec & Smart AI README
                  </button>
                </nav>
              </div>

              {/* Tab Display Area */}
              <div className="p-5">
                {/* 1. Format/Raw Response tab */}
                {activeOutputTab === "response" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Inspected Response Headers ({Object.keys(response.headers).length})</span>
                      <button 
                        onClick={() => copyToClipboard(JSON.stringify(response.headers, null, 2), "headers-copied")}
                        className="text-[10px] text-blue-600 hover:underline"
                      >
                        {copiedKey === "headers-copied" ? "Copied!" : "Copy Headers Block"}
                      </button>
                    </div>
                    
                    {/* Headers collapsible detail summary */}
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs font-mono max-h-[140px] overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                      {Object.entries(response.headers).map(([key, val]) => (
                        <div key={key} className="flex justify-between border-b border-gray-100 py-1">
                          <span className="text-blue-600 font-semibold">{key}:</span>
                          <span className="text-gray-600 truncate max-w-[190px]" title={val}>{val}</span>
                        </div>
                      ))}
                    </div>

                    <div className="bg-gray-900 border border-gray-800 text-gray-100 rounded-xl p-4 font-mono text-xs max-h-[460px] overflow-y-auto">
                      <pre>{response.isJson && parsedResponseObj ? JSON.stringify(parsedResponseObj, null, 2) : response.body}</pre>
                    </div>
                  </div>
                )}

                {/* 2. Generating Typescript Interfaces */}
                {activeOutputTab === "types" && (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-xs leading-relaxed text-blue-700">
                      We auto-analyzed the properties from the executed API payload schema and synthesized matching strict **TypeScript interfaces**. Useful for importing models into type-safe code layers.
                    </div>
                    <div className="relative">
                      <button 
                        onClick={() => copyToClipboard(generateTypescriptInterfaces(parsedResponseObj), "ts-code")}
                        className="absolute right-3 top-3 bg-gray-800 hover:bg-gray-700 text-white text-xs py-1.5 px-3 rounded-md transition flex items-center gap-1"
                      >
                        {copiedKey === "ts-code" ? <Check className="w-3 text-emerald-400" /> : <Copy className="w-3" />}
                        <span>{copiedKey === "ts-code" ? "Copied Interfaces" : "Copy Interfaces"}</span>
                      </button>
                      <div className="bg-gray-950 text-emerald-400 rounded-xl p-4 pt-12 font-mono text-xs max-h-[420px] overflow-y-auto">
                        <pre>{generateTypescriptInterfaces(parsedResponseObj)}</pre>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Generating JSON Schema Specs */}
                {activeOutputTab === "schema" && (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-xs leading-relaxed text-blue-700">
                      Standard JSON Schema (Draft 7 representation) mapped output detailing properties validation requirements for API clients.
                    </div>
                    <div className="relative">
                      <button 
                        onClick={() => copyToClipboard(generateJsonSchema(parsedResponseObj), "json-schema-key")}
                        className="absolute right-3 top-3 bg-gray-800 hover:bg-gray-700 text-white text-xs py-1.5 px-3 rounded-md transition flex items-center gap-1"
                      >
                        {copiedKey === "json-schema-key" ? <Check className="w-3 text-emerald-400" /> : <Copy className="w-3" />}
                        <span>{"Copy JSON Schema"}</span>
                      </button>
                      <div className="bg-gray-950 text-purple-400 rounded-xl p-4 pt-12 font-mono text-xs max-h-[420px] overflow-y-auto">
                        <pre>{generateJsonSchema(parsedResponseObj)}</pre>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Mapped Snippets tab */}
                {activeOutputTab === "snippets" && (
                  <div className="space-y-4">
                    <div className="flex gap-2 p-1 bg-gray-100 rounded-lg max-w-sm">
                      <button onClick={() => setActiveSnippetLang("fetch")} className={`flex-1 text-center text-xs py-1.5 rounded-md font-semibold transition ${activeSnippetLang === "fetch" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Fetch Client</button>
                      <button onClick={() => setActiveSnippetLang("axios")} className={`flex-1 text-center text-xs py-1.5 rounded-md font-semibold transition ${activeSnippetLang === "axios" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Axios Code</button>
                      <button onClick={() => setActiveSnippetLang("python")} className={`flex-1 text-center text-xs py-1.5 rounded-md font-semibold transition ${activeSnippetLang === "python" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Python</button>
                      <button onClick={() => setActiveSnippetLang("curl")} className={`flex-1 text-center text-xs py-1.5 rounded-md font-semibold transition ${activeSnippetLang === "curl" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>cURL Trigger</button>
                    </div>

                    <div className="relative">
                      <button 
                        onClick={() => {
                          const snippetValue = activeSnippetLang === "fetch" ? snippets.fetchSnippet :
                                               activeSnippetLang === "axios" ? snippets.axiosSnippet :
                                               activeSnippetLang === "python" ? snippets.pythonSnippet : snippets.curlSnippet;
                          copyToClipboard(snippetValue, "copied-snip");
                        }}
                        className="absolute right-3 top-3 bg-gray-800 hover:bg-gray-700 text-white text-xs py-1.5 px-3 rounded-md transition flex items-center gap-1"
                      >
                        {copiedKey === "copied-snip" ? <Check className="w-3 text-emerald-400" /> : <Copy className="w-3" />}
                        <span>{"Copy Snippet"}</span>
                      </button>
                      <div className="bg-gray-950 text-gray-100 rounded-xl p-4 pt-12 font-mono text-xs max-h-[420px] overflow-y-auto">
                        <pre>
                          {activeSnippetLang === "fetch" && snippets.fetchSnippet}
                          {activeSnippetLang === "axios" && snippets.axiosSnippet}
                          {activeSnippetLang === "python" && snippets.pythonSnippet}
                          {activeSnippetLang === "curl" && snippets.curlSnippet}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Smart AI Tab */}
                {activeOutputTab === "ai" && (
                  <div className="space-y-5">
                    {isAiLoading && (
                      <div className="text-center py-12">
                        <RefreshCw className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
                        <h4 className="text-sm font-semibold text-gray-700">Synthesizing OpenAPI specs via Google Gemini...</h4>
                        <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">This compiles real REST parameters, schemas, and formats into dynamic swagger documentation, architectural reviews, and mocks on-the-fly.</p>
                      </div>
                    )}

                    {aiError && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-start gap-2 max-w-2xl">
                        <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong>Gemini synthesis error:</strong>
                          <p className="mt-1">{aiError}</p>
                          <p className="mt-2 text-gray-400">Ensure the model API code has process.env.GEMINI_API_KEY correctly setup under the Secrets configuration tab inside AI Studio.</p>
                        </div>
                      </div>
                    )}

                    {!aiResult && !isAiLoading && !aiError && (
                      <div className="text-center py-12 bg-purple-50/50 rounded-2xl border border-dashed border-purple-200">
                        <Sparkles className="w-10 h-10 text-purple-500 mx-auto mb-3" />
                        <h3 className="text-base font-bold text-gray-800">Advanced AI Synthesis Suite</h3>
                        <p className="text-xs text-gray-400 max-w-md mx-auto mt-2 leading-relaxed">
                          Elevate the documentation! Let Gemini examine this raw endpoint transaction and instantly reconstruct a valid **OpenAPI 3.0 specification snippet**, a **Product Technical README**, custom **Enterprise Mock Payloads**, and **Architectural Cyber Security audits**.
                        </p>
                        <button 
                          onClick={invokeAIEngine}
                          className="mt-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs py-2 px-6 rounded-lg transition-all shadow-md flex items-center gap-1.5 mx-auto"
                        >
                          <Sparkles className="w-4 h-4 text-white" />
                          Initialize Gemini AI Spec Writer
                        </button>
                      </div>
                    )}

                    {aiResult && (
                      <div className="space-y-6">
                        {/* Dynamic Specs grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {/* 1. Markdown documentation card */}
                          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
                            <div className="p-3 bg-gray-50 border-b flex items-center justify-between rounded-t-xl">
                              <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5 font-sans">
                                <BookOpen className="w-4 h-4 text-purple-500" /> API README documentation (Markdown)
                              </span>
                              <button 
                                onClick={() => copyToClipboard(aiResult.markdownDoc, "ai-markdown")}
                                className="text-[10px] bg-white hover:bg-gray-100 text-gray-600 font-semibold border px-2 py-1 rounded transition"
                              >
                                {copiedKey === "ai-markdown" ? "Copied!" : "Copy README"}
                              </button>
                            </div>
                            <div className="p-4 overflow-y-auto max-h-[350px] text-xs font-sans text-gray-650 leading-relaxed space-y-3 prose">
                              <div className="markdown-body whitespace-pre-wrap">{aiResult.markdownDoc}</div>
                            </div>
                          </div>

                          {/* 2. OpenAPI 3.0 spec YAML draft config */}
                          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
                            <div className="p-3 bg-gray-50 border-b flex items-center justify-between rounded-t-xl">
                              <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5 font-sans">
                                <Terminal className="w-4 h-4 text-purple-500" /> OpenAPI / Swagger definitions
                              </span>
                              <button 
                                onClick={() => copyToClipboard(aiResult.openApiSpec, "ai-openapi")}
                                className="text-[10px] bg-white hover:bg-gray-100 text-gray-600 font-semibold border px-2 py-1 rounded transition"
                              >
                                {copiedKey === "ai-openapi" ? "Copied!" : "Copy OpenAPI Spec"}
                              </button>
                            </div>
                            <div className="p-4 overflow-y-auto max-h-[350px] font-mono text-[11px] bg-slate-900 text-slate-100 whitespace-pre-wrap rounded-b-xl leading-relaxed">
                              {aiResult.openApiSpec}
                            </div>
                          </div>
                        </div>

                        {/* Audit & security advice card */}
                        <div className="bg-[#fffbeb] border border-amber-200 p-5 rounded-xl flex items-start gap-3.5">
                          <div className="p-2 bg-amber-100 rounded-lg text-amber-800 flex-shrink-0">
                            <ShieldAlert className="w-5 h-5 text-amber-700" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-amber-800 flex items-center gap-1.5">
                              Architectural Compliance & Cybersecurity Assessment
                            </h4>
                            <p className="text-xs text-amber-700 mt-1 leading-relaxed whitespace-pre-line">
                              {aiResult.architectureSecurityAdvice}
                            </p>
                          </div>
                        </div>

                        {/* Enterprise generated Mock template card */}
                        <div className="bg-white border rounded-xl shadow-sm flex flex-col">
                          <div className="p-3 bg-gray-50 border-b rounded-t-xl flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                              <Database className="w-4 h-4 text-purple-600" /> Synthetic Data Generation Templates
                            </span>
                            <button 
                              onClick={() => copyToClipboard(aiResult.mockData, "ai-mock")}
                              className="text-[11px] bg-white hover:bg-gray-100 text-gray-600 font-semibold border px-2 py-1 rounded transition"
                            >
                              {copiedKey === "ai-mock" ? "Copied!" : "Copy Mock JSON"}
                            </button>
                          </div>
                          <div className="p-4 overflow-y-auto max-h-[220px] font-mono text-xs bg-slate-900 text-emerald-400 whitespace-pre">
                            {typeof aiResult.mockData === "object" ? JSON.stringify(aiResult.mockData, null, 2) : aiResult.mockData}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
              <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3 animate-bounce" />
              <h3 className="text-base font-bold text-gray-700">Importer Workbench Awaiting Run</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mt-2 leading-relaxed">
                Provide an endpoint URL with your multi-headers, then trigger the import command to parse payloads and synthesize code blocks.
              </p>
            </div>
          )}
        </div>
        </div>
        )}
      </div>

      {/* cURL Imports paste Setup modal */}
      {showCurlModal && (
        <div id="curl-modal-overlay" className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl border border-gray-100 flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b flex items-center justify-between bg-gray-50 rounded-t-2xl">
              <h3 className="text-sm font-bold text-gray-750 flex items-center gap-1.5">
                <Terminal className="w-4.5 h-4.5 text-blue-600" /> Parse cURL Terminal Command
              </h3>
              <button onClick={() => setShowCurlModal(false)} className="text-gray-400 hover:text-gray-600 text-sm font-bold p-1">✕</button>
            </div>
            <div className="p-5 flex-1 flex flex-col gap-3">
              <p className="text-xs text-gray-400 leading-relaxed">
                Paste any standard <span className="font-mono text-gray-600 bg-gray-100 px-1 py-0.5 rounded">curl</span> block copied from Chrome/Firefox DevTools network tabs, documentation pages, or terminal scripts. The workspace will extract URLs, HTTP methods, authorization tokens, multi-headers, and raw payloads automatically.
              </p>
              <textarea 
                value={curlPaste} 
                onChange={(e) => setCurlPaste(e.target.value)}
                placeholder={`curl -X POST "https://api.gateway.com/v1/users" \\&#10;  -H "Authorization: Bearer my-vault-key" \\&#10;  -H "Content-Type: application/json" \\&#10;  -d '{"name": "Robert", "company": "Enterprise Inc"}'`}
                className="w-full h-56 font-mono text-xs p-4 bg-gray-900 text-gray-100 border border-gray-700 rounded-xl outline-none focus:border-blue-500 transition"
              />
            </div>
            <div className="p-4 border-t bg-gray-50 rounded-b-2xl flex items-center justify-end gap-2.5">
              <button 
                onClick={() => setShowCurlModal(false)} 
                className="text-xs font-semibold text-gray-500 bg-gray-200 hover:bg-gray-300 py-2 px-4 rounded-lg transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleImportCurl}
                className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 py-2 px-5 rounded-lg transition flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-4 h-4 text-white" /> Reconstruct Workbench
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simplified Footer block */}
      <footer className="bg-gray-900 border-t border-gray-800 text-gray-400 text-center py-4 text-xs">
        <p>© 2026 Enterprise API Importer Workspace. Formatted via Gemini 3.5 Intelligent Code Synthesis.</p>
      </footer>
    </div>
  );
}
