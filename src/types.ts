export interface HeaderItem {
  key: string;
  value: string;
  enabled: boolean;
}

export interface HeaderPreset {
  id: string;
  name: string;
  headers: HeaderItem[];
}

export interface EnvVariable {
  key: string;
  value: string;
  enabled: boolean;
}

export interface QueryParamItem {
  key: string;
  value: string;
  enabled: boolean;
}

export interface SavedEndpoint {
  id: string;
  name: string;
  url: string;
  method: string;
  headers: HeaderItem[];
  body: string;
  queryParams: QueryParamItem[];
  createdAt: string;
}

export interface ExecutionHistoryItem {
  id: string;
  url: string;
  method: string;
  status: number;
  timeMs: number;
  timestamp: string;
}

export interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  timeMs: number;
  sizeBytes: number;
  isJson: boolean;
  parsingError?: string;
}

export interface AIDocumentationResult {
  markdownDoc: string;
  openApiSpec: string;
  mockData: string;
  architectureSecurityAdvice: string;
}
