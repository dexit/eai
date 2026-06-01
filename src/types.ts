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
  headers?: HeaderItem[];
  queryParams?: QueryParamItem[];
  body?: string;
  responseBody?: string;
}

export interface DetailLookupConfig {
  enabled: boolean;
  referenceKeySource: string;
  detailUrlTemplate: string;
  delayMs: number;
}

export interface ImportJobConfig {
  url: string;
  method: string;
  headers: HeaderItem[];
  queryParams: QueryParamItem[];
  body: string;
  detailLookup?: DetailLookupConfig;
}

export interface PaginationConfig {
  type: "none" | "query";
  paramKey: string;
  startValue: number;
  endValue: number;
  pageSizeKey: string;
  pageSizeValue: number;
  delayMs: number;
  autoStopEmpty: boolean;
}

export interface ImportJobLog {
  timestamp: string;
  type: "info" | "success" | "warning" | "error";
  message: string;
}

export interface PagePerformanceMetric {
  page: number;
  latencyMs: number;
  recordCount: number;
  sizeBytes: number;
  timestamp: string;
}

export interface ImportJob {
  id: string;
  name: string;
  createdAt: string;
  config: ImportJobConfig;
  pagination: PaginationConfig;
  status: "idle" | "running" | "paused" | "success" | "failed";
  currentPage: number;
  logs: ImportJobLog[];
  collectedCount: number;
  items: any[];
  total?: number;
  totalFiltered?: number;
  totalPages?: number;
  detectedArrayKey?: string;
  lastRunTimestamp?: string;
  errorMessage?: string;
  pageMetrics?: PagePerformanceMetric[];
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
