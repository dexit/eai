import React, { useState, useEffect, useRef } from "react";
import { 
  Play, 
  Pause, 
  Trash2, 
  Plus, 
  RefreshCw, 
  Database, 
  Layers, 
  Sliders, 
  AlertTriangle, 
  Check, 
  X, 
  Search, 
  Download, 
  FileCode, 
  Layers2, 
  ArrowRight, 
  CheckCircle, 
  Clock, 
  HelpCircle,
  FileSpreadsheet,
  TrendingUp,
  BarChart3,
  Terminal,
  Table,
  PieChart,
  Upload,
  CheckCircle2,
  FileText,
  Ban,
  Copy
} from "lucide-react";
import { 
  ImportJob, 
  ImportJobConfig, 
  PaginationConfig, 
  ImportJobLog, 
  HeaderItem, 
  QueryParamItem,
  EnvVariable,
  PagePerformanceMetric
} from "../types";

import PhpClientGenerator from './PhpClientGenerator';
import { format, parseISO, isValid } from 'date-fns';

interface ImportJobsManagerProps {
  currentUrl: string;
  currentMethod: string;
  currentHeaders: HeaderItem[];
  currentQueryParams: QueryParamItem[];
  currentBody: string;
  currentName: string;
  envVars: EnvVariable[];
  substituteVariables: (text: string) => string;
}

export default function ImportJobsManager({
  currentUrl,
  currentMethod,
  currentQueryParams,
  currentHeaders,
  currentBody,
  currentName,
  envVars,
  substituteVariables
}: ImportJobsManagerProps) {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showCreator, setShowCreator] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Job Creator state fields
  const [newJobName, setNewJobName] = useState("");
  const [pageParamKey, setPageParamKey] = useState("pageNumber");
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(5);
  const [pageSizeParamKey, setPageSizeParamKey] = useState("pageSize");
  const [pageSizeValue, setPageSizeValue] = useState(10);
  const [delayBetweenPages, setDelayBetweenPages] = useState(1200);
  const [autoStopEmpty, setAutoStopEmpty] = useState(true);

  // Detail Lookup states
  const [enableDetailLookup, setEnableDetailLookup] = useState(false);
  const [detailReferenceKeySource, setDetailReferenceKeySource] = useState("vacancyReference");
  const [detailUrlTemplate, setDetailUrlTemplate] = useState("https://api.apprenticeships.education.gov.uk/vacancies/{{reference}}");
  const [detailDelayMs, setDetailDelayMs] = useState(500);

  // Active Tab for running detail panel
  const [activeRightTab, setActiveRightTab] = useState<"runner" | "vdb" | "stats" | "php">("runner");

  // Virtual SQL Database manager states
  const [vdbTables, setVdbTables] = useState<{ [tableName: string]: any[] }>({});
  const [selectedVdbTable, setSelectedVdbTable] = useState<string>("");
  const [sqlSearch, setSqlSearch] = useState("");
  const [sqlFilters, setSqlFilters] = useState<{ field: string; op: string; val: string }[]>([]);
  const [manualJsonInput, setManualJsonInput] = useState("");
  const [showJsonImporter, setShowJsonImporter] = useState(false);
  const [vdbExportFormat, setVdbExportFormat] = useState<"json" | "csv" | "sql_mysql" | "sql_postgres" | "sql_sqlite" | "xml" | "tsv" | "markdown">("json");
  const [vdbToast, setVdbToast] = useState<{ message: string; type: "success" | "info" | "error" | null }>({ message: "", type: null });
  const [statsCategoryField, setStatsCategoryField] = useState("");
  const [vdbPage, setVdbPage] = useState<number>(1);
  const [sqlAutoSave, setSqlAutoSave] = useState(true);
  const vdbPageSize = 10;

  // Active Runner State & reference to prevent overlapping cycles
  const activeJobsRef = useRef<{ [jobId: string]: boolean }>({});

  // Sync jobs list on mount
  useEffect(() => {
    const stored = localStorage.getItem("api_importer_jobs");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ImportJob[];
        // Sanitize running states on bootstrap
        const loaded = parsed.map(j => ({
          ...j,
          status: j.status === "running" ? "paused" : j.status
        })) as ImportJob[];
        setJobs(loaded);
        if (loaded.length > 0) {
          setSelectedJobId(loaded[0].id);
        }
      } catch (e) {
        // Fall back to empty
      }
    }

    // Load Virtual SQL Tables
    const storedVdb = localStorage.getItem("api_importer_virtual_db");
    if (storedVdb) {
      try {
        const parsed = JSON.parse(storedVdb);
        setVdbTables(parsed);
        const keys = Object.keys(parsed);
        if (keys.length > 0) {
          setSelectedVdbTable(keys[0]);
        }
      } catch (e) {
        // Fall back
      }
    }
  }, []);

  const saveVdbToLocal = (updatedVdb: { [tableName: string]: any[] }) => {
    setVdbTables(updatedVdb);
    localStorage.setItem("api_importer_virtual_db", JSON.stringify(updatedVdb));
  };

  const saveJobsToLocal = (updatedList: ImportJob[]) => {
    setJobs(updatedList);
    localStorage.setItem("api_importer_jobs", JSON.stringify(updatedList));
  };

  // Import Job Array directly into table with deduplication and custom notice
  const triggerSyncToVdb = (jobName: string, itemsToSync: any[]) => {
    if (!itemsToSync || itemsToSync.length === 0) {
      setVdbToast({ message: "No records found in this job to sync to Database.", type: "error" });
      setTimeout(() => setVdbToast({ message: "", type: null }), 4005);
      return;
    }

    // Sanitize job name to SQL table name format
    const tableName = "tbl_" + jobName.toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_");

    const existingTableItems = vdbTables[tableName] || [];
    
    // Deduplicate against existing table items in VDB
    const deduplicated = [...existingTableItems];
    let addedCount = 0;

    itemsToSync.forEach(item => {
      const itemKey = item.id || item.vacancyReference || item.uid || item.reference || JSON.stringify(item);
      const isDuplicate = existingTableItems.some(existing => {
        const extKey = existing.id || existing.vacancyReference || existing.uid || existing.reference || JSON.stringify(existing);
        return extKey === itemKey;
      });

      if (!isDuplicate) {
        deduplicated.push(item);
        addedCount++;
      }
    });

    const updatedVdb = {
      ...vdbTables,
      [tableName]: deduplicated
    };

    saveVdbToLocal(updatedVdb);
    setSelectedVdbTable(tableName);
    setActiveRightTab("vdb");
    setVdbToast({
      message: `Database Synced! Inserted ${addedCount} new unique records to simulated table "${tableName}". Total row count: ${deduplicated.length}.`,
      type: "success"
    });
    setTimeout(() => setVdbToast({ message: "", type: null }), 5005);
  };

  // Helper function to extract lists from any API JSON Response
  const extractArrayFromResponse = (parsedJson: any): { items: any[], detectedKey: string } => {
    if (!parsedJson) return { items: [], detectedKey: "" };
    
    if (Array.isArray(parsedJson)) {
      return { items: parsedJson, detectedKey: "ROOT_ARRAY" };
    }
    
    if (typeof parsedJson === "object") {
      const priorityKeys = ["vacancies", "results", "data", "items", "records", "jobs"];
      for (const k of priorityKeys) {
        if (Array.isArray(parsedJson[k])) {
          return { items: parsedJson[k], detectedKey: k };
        }
      }
      
      for (const key in parsedJson) {
        if (Array.isArray(parsedJson[key])) {
          return { items: parsedJson[key], detectedKey: key };
        }
      }
    }
    return { items: [], detectedKey: "" };
  };

  // Convert nested objects to dot-notation fields for flat CSV outputs
  const flattenObject = (obj: any, prefix = ""): Record<string, string> => {
    const res: Record<string, string> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const propName = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
          Object.assign(res, flattenObject(obj[key], propName));
        } else if (Array.isArray(obj[key])) {
          res[propName] = obj[key].map((x: any) => typeof x === "object" ? JSON.stringify(x) : x).join("; ");
        } else {
          let val = obj[key];
          if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
            try {
              const parsed = parseISO(val);
              if (isValid(parsed)) val = format(parsed, 'PPpp');
            } catch(e) {}
          }
          res[propName] = val === null || val === undefined ? "" : String(val);
        }
      }
    }
    return res;
  };

  const selectVdbTableHook = (table: string) => {
    setSelectedVdbTable(table);
    setVdbPage(1);
    setSqlSearch("");
    setSqlFilters([]);
  };

  const handleImportManualJson = (tableNameInput: string, jsonStr: string) => {
    if (!jsonStr.trim()) {
      setVdbToast({ message: "Manual import string is empty.", type: "error" });
      setTimeout(() => setVdbToast({ message: "", type: null }), 3000);
      return;
    }
    const sanitizedTbl = "tbl_" + tableNameInput.toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_");
      
    try {
      const parsed = JSON.parse(jsonStr);
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      
      const updatedVdb = {
        ...vdbTables,
        [sanitizedTbl]: rows
      };
      
      saveVdbToLocal(updatedVdb);
      setSelectedVdbTable(sanitizedTbl);
      setVdbPage(1);
      setShowJsonImporter(false);
      setVdbToast({ message: `Successfully loaded dataset with ${rows.length} rows into custom table "${sanitizedTbl}"`, type: "success" });
      setTimeout(() => setVdbToast({ message: "", type: null }), 4000);
    } catch (e: any) {
      setVdbToast({ message: `JSON Format Error: ${e.message}`, type: "error" });
      setTimeout(() => setVdbToast({ message: "", type: null }), 4000);
    }
  };

  const selectVdbItemsFiltered = (): any[] => {
    const rawItems = vdbTables[selectedVdbTable] || [];
    if (!sqlSearch.trim()) return rawItems;
    
    // Check if SQL query contains custom WHERE or matches a standard searching token
    const lowerQuery = sqlSearch.toLowerCase();
    
    // Quick fallback helper: if they type standard SQL like 'select * from tbl_x where ...' or standard filter string
    // Let's strip standard SQL noise 'select ... where' to find actual search criteria
    let criteria = lowerQuery;
    const whereIdx = lowerQuery.indexOf("where");
    if (whereIdx !== -1) {
      criteria = lowerQuery.substring(whereIdx + 5).trim();
    }
    const limitIdx = criteria.indexOf("limit");
    let limitVal = 0;
    if (limitIdx !== -1) {
      const limitStr = criteria.substring(limitIdx + 5).trim();
      limitVal = parseInt(limitStr) || 0;
      criteria = criteria.substring(0, limitIdx).trim();
    }
    
    // Strip standard SQL comparison operators from evaluation
    criteria = criteria.replace(/select\s+\*\s+from\s+[a-z0-0_]+/g, "")
                        .replace(/['"%()]/g, "")
                        .replace(/and/g, "")
                        .replace(/or/g, "")
                        .trim();
                        
    // Search fields
    const filtered = rawItems.filter(item => {
      const flat = flattenObject(item);
      const matchCriteria = Object.values(flat).some(val => 
        val !== null && val !== undefined && String(val).toLowerCase().includes(criteria)
      );
      return matchCriteria;
    });
    
    if (limitVal > 0) {
      return filtered.slice(0, limitVal);
    }
    return filtered;
  };

  const handleExportDbTable = (tableName: string, formatStr: string) => {
    const rawItems = vdbTables[tableName] || [];
    if (rawItems.length === 0) {
      setVdbToast({ message: "Table has no records to export.", type: "error" });
      setTimeout(() => setVdbToast({ message: "", type: null }), 3000);
      return;
    }

    let reportTitle = `${tableName}_export_${Date.now()}`;
    let mimeType = "text/plain";
    let fileExtension = "txt";
    let fileContent = "";

    if (formatStr === "json") {
      fileContent = JSON.stringify(rawItems, null, 2);
      mimeType = "application/json";
      fileExtension = "json";
    } else if (formatStr === "csv") {
      const fRows = rawItems.map(r => flattenObject(r)) as Record<string, string>[];
      const headers = Array.from(new Set(fRows.reduce<string[]>((acc, x) => [...acc, ...Object.keys(x)], [])));
      let csv = headers.join(",") + "\n";
      fRows.forEach(row => {
        const line = headers.map(h => {
          let cVal = row[h] === undefined ? "" : String(row[h]).replace(/"/g, '""');
          return `"${cVal}"`;
        });
        csv += line.join(",") + "\n";
      });
      fileContent = csv;
      mimeType = "text/csv";
      fileExtension = "csv";
    } else if (formatStr === "tsv") {
      const fRows = rawItems.map(r => flattenObject(r)) as Record<string, string>[];
      const headers = Array.from(new Set(fRows.reduce<string[]>((acc, x) => [...acc, ...Object.keys(x)], [])));
      let tsv = headers.join("\t") + "\n";
      fRows.forEach(row => {
        const line = headers.map(h => (row[h] === undefined ? "" : String(row[h]).replace(/\t/g, " ").replace(/\n/g, " ")));
        tsv += line.join("\t") + "\n";
      });
      fileContent = tsv;
      mimeType = "text/tab-separated-values";
      fileExtension = "tsv";
    } else if (formatStr.startsWith("sql_")) {
      const dialect = formatStr.replace("sql_", "");
      const fRows = rawItems.map(r => flattenObject(r)) as Record<string, string>[];
      
      // Get all headers dynamically without truncating
      const headersMap = new Map<string, string>(); // cleaned name -> original name
      fRows.forEach(row => {
        Object.keys(row).forEach(k => {
           let safe = k.replace(/[^a-z0-9_]/gi, "_").toLowerCase();
           if (/^[0-9]/.test(safe)) safe = "col_" + safe; // prevent identifier starting with digit
           if (!headersMap.has(safe)) headersMap.set(safe, k);
        });
      });
      
      const cleanHeaders = Array.from(headersMap.keys());
      let sql = `-- Virtual Relational Table Export: ${tableName}\n`;
      sql += `-- Dialect: ${dialect.toUpperCase()}\n`;
      sql += `-- Total columns mapped: ${cleanHeaders.length}\n`;
      sql += `-- Total rows: ${rawItems.length}\n\n`;
      
      const q = dialect === "mysql" ? "`" : '"';
      let createStmt = `CREATE TABLE IF NOT EXISTS ${q}${tableName}${q} (\n`;
      
      if (dialect === "sqlite") {
         createStmt += `  ${q}id${q} INTEGER PRIMARY KEY AUTOINCREMENT,\n`;
      } else if (dialect === "postgres") {
         createStmt += `  ${q}id${q} SERIAL PRIMARY KEY,\n`;
      } else { // mysql
         createStmt += `  ${q}id${q} INT AUTO_INCREMENT PRIMARY KEY,\n`;
      }
      
      cleanHeaders.forEach(h => {
         createStmt += `  ${q}${h}${q} TEXT,\n`;
      });
      
      if (dialect === "mysql") {
          createStmt += `  ${q}raw_payload${q} JSON\n`;
      } else if (dialect === "postgres") {
          createStmt += `  ${q}raw_payload${q} JSONB\n`;
      } else { // sqlite
          createStmt += `  ${q}raw_payload${q} TEXT\n`;
      }
      createStmt += `);\n\n`;
      sql += createStmt;
      
      rawItems.forEach(item => {
        const flat = flattenObject(item);
        const colVals: string[] = [];
        
        cleanHeaders.forEach(h => {
          const originalKey = headersMap.get(h)!;
          let rawVal = flat[originalKey];
          if (rawVal === undefined || rawVal === null) {
              colVals.push("NULL");
          } else {
              let escaped = String(rawVal);
              if (dialect === "mysql" || dialect === "postgres") {
                  escaped = escaped.replace(/\\/g, "\\\\");
              }
              escaped = escaped.replace(/'/g, "''"); // standard SQL single quote escape
              colVals.push(`'${escaped}'`);
          }
        });
        
        let rawPayload = JSON.stringify(item);
        if (dialect === "mysql" || dialect === "postgres") {
           rawPayload = rawPayload.replace(/\\/g, "\\\\");
        }
        rawPayload = rawPayload.replace(/'/g, "''");
        
        const colsPrefix = cleanHeaders.map(c => `${q}${c}${q}`).join(", ");
        sql += `INSERT INTO ${q}${tableName}${q} (${colsPrefix}, ${q}raw_payload${q}) VALUES (${colVals.join(", ")}, '${rawPayload}');\n`;
      });
      
      fileContent = sql;
      mimeType = "application/sql";
      fileExtension = "sql";
    } else if (formatStr === "xml") {
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<dataset table="${tableName}">\n`;
      rawItems.forEach((row, r_idx) => {
        xml += `  <row index="${r_idx}">\n`;
        const flat = flattenObject(row);
        Object.entries(flat).forEach(([k, v]) => {
          const elemName = k.replace(/[^a-z0-9_]/gi, "_").replace(/^[0-9]/, "item_");
          xml += `    <${elemName}>${String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</${elemName}>\n`;
        });
        xml += `  </row>\n`;
      });
      xml += `</dataset>\n`;
      fileContent = xml;
      mimeType = "application/xml";
      fileExtension = "xml";
    } else if (formatStr === "markdown") {
      const fRows = rawItems.slice(0, 50).map(r => flattenObject(r)) as Record<string, string>[];
      const headers = Array.from(new Set(fRows.reduce<string[]>((acc, x) => [...acc, ...Object.keys(x)], []))).slice(0, 5);
      
      let md = `# Virtual Relational Table Export: ${tableName}\n`;
      md += `*Total rows represented: ${rawItems.length} (First 50 displayed)*\n\n`;
      md += `| ` + headers.join(" | ") + ` |\n`;
      md += `| ` + headers.map(() => "---").join(" | ") + ` |\n`;
      
      fRows.forEach(row => {
        md += `| ` + headers.map(h => String(row[h] || "-").replace(/\|/g, "\\|")).join(" | ") + ` |\n`;
      });

      fileContent = md;
      mimeType = "text/markdown";
      fileExtension = "md";
    }

    const blob = new Blob([fileContent], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reportTitle}.${fileExtension}`;
    link.click();
    URL.revokeObjectURL(url);
    setVdbToast({ message: `Export complete! File "${reportTitle}.${fileExtension}" downloaded successfully.`, type: "success" });
    setTimeout(() => setVdbToast({ message: "", type: null }), 4000);
  };

  const getCategoricalFieldsOnActiveItems = (items: any[]): string[] => {
    if (!items || items.length === 0) return [];
    const fields: string[] = [];
    const flatSample = flattenObject(items[0]);
    
    for (const key in flatSample) {
      const values = items.map(it => flattenObject(it)[key]).filter(v => v !== undefined && v !== null && v !== "");
      const uniqueVals = new Set(values);
      if (uniqueVals.size > 1 && uniqueVals.size <= 15 && values.length > 3) {
        fields.push(key);
      }
    }
    return fields;
  };

  const getDistributionData = (items: any[], groupField: string) => {
    if (!items || items.length === 0 || !groupField) return [];
    const counts: { [val: string]: number } = {};
    items.forEach(it => {
      const flat = flattenObject(it);
      const val = String(flat[groupField] === undefined || flat[groupField] === null ? "Unspecified" : flat[groupField]);
      counts[val] = (counts[val] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  // Build url with substituted variables and pagination queries
  const buildPageRequestUrl = (
    baseUrlStr: string,
    pageVal: number,
    pageParam: string,
    sizeVal: number,
    sizeParam: string,
    queryParams: QueryParamItem[]
  ): string => {
    const cleanBaseSubbed = substituteVariables(baseUrlStr);
    
    // Parse target url structure 
    let urlObj: URL;
    try {
      urlObj = new URL(cleanBaseSubbed);
    } catch (e) {
      // Direct relative string appending fallbacks
      const separator = cleanBaseSubbed.includes("?") ? "&" : "?";
      return `${cleanBaseSubbed}${separator}${pageParam}=${pageVal}&${sizeParam}=${sizeVal}`;
    }

    // Set pagination query param values
    urlObj.searchParams.set(pageParam, pageVal.toString());
    if (sizeParam && sizeVal) {
      urlObj.searchParams.set(sizeParam, sizeVal.toString());
    }

    // Inject extra configured query variables from UI
    queryParams.forEach(qp => {
      if (qp.enabled && qp.key !== pageParam && qp.key !== sizeParam) {
        urlObj.searchParams.set(qp.key, substituteVariables(qp.value));
      }
    });

    return urlObj.toString();
  };

  // Handle addition of standard Job Entry
  const handleSaveNewJob = () => {
    if (!newJobName.trim()) return;

    // Snapshot parameters
    const headersSnapshot = currentHeaders.map(h => ({ ...h }));
    const queryParamsSnapshot = currentQueryParams.map(q => ({ ...q }));

    const newJob: ImportJob = {
      id: "job_" + Date.now(),
      name: newJobName,
      createdAt: new Date().toLocaleString(),
      status: "idle",
      currentPage: startPage,
      collectedCount: 0,
      items: [],
      logs: [
        {
          timestamp: new Date().toLocaleTimeString(),
          type: "info",
          message: `Created Import Job Blueprint. Configured pages: ${startPage} to ${endPage}.`
        }
      ],
      config: {
        url: currentUrl,
        method: currentMethod,
        headers: headersSnapshot,
        queryParams: queryParamsSnapshot,
        body: currentBody,
        detailLookup: {
          enabled: enableDetailLookup,
          referenceKeySource: detailReferenceKeySource,
          detailUrlTemplate: detailUrlTemplate,
          delayMs: detailDelayMs
        }
      },
      pagination: {
        type: "query",
        paramKey: pageParamKey,
        startValue: startPage,
        endValue: endPage,
        pageSizeKey: pageSizeParamKey,
        pageSizeValue: pageSizeValue,
        delayMs: delayBetweenPages,
        autoStopEmpty: autoStopEmpty
      }
    };

    const updated = [newJob, ...jobs];
    saveJobsToLocal(updated);
    setSelectedJobId(newJob.id);
    setShowCreator(false);
    
    // Reset inputs
    setNewJobName("");
  };

  // Clear specific Job Blueprint state
  const handleDeleteJob = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    activeJobsRef.current[id] = false;
    const filtered = jobs.filter(j => j.id !== id);
    saveJobsToLocal(filtered);
    if (selectedJobId === id) {
      setSelectedJobId(filtered.length > 0 ? filtered[0].id : null);
    }
  };

  // Clear entire logs history list for specific job
  const handleResetJobData = (id: string) => {
    const target = jobs.find(j => j.id === id);
    if (!target) return;

    activeJobsRef.current[id] = false;
    const updated = jobs.map(j => {
      if (j.id === id) {
        return {
          ...j,
          status: "idle" as const,
          currentPage: j.pagination.startValue,
          collectedCount: 0,
          items: [],
          detectedArrayKey: undefined,
          logs: [
            {
              timestamp: new Date().toLocaleTimeString(),
              type: "info",
              message: "Cleared all collected page entries and execution history."
            }
          ]
        };
      }
      return j;
    });

    saveJobsToLocal(updated);
  };

  // Sleep utility function supporting paused triggers
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Run the pagination import routine loop
  const handleStartJob = async (id: string) => {
    const job = jobs.find(j => j.id === id);
    if (!job) return;

    // Check key requirements elegantly to help them
    const hasSubKey = job.config.headers.some(
      h => h.key.toLowerCase() === "ocp-apim-subscription-key" && h.value && h.value !== "your_subscription_key_here"
    ) || envVars.some(
      ev => ev.key === "APPRENTICESHIPS_SUB_KEY" && ev.value && ev.value !== "your_subscription_key_here"
    );

    activeJobsRef.current[id] = true;

    // Set job state to running
    let currentInList = jobs.map(j => {
      if (j.id === id) {
        return {
          ...j,
          status: "running" as const,
          logs: [
            ...j.logs,
            {
              timestamp: new Date().toLocaleTimeString(),
              type: "info" as const,
              message: `Initiating multi-page loop. Target Pages: [${j.currentPage}..${j.pagination.endValue}]. Delays = ${j.pagination.delayMs}ms.`
            },
            ...(!hasSubKey ? [{
              timestamp: new Date().toLocaleTimeString(),
              type: "warning" as const,
              message: "Note: APPRENTICESHIPS_SUB_KEY placeholder detected. If requests fail with 401 Unauthorized, make sure to add your real key in Environment panel."
            }] : [])
          ]
        };
      }
      return j;
    });
    saveJobsToLocal(currentInList);

    // Loop through values
    let page = job.currentPage;
    let accumulatedItems = [...job.items];
    let detectedKey = job.detectedArrayKey || "";
    let endReached = false;
    let finalStatus: "success" | "paused" | "failed" = "success";
    let failureMsg = "";

    while (page <= job.pagination.endValue && activeJobsRef.current[id]) {
      // 1. Construct headers
      const subbedHeaders: Record<string, string> = {};
      job.config.headers.forEach(h => {
        if (h.enabled) {
          subbedHeaders[h.key] = substituteVariables(h.value);
        }
      });

      // 2. Build page URL with pagination param modifiers
      const pageUrl = buildPageRequestUrl(
        job.config.url,
        page,
        job.pagination.paramKey,
        job.pagination.pageSizeValue,
        job.pagination.pageSizeKey,
        job.config.queryParams
      );

      // Add execution start log
      const logStart: ImportJobLog = {
        timestamp: new Date().toLocaleTimeString(),
        type: "info",
        message: `[Page ${page}] Dispatching proxy HTTP ${job.config.method} request...`
      };

      // Real-time state update before fetch to show log immediately
      currentInList = currentInList.map(j => {
        if (j.id === id) {
          return {
            ...j,
            currentPage: page,
            logs: [...j.logs, logStart]
          };
        }
        return j;
      });
      setJobs(currentInList);

      try {
        // Dispatch proxy fetch
        const res = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: pageUrl,
            method: job.config.method,
            headers: subbedHeaders,
            body: substituteVariables(job.config.body)
          })
        });

        if (!res.ok) {
          throw new Error(`Remote proxy failed with server response code ${res.status}`);
        }

        const runResult = await res.json();
        
        if (runResult.status !== 200) {
          // Check for common Authentication issues
          const isAuthErr = runResult.status === 401 || runResult.status === 403;
          const msg = isAuthErr 
            ? `[HTTP ${runResult.status}] API access denied. Verification signature or Ocp-Apim-Subscription-Key header value is incorrect.`
            : `[Page ${page}] Failed: Status ${runResult.status} ${runResult.statusText || ""}`;
          
          const logErr: ImportJobLog = {
            timestamp: new Date().toLocaleTimeString(),
            type: "error",
            message: msg
          };

          currentInList = currentInList.map(j => {
            if (j.id === id) {
              return {
                ...j,
                status: "paused" as const,
                logs: [...j.logs, logErr]
              };
            }
            return j;
          });
          saveJobsToLocal(currentInList);
          activeJobsRef.current[id] = false;
          finalStatus = "paused";
          break;
        }

        // Try to parse payload
        let itemsFetched: any[] = [];
        let keyFound = detectedKey;
        let batchTotal = 0;
        let batchTotalFiltered = 0;
        let batchTotalPages = 0;

        if (runResult.body) {
          try {
            const parsed = JSON.parse(runResult.body);
            // Extract root-level metadata if present
            if (typeof parsed === 'object') {
              if (parsed.total !== undefined) batchTotal = parsed.total;
              if (parsed.totalFiltered !== undefined) batchTotalFiltered = parsed.totalFiltered;
              if (parsed.totalPages !== undefined) batchTotalPages = parsed.totalPages;
            }

            const extracted = extractArrayFromResponse(parsed);
            itemsFetched = extracted.items;
            if (extracted.detectedKey) {
              keyFound = extracted.detectedKey;
            }
          } catch (e) {
            // failed parsing JSON
          }
        }

        // Apply Deep Reference Lookup if configured
        if (job.config.detailLookup?.enabled && itemsFetched.length > 0) {
          const detailConfig = job.config.detailLookup;
          let detailAddedCount = 0;

          // Sequential mapping to avoid rate-limiting triggers
          for (let i = 0; i < itemsFetched.length; i++) {
            if (!activeJobsRef.current[id]) break; // Abort if job paused

            const item = itemsFetched[i];
            const refValue = flattenObject(item)[detailConfig.referenceKeySource] || item[detailConfig.referenceKeySource];
            
            if (refValue) {
               const compiledUrl = substituteVariables(detailConfig.detailUrlTemplate.replace("{{reference}}", String(refValue)));
               try {
                  const detailRes = await fetch("/api/import", {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      url: compiledUrl,
                      method: "GET",
                      headers: subbedHeaders
                    })
                  });

                  if (detailRes.ok) {
                    const detailResult = await detailRes.json();
                    if (detailResult.status === 200 && detailResult.body) {
                      const detailPayload = JSON.parse(detailResult.body);
                      // Merge recursively or flatly at root
                      Object.assign(item, { _detailLookup: detailPayload });
                      detailAddedCount++;
                    }
                  }
               } catch (e) {
                  // silent continue
               }
               // Throttle detail lookup request
               if (i < itemsFetched.length - 1) {
                 await sleep(detailConfig.delayMs);
               }
            }
          }

          if (detailAddedCount > 0) {
            currentInList = currentInList.map(j => {
              if (j.id === id) {
                return { ...j, logs: [...j.logs, {
                  timestamp: new Date().toLocaleTimeString(),
                  type: "info",
                  message: `[Page ${page}] Executed ${detailAddedCount} nested detail lookups mapped to "${detailConfig.referenceKeySource}".`
                }] };
              }
              return j;
            });
            setJobs(currentInList);
          }
        }

        // Check if items are loaded
        const recordsCount = itemsFetched.length;
        const deduplicated: any[] = [];
        
        // Simple deduplicator key identifier
        itemsFetched.forEach(item => {
          const uniqueId = item.id || item.vacancyReference || item.uid || item.reference || JSON.stringify(item);
          if (!accumulatedItems.some(existing => {
            const extId = existing.id || existing.vacancyReference || existing.uid || existing.reference || JSON.stringify(existing);
            return extId === uniqueId;
          })) {
            deduplicated.push(item);
          }
        });

        accumulatedItems = [...accumulatedItems, ...deduplicated];

        const logSuccess: ImportJobLog = {
          timestamp: new Date().toLocaleTimeString(),
          type: "success",
          message: `[Page ${page}] Successfully received 200 OK. Found array "${keyFound}". Loaded ${recordsCount} records (${deduplicated.length} new/unique).`
        };

        const pageMetric: PagePerformanceMetric = {
          page: page,
          latencyMs: runResult.timeMs || 450,
          recordCount: recordsCount,
          sizeBytes: runResult.sizeBytes || 4096,
          timestamp: new Date().toLocaleTimeString()
        };

        // Advance counters
        page += 1;

        // Auto stop checking
        if (job.pagination.autoStopEmpty && recordsCount < job.pagination.pageSizeValue) {
          const stopReason = recordsCount === 0 
            ? "Page returned 0 records." 
            : `Page fetched only ${recordsCount} items (expected full layout page size of ${job.pagination.pageSizeValue}).`;
          
          const logAutoStop: ImportJobLog = {
            timestamp: new Date().toLocaleTimeString(),
            type: "warning",
            message: `${stopReason} Halting loop sequence pre-emptively.`
          };

          currentInList = currentInList.map(j => {
            if (j.id === id) {
              const existingMetrics = j.pageMetrics || [];
              return {
                ...j,
                currentPage: page,
                items: accumulatedItems,
                collectedCount: accumulatedItems.length,
                detectedArrayKey: keyFound,
                logs: [...j.logs, logSuccess, logAutoStop],
                pageMetrics: [...existingMetrics, pageMetric]
              };
            }
            return j;
          });
          endReached = true;
          activeJobsRef.current[id] = false;
          break;
        }

        // Regular save increment
        currentInList = currentInList.map(j => {
          if (j.id === id) {
            const existingMetrics = j.pageMetrics || [];
            return {
              ...j,
              currentPage: page,
              items: accumulatedItems,
              collectedCount: accumulatedItems.length,
              total: batchTotal || j.total,
              totalFiltered: batchTotalFiltered || j.totalFiltered,
              totalPages: batchTotalPages || j.totalPages,
              detectedArrayKey: keyFound,
              logs: [...j.logs, logSuccess],
              pageMetrics: [...existingMetrics, pageMetric]
            };
          }
          return j;
        });

        // Set to local
        saveJobsToLocal(currentInList);

      } catch (err: any) {
        const logFetchErr: ImportJobLog = {
          timestamp: new Date().toLocaleTimeString(),
          type: "error",
          message: `[Page ${page}] Fetch runner exception: ${err.message || "Generic connectivity code fault"}`
        };

        currentInList = currentInList.map(j => {
          if (j.id === id) {
            return {
              ...j,
              status: "failed" as const,
              logs: [...j.logs, logFetchErr]
            };
          }
          return j;
        });
        saveJobsToLocal(currentInList);
        activeJobsRef.current[id] = false;
        finalStatus = "failed";
        failureMsg = err.message || "Failed request loop";
        break;
      }

      // Check delay before next loop iteration 
      if (page <= job.pagination.endValue && activeJobsRef.current[id]) {
        const delay = job.pagination.delayMs;
        const logDelay: ImportJobLog = {
          timestamp: new Date().toLocaleTimeString(),
          type: "info",
          message: `Waiting ${delay}ms rate-limiting throttle delay...`
        };

        currentInList = currentInList.map(j => {
          if (j.id === id) {
            return {
              ...j,
              logs: [...j.logs, logDelay]
            };
          }
          return j;
        });
        setJobs(currentInList);
        
        await sleep(delay);
      }
    }

    // Set end states
    currentInList = currentInList.map(j => {
      if (j.id === id) {
        let stats: any = {
          lastRunTimestamp: new Date().toLocaleString()
        };

        if (!activeJobsRef.current[id] && !endReached && finalStatus === "success") {
          stats.status = "paused" as const;
          stats.logs = [
            ...j.logs,
            {
              timestamp: new Date().toLocaleTimeString(),
              type: "warning" as const,
              message: "Import Job temporarily paused by user action."
            }
          ];
        } else if (finalStatus === "failed") {
          stats.status = "failed" as const;
          stats.errorMessage = failureMsg;
          stats.logs = [
            ...j.logs,
            {
              timestamp: new Date().toLocaleTimeString(),
              type: "error" as const,
              message: "Import loop aborted with system faults."
            }
          ];
        } else {
          stats.status = "success" as const;
          stats.logs = [
            ...j.logs,
            {
              timestamp: new Date().toLocaleTimeString(),
              type: "success" as const,
              message: `Task Successful: Multi-page run completed. Extracted ${accumulatedItems.length} total unique item records.`
            }
          ];

          // Trigger SQL AUTO SAVE for completed sequence
          if (sqlAutoSave && accumulatedItems.length > 0) {
              const safeTableName = Object.keys(vdbTables).find(tn => tn.startsWith(j.name)) 
                                      || j.name.replace(/[^a-z0-9]/gi, "_").toLowerCase() + "_" + Date.now();
              const newState = {
                  ...vdbTables,
                  [safeTableName]: accumulatedItems,
              };
              saveVdbToLocal(newState);
              setVdbToast({ message: `Job ${j.name} finished. Auto-saved ${accumulatedItems.length} valid distinct entities to VDB.`, type: "success" });
              setTimeout(() => setVdbToast({ message: "", type: null }), 4000);
          }
        }

        return {
          ...j,
          ...stats
        };
      }
      return j;
    });

    saveJobsToLocal(currentInList);
  };

  const handlePauseJob = (id: string) => {
    activeJobsRef.current[id] = false;
    const updated = jobs.map(j => {
      if (j.id === id) {
        return {
          ...j,
          status: "paused" as const,
          logs: [
            ...j.logs,
            {
              timestamp: new Date().toLocaleTimeString(),
              type: "warning" as const,
              message: "Halting run. Finishing active HTTP frame request."
            }
          ]
        };
      }
      return j;
    });
    setJobs(updated);
  };

  // Export collected results as structured JSON files
  const handleExportJson = (job: ImportJob) => {
    const dataStr2 = JSON.stringify(job.items, null, 2);
    const blob = new Blob([dataStr2], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${job.name.toLowerCase().replace(/\s+/g, "_")}_export_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export flat spreadsheet table to direct CSV
  const handleExportCsv = (job: ImportJob) => {
    if (job.items.length === 0) return;

    const flattened = job.items.map(item => flattenObject(item));
    
    // Extract unique header titles
    const allHeaders = Array.from(
      new Set(flattened.reduce<string[]>((acc, item) => [...acc, ...Object.keys(item)], []))
    );

    // Build row lines
    const csvContent = [
      allHeaders.join(","), // Headers top row
      ...flattened.map(row => 
        allHeaders.map(header => {
          let fieldVal = row[header] || "";
          // Escape quote signs
          fieldVal = fieldVal.replace(/"/g, '""');
          if (fieldVal.includes(",") || fieldVal.includes("\n") || fieldVal.includes('"')) {
            fieldVal = `"${fieldVal}"`;
          }
          return fieldVal;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${job.name.toLowerCase().replace(/\s+/g, "_")}_spreadsheet_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Prepopulate job creator form with values
  const triggerOpenCreator = () => {
    // Attempt automatic detection of pagination params inside client config URL or query params
    const pageKey = currentQueryParams.find(qp => qp.key.toLowerCase().includes("page"))?.key || "pageNumber";
    const sizeKey = currentQueryParams.find(qp => qp.key.toLowerCase().includes("size"))?.key || "pageSize";
    
    setPageParamKey(pageKey);
    setPageSizeParamKey(sizeKey);
    setNewJobName(`Import Job: ${currentName || "Custom API Endpoint"}`);
    setShowCreator(true);
  };

  const activeJob = jobs.find(j => j.id === selectedJobId);

  // Filter items in active table view
  const filteredCollectedItems = activeJob?.items.filter(item => {
    if (!searchTerm) return true;
    const jsonStr = JSON.stringify(item).toLowerCase();
    return jsonStr.includes(searchTerm.toLowerCase());
  }) || [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col min-h-[580px]" id="import-jobs-main-panel">
      
      {/* Visual Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-600" />
          <div>
            <h2 className="text-sm font-extrabold text-gray-800">Paginated Import Jobs Runner</h2>
            <p className="text-[11px] text-gray-500">Automate multi-page data extractions, format files, and throttle requests</p>
          </div>
        </div>
        
        <button
          onClick={triggerOpenCreator}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 transition-all h-8 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Setup Job from Playground
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden h-full">
        
        {/* Left column: Sidebar list of automated Job setups */}
        <div className="md:col-span-4 border-r border-gray-200 h-full p-4 flex flex-col gap-4 bg-gray-50/50">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <Layers2 className="w-3.5 h-3.5" />
            Configured Import Blueprints ({jobs.length})
          </h3>

          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[550px]" id="jobs-list-scroller">
            {jobs.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl px-4 bg-white">
                <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-gray-600">No Import Jobs Scheduled Yet</p>
                <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                  Click the button in the header to convert your active API request configuration into an automated loop job.
                </p>
              </div>
            ) : (
              jobs.map(job => {
                const isSelected = selectedJobId === job.id;
                const isRunning = job.status === "running";
                
                return (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJobId(job.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 relative group ${
                      isSelected 
                        ? "bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500/10" 
                        : "bg-white border-gray-200 hover:border-gray-300 text-gray-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="overflow-hidden">
                        <span className="text-xs font-bold text-gray-800 line-clamp-1 block leading-snug">{job.name}</span>
                        <span className="text-[9px] text-gray-400 block font-medium mt-0.5">Created: {job.createdAt}</span>
                      </div>
                      
                      {/* Active status indicator badge badge */}
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-0.5 ${
                        job.status === "success" 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                          : job.status === "failed" 
                            ? "bg-rose-50 text-rose-700 border border-rose-150 animate-pulse" 
                            : job.status === "running"
                              ? "bg-blue-100 text-blue-800 border border-blue-200 animate-pulse"
                              : "bg-gray-100 text-gray-600 border border-gray-150"
                      }`}>
                        {job.status === "running" && (
                          <RefreshCw className="w-2.5 h-2.5 animate-spin mr-0.5" />
                        )}
                        {job.status}
                      </span>
                    </div>

                    {/* Stats metrics strip */}
                    <div className="grid grid-cols-2 gap-2 bg-gray-50/70 p-1.5 rounded-lg border border-gray-150/60 text-[10px]">
                      <div>
                        <span className="text-gray-400 block uppercase font-bold text-[8px]">Extracted</span>
                        <strong className="font-mono text-gray-750 font-bold block">{job.collectedCount} records</strong>
                      </div>
                      <div>
                        <span className="text-gray-400 block uppercase font-bold text-[8px]">Progress</span>
                        <strong className="font-mono text-gray-750 font-bold block text-right">
                          Page {job.currentPage - 1}/{job.pagination.endValue}
                        </strong>
                      </div>
                    </div>

                    {/* Compact controls on list */}
                    <div className="flex items-center justify-end gap-1.5 pt-0.5 border-t border-gray-100/80 mt-1">
                      {isRunning ? (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handlePauseJob(job.id); }}
                          className="text-[9px] bg-amber-50 hover:bg-amber-100 text-amber-700 px-2 py-1 rounded transition flex items-center gap-1 font-bold"
                        >
                          <Pause className="w-2.5 h-2.5" /> Stop
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleStartJob(job.id); }}
                          className="text-[9px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-1 rounded transition flex items-center gap-1 font-bold"
                        >
                          <Play className="w-2.5 h-2.5" /> Start
                        </button>
                      )}
                      
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleResetJobData(job.id); }}
                        className="text-[9px] hover:bg-gray-100 text-gray-500 border border-gray-250 px-2 py-1 rounded transition"
                        title="Clear records"
                      >
                        Reset
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteJob(job.id, e)}
                        className="text-[9px] hover:bg-rose-50 text-rose-600 p-1 rounded transition ml-auto"
                        title="Delete entire Job"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right column: Detailed Run status, logs, & accumulated records data view */}
        <div className="md:col-span-8 flex flex-col h-full bg-white relative">
          
          {/* Global VDB Notification Banner */}
          {vdbToast.message && (
            <div className={`absolute top-4 left-4 right-4 z-40 p-4 rounded-xl shadow-lg border border-opacity-40 flex items-center gap-3 animate-in slide-in-from-top duration-300 ${
              vdbToast.type === "success" 
                ? "bg-emerald-50 border-emerald-300 text-emerald-950" 
                : vdbToast.type === "error"
                  ? "bg-rose-50 border-rose-300 text-rose-950"
                  : "bg-indigo-50 border-indigo-300 text-indigo-950"
            }`}>
              {vdbToast.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              ) : vdbToast.type === "error" ? (
                <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              ) : (
                <Database className="w-5 h-5 text-indigo-650 flex-shrink-0" />
              )}
              <span className="text-xs font-semibold flex-1 leading-normal">{vdbToast.message}</span>
              <button 
                onClick={() => setVdbToast({ message: "", type: null })}
                className="hover:bg-black/5 text-gray-500 hover:text-gray-700 p-1 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Active Job detail board */}
          {activeJob ? (
            <div className="flex-1 flex flex-col overflow-hidden h-full">
              
              {/* Detailed Metrics Strip */}
              <div className="p-4 border-b border-gray-200 bg-gray-50/30 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-extrabold text-gray-900 flex items-center gap-1.5">
                    {activeJob.name}
                    <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded font-bold text-gray-500 font-mono">
                      {activeJob.config.method}
                    </span>
                  </h4>
                  <p className="text-[10.5px] text-gray-500 font-mono truncate max-w-[280px] sm:max-w-[450px] mt-0.5">
                    Target Endpoint: {activeJob.config.url}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => triggerSyncToVdb(activeJob.name, activeJob.items)}
                    disabled={activeJob.items.length === 0}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10.5px] px-3 py-1.5 rounded-lg shadow-sm transition disabled:opacity-60"
                  >
                    <Database className="w-3.5 h-3.5" />
                    Load to Local DB
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportJson(activeJob)}
                    disabled={activeJob.items.length === 0}
                    className="flex items-center gap-1 hover:bg-gray-100 text-gray-750 font-bold text-[10.5px] border border-gray-300 px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
                  >
                    <Download className="w-3 h-3 text-indigo-500" />
                    JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportCsv(activeJob)}
                    disabled={activeJob.items.length === 0}
                    className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-250 font-bold text-[10.5px] px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
                  >
                    <FileSpreadsheet className="w-3 h-3" />
                    CSV
                  </button>
                </div>
              </div>

              {/* Progress and Configurations info */}
              <div className="p-3 border-b border-gray-200 grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="text-xs bg-gray-50 p-2.5 rounded-lg border border-gray-200/60">
                  <span className="text-gray-400 font-semibold block uppercase text-[8.5px] tracking-wider">Pagination Config</span>
                  <div className="font-medium text-gray-700 mt-1 space-y-0.5">
                    <div>Param Variable: <code className="bg-indigo-50 text-indigo-705 px-1 rounded font-mono">{activeJob.pagination.paramKey}</code></div>
                    <div>Page Size Key: <code className="bg-indigo-50 text-indigo-750 px-1 rounded font-mono">{activeJob.pagination.pageSizeKey}={activeJob.pagination.pageSizeValue}</code></div>
                  </div>
                </div>

                <div className="text-xs bg-gray-50 p-2.5 rounded-lg border border-gray-200/60">
                  <span className="text-gray-400 font-semibold block uppercase text-[8.5px] tracking-wider">Loop Parameters</span>
                  <div className="font-medium text-gray-700 mt-1 space-y-0.5">
                    <div>Pages Target: <strong className="font-bold text-gray-800">{activeJob.pagination.startValue} to {activeJob.pagination.endValue}</strong></div>
                    <div>Throttling Delay: <strong className="font-mono bg-amber-50 text-amber-800 px-1 rounded">{activeJob.pagination.delayMs}ms</strong></div>
                  </div>
                </div>

                <div className="text-xs bg-gray-50 p-2.5 rounded-lg border border-gray-200/60">
                  <span className="text-gray-400 font-semibold block uppercase text-[8.5px] tracking-wider">Automated Handlers</span>
                  <div className="font-medium text-gray-700 mt-1 space-y-0.5">
                    <div>Collected Array Key: <strong className="font-mono text-purple-600 truncate block max-w-[150px]">{activeJob.detectedArrayKey || "Locating..."}</strong></div>
                    <div>Stop on Empty: <span className="text-emerald-600 font-bold">{activeJob.pagination.autoStopEmpty ? "ACTIVE 👍" : "OFF"}</span></div>
                  </div>
                </div>
                
                <div className="text-xs bg-gray-50 p-2.5 rounded-lg border border-gray-200/60">
                  <span className="text-gray-400 font-semibold block uppercase text-[8.5px] tracking-wider">Server Metadata</span>
                  <div className="font-medium text-gray-700 mt-1 space-y-0.5">
                    <div>Total Extracted: <strong className="font-bold text-indigo-600">{activeJob.items.length}</strong> {activeJob.total ? `/ ${activeJob.total}` : ''}</div>
                    {activeJob.totalFiltered !== undefined && activeJob.totalFiltered !== 0 && (
                      <div>Total Filtered: <strong className="font-bold text-gray-800">{activeJob.totalFiltered}</strong></div>
                    )}
                    {activeJob.totalPages !== undefined && activeJob.totalPages !== 0 && (
                      <div>Total Pages: <strong className="font-bold text-gray-800">{activeJob.totalPages}</strong></div>
                    )}
                  </div>
                </div>
              </div>

              {/* Dynamic Navigation Sub-Tabs */}
              <div className="flex bg-gray-50/50 border-b border-gray-200 px-4">
                <button
                  onClick={() => setActiveRightTab("runner")}
                  className={`py-3 px-3.5 font-bold text-xs flex items-center gap-1.5 border-b-2 transition-all ${
                    activeRightTab === "runner"
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  Console & Previews
                  <span className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full text-[9px] font-mono">
                    {activeJob.items.length} records
                  </span>
                </button>
                <button
                  onClick={() => setActiveRightTab("vdb")}
                  className={`py-3 px-3.5 font-bold text-xs flex items-center gap-1.5 border-b-2 transition-all ${
                    activeRightTab === "vdb"
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  Virtual DB Studio
                  <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
                    {Object.keys(vdbTables).length} tables
                  </span>
                </button>
                <button
                  onClick={() => setActiveRightTab("stats")}
                  className={`py-3 px-3.5 font-bold text-xs flex items-center gap-1.5 border-b-2 transition-all ${
                    activeRightTab === "stats"
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Analytics & KPI
                  {activeJob.pageMetrics && activeJob.pageMetrics.length > 0 && (
                    <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold animate-pulse">
                      {activeJob.pageMetrics.length} pages
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveRightTab("php")}
                  className={`py-3 px-3.5 font-bold text-xs flex items-center gap-1.5 border-b-2 transition-all ${
                    activeRightTab === "php"
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  PHP Code Generator
                </button>
              </div>

              {/* TAB CONTENT PANES */}
              <div className="flex-1 flex flex-col overflow-hidden min-h-[350px]">
                
                {/* 1) TAB: CONSOLE & DATA PREVIEW */}
                {activeRightTab === "runner" && (
                  <div className="flex-1 flex flex-col overflow-hidden h-full">
                    {/* Visual Logs Console window */}
                    <div className="border-b border-gray-200 bg-gray-950 p-3 text-gray-100 flex flex-col overflow-hidden h-[155px]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-indigo-400" />
                          Job Execution Log stream
                        </span>
                        <span className="text-[9px] font-mono text-gray-500">Auto-Scrolling</span>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto font-mono text-[11px] leading-normal space-y-1 scrollbar-thin scrollbar-thumb-gray-800" id="live-console-view">
                        {activeJob.logs.length === 0 ? (
                          <div className="text-gray-500 italic py-4">No logged statements. Execute script above to initialize sequence details.</div>
                        ) : (
                          activeJob.logs.map((log, index) => {
                            let color = "text-gray-300";
                            if (log.type === "success") color = "text-emerald-400";
                            if (log.type === "warning") color = "text-amber-400";
                            if (log.type === "error") color = "text-rose-400";
                            
                            return (
                              <div key={index} className="flex items-start gap-2 border-b border-gray-900 pb-1">
                                <span className="text-gray-500 flex-shrink-0">[{log.timestamp}]</span>
                                <span className={color}>{log.message}</span>
                              </div>
                            );
                          })
                        )}
                        <div id="console-bottom"></div>
                      </div>
                    </div>

                    {/* Filter and Consolidated Item Records */}
                    <div className="flex-1 flex flex-col overflow-hidden p-4">
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                          <span className="bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.5 rounded-full text-[10.5px]">
                            {activeJob.items.length} records
                          </span>
                          Consolidated Array Results
                        </span>

                        {/* Quick filter text */}
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search items..."
                            className="text-xs border border-gray-250 pl-8 pr-3 py-1.5 rounded-lg w-52 max-w-sm outline-none focus:border-indigo-500 transition-all placeholder:text-gray-400 bg-white"
                          />
                        </div>
                      </div>

                      {/* Previews database */}
                      <div className="flex-1 overflow-auto border border-gray-150 rounded-xl bg-gray-55/20 bg-opacity-30">
                        {activeJob.items.length === 0 ? (
                          <div className="text-center py-16 px-4">
                            <Layers className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                            <p className="text-xs font-semibold text-gray-500">Consolidation Workspace Empty</p>
                            <p className="text-[10px] text-gray-400 max-w-sm mx-auto mt-1 leading-normal">
                              Initiate the loop sequence using the <strong className="font-semibold text-indigo-600">Start Job Loop</strong> trigger above to stream and parse paginated objects.
                            </p>
                          </div>
                        ) : filteredCollectedItems.length === 0 ? (
                          <div className="text-center py-12 px-4 text-xs text-gray-400">
                            No matches found for search string: "{searchTerm}"
                          </div>
                        ) : (
                          <table className="w-full text-left text-xs text-gray-700 border-collapse table-auto min-w-[700px]">
                            <thead className="bg-gray-100 border-b border-gray-200 text-[10.5px] font-bold text-gray-600 sticky top-0 uppercase tracking-widest">
                              <tr>
                                <th className="p-2.5 pl-4">#</th>
                                {/* Attempt smart top columns detection */}
                                {Object.keys(flattenObject(activeJob.items[0]))
                                  .slice(0, 5)
                                  .map((hdr, i) => (
                                    <th key={i} className="p-2.5 capitalize text-left">{hdr.split(".").pop()}</th>
                                  ))}
                                <th className="p-2.5 text-right pr-4">Data Raw Object</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white font-medium">
                              {filteredCollectedItems.map((item, idx) => {
                                const flat = flattenObject(item);
                                const keys = Object.keys(flat).slice(0, 5);
                                return (
                                  <tr key={idx} className="hover:bg-indigo-50/35 transition-colors">
                                    <td className="p-3 pl-4 font-mono text-[10px] text-gray-400">{idx + 1}</td>
                                    {keys.map((k, colIdx) => (
                                      <td key={colIdx} className="p-3 text-gray-700 font-sans max-w-[140px] truncate" title={flat[k]}>
                                        {flat[k] || <span className="text-gray-300 italic">-</span>}
                                      </td>
                                    ))}
                                    <td className="p-3 text-right pr-4 font-mono text-[10px]">
                                      <details className="inline-block cursor-pointer">
                                        <summary className="text-indigo-650 hover:text-indigo-800 font-bold list-none select-none">
                                          Inspect Object JSON
                                        </summary>
                                        <pre className="text-left bg-gray-950 text-emerald-400 p-3.5 rounded-xl border border-gray-800 mt-2 absolute right-4 max-w-xl max-h-60 overflow-auto shadow-2xl text-[10.5px] whitespace-pre z-20 font-bold leading-normal font-mono">
                                          {JSON.stringify(item, null, 2)}
                                        </pre>
                                      </details>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2) TAB: VIRTUAL SQL DATABASE MANAGER */}
                {activeRightTab === "vdb" && (
                  <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-4">
                    
                    {/* Database summary banner */}
                    <div className="flex items-center justify-between p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <span className="bg-indigo-600 rounded-lg p-2 text-white">
                          <Database className="w-5 h-5" />
                        </span>
                        <div>
                          <h5 className="text-xs font-bold text-indigo-950 uppercase tracking-wide">Client-Side Persistence DB</h5>
                          <p className="text-[10px] text-indigo-600 mt-0.5 leading-normal">
                            All synced datasets are stored permanently in browser storage. Generates structural SQL Insert code instantly.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-indigo-200 rounded-full shadow-sm mr-2">
                          <input type="checkbox" id="sqlAutoSave" className="w-3.5 h-3.5 accent-indigo-600" checked={sqlAutoSave} onChange={e => setSqlAutoSave(e.target.checked)} title="Automatically persist extracted schemas and data to client database upon job completion" />
                          <label htmlFor="sqlAutoSave" className="text-[10px] font-bold text-indigo-800 tracking-wide uppercase cursor-pointer select-none">
                            SQL Auto-Save Enabled
                          </label>
                        </div>
                        
                        <button
                          onClick={() => {
                            if (confirm("Are you sure you want to completely purge the Virtual SQL Database?")) {
                              saveVdbToLocal({});
                              setSelectedVdbTable("");
                              setSqlFilters([]);
                              setSqlSearch("");
                              setVdbToast({ message: "Simulated Database table contents and indices destroyed.", type: "error" });
                              setTimeout(() => setVdbToast({ message: "", type: null }), 4000);
                            }
                          }}
                          className="text-[10.5px] border border-rose-350 text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1"
                        >
                          <Ban className="w-3.5 h-3.5" /> Purge DB
                        </button>
                        <button
                          onClick={() => {
                            setManualJsonInput("");
                            setShowJsonImporter(!showJsonImporter);
                          }}
                          className="text-[10.5px] bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-2.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1 shadow-sm"
                        >
                          <Upload className="w-3.5 h-3.5 text-indigo-500" /> Manual File Load
                        </button>
                      </div>
                    </div>

                    {/* Manual Json array pasting panel */}
                    {showJsonImporter && (
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 shadow-inner">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-gray-700 uppercase tracking-widest flex items-center gap-1">
                            <FileCode className="w-4 h-4 text-indigo-500" /> Manually Ingest JSON Array / Dataset File
                          </label>
                          <button onClick={() => setShowJsonImporter(false)} className="text-xs text-gray-450 hover:text-gray-700">Cancel</button>
                        </div>
                        <p className="text-[10px] text-gray-500">Paste any JSON list metadata or arrays to populate custom Database Tables right inside your playground.</p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <span className="text-[10.5px] font-semibold text-gray-500 block mb-1">Target Table Name</span>
                            <input
                              type="text"
                              id="tblManualName"
                              placeholder="e.g., tbl_custom_leads"
                              className="w-full text-xs font-mono font-bold border border-gray-200 rounded-lg p-2 bg-white"
                            />
                          </div>
                        </div>

                        <textarea
                          rows={4}
                          value={manualJsonInput}
                          onChange={(e) => setManualJsonInput(e.target.value)}
                          placeholder='[\n  { "id": 1, "name": "Lead A", "location": "Manchester" },\n  { "id": 2, "name": "Lead B", "location": "Leeds" }\n]'
                          className="w-full font-mono text-xs p-2.5 border border-gray-200 bg-white rounded-lg outline-none focus:border-indigo-500"
                        />
                        
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              const inputName = (document.getElementById("tblManualName") as HTMLInputElement)?.value || "tbl_custom_dataset";
                              handleImportManualJson(inputName, manualJsonInput);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-lg"
                          >
                            Load Data into Table
                          </button>
                        </div>
                      </div>
                    )}

                    {Object.keys(vdbTables).length === 0 ? (
                      <div className="flex-1 flex flex-col justify-center items-center py-12 px-6 border-2 border-dashed border-gray-250 rounded-2xl bg-gray-50 text-center">
                        <Database className="w-10 h-10 text-gray-300 mx-auto mb-2.5" />
                        <h5 className="text-xs font-extrabold text-gray-700">Simulated Relational Store is Empty</h5>
                        <p className="text-[10.5px] text-gray-500 max-w-sm mt-1 mb-5 leading-normal">
                          You haven't synced any fetched jobs details into tables. Use the <strong className="text-indigo-600">Load to Local DB</strong> button at the top to instantiate table mappings.
                        </p>
                        <button
                          type="button"
                          onClick={() => triggerSyncToVdb(activeJob.name, activeJob.items)}
                          className="text-xs font-bold bg-indigo-60 px-3.5 py-2 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl transition shadow-sm"
                        >
                          Sync Current Run Items to `tbl_{activeJob.name.toLowerCase().replace(/[^a-z0-0_]/g, "_")}`
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 overflow-hidden h-full">
                        
                        {/* LEFT COLUMN: ACTIVE TABLES SIDEBAR */}
                        <div className="md:col-span-3 border border-gray-200 rounded-xl p-3 flex flex-col overflow-y-auto bg-gray-50/20 max-h-[350px] md:max-h-full">
                          <span className="text-[10px] uppercase tracking-wider font-extrabold text-gray-400 block mb-2">Tables Index</span>
                          <div className="space-y-1">
                            {Object.entries(vdbTables).map(([tblName, tblRowsVal]) => {
                              const tblRows = tblRowsVal as any[];
                              const isActive = tblName === selectedVdbTable;
                              return (
                                <button
                                  key={tblName}
                                  onClick={() => selectVdbTableHook(tblName)}
                                  className={`w-full text-left p-2.5 rounded-lg text-xs font-bold transition flex items-center justify-between ${
                                    isActive 
                                      ? "bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600" 
                                      : "hover:bg-gray-100 text-gray-600 border-l-4 border-transparent"
                                  }`}
                                >
                                  <span className="truncate flex items-center gap-1 font-mono">
                                    <Table className="w-3.5 h-3.5 text-gray-400" />
                                    {tblName}
                                  </span>
                                  <span className="bg-gray-200/85 text-gray-600 px-1.5 py-0.2 rounded font-mono text-[9px]">
                                    {tblRows.length} rows
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* RIGHT COLUMN: ACTIVE TABLE STUDIO PANES */}
                        <div className="md:col-span-9 flex flex-col overflow-hidden h-full space-y-3 pb-2">
                          
                          {/* SQL-LIKE COMMAND PRESET CONSOLE */}
                          <div className="border border-gray-200 rounded-xl p-3.5 bg-gray-50 bg-opacity-75 space-y-3 shadow-inner">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-gray-800 flex items-center gap-1 font-mono">
                                <Terminal className="w-4 h-4 text-indigo-500" />
                                SQL Query & Command Builder
                              </span>
                              
                              <span className="text-[10px] font-mono text-gray-405">
                                Select from {selectedVdbTable || "None"}
                              </span>
                            </div>

                            {/* TEXTUAL SQL QUERY CONSOLE */}
                            <div className="flex gap-2.5">
                              <div className="relative flex-1">
                                <span className="absolute left-2.5 top-2 py-1 select-none text-[11px] font-mono font-bold text-gray-400 uppercase">SQL</span>
                                <input
                                  type="text"
                                  value={sqlSearch}
                                  onChange={(e) => {
                                    setSqlSearch(e.target.value);
                                    setVdbPage(1);
                                  }}
                                  placeholder={`e.g., SELECT * FROM ${selectedVdbTable} WHERE title LIKE '%Software%'`}
                                  className="w-full font-mono text-xs pl-11 pr-3 py-2.5 border border-indigo-150 rounded-xl bg-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 font-bold"
                                />
                              </div>
                              <button
                                onClick={() => {
                                  // Reset query fields
                                  setSqlSearch("");
                                  setSqlFilters([]);
                                  setVdbPage(1);
                                  setVdbToast({ message: "Search filters and query caches cleared.", type: "info" });
                                  setTimeout(() => setVdbToast({ message: "", type: null }), 3000);
                                }}
                                className="text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-150 border border-indigo-200 font-bold px-3 py-2.5 rounded-xl transition"
                                title="Reset visual filters"
                              >
                                Clear Query
                              </button>
                            </div>

                            {/* VISUAL SELECT QUERY CLAUSE HELPERS */}
                            <div className="flex flex-wrap items-center gap-2 text-[10.5px]">
                              <span className="text-gray-450 font-bold font-sans">Quick Query Templates:</span>
                              <button
                                onClick={() => {
                                  setSqlSearch(`SELECT * FROM ${selectedVdbTable} WHERE title LIKE '%Apprentice%'`);
                                  setVdbPage(1);
                                }}
                                className="bg-white border border-gray-200 font-medium font-mono text-gray-650 hover:border-indigo-400 hover:text-indigo-650 px-2.5 py-1 rounded transition text-[10px]"
                              >
                                Filter title 'Apprentice'
                              </button>
                              <button
                                onClick={() => {
                                  setSqlSearch(`SELECT * FROM ${selectedVdbTable} LIMIT 10`);
                                  setVdbPage(1);
                                }}
                                className="bg-white border border-gray-200 font-medium font-mono text-gray-650 hover:border-indigo-400 hover:text-indigo-650 px-2.5 py-1 rounded transition text-[10px]"
                              >
                                Limit Top 10
                              </button>
                            </div>
                          </div>

                          {/* GRID TABLE RESULTS AREA */}
                          <div className="flex-1 flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-white max-h-[300px] md:max-h-full">
                            
                            <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
                              <span className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                                <Table className="w-3.5 h-3.5 text-indigo-600" />
                                Browse Table View (Query returned {selectVdbItemsFiltered().length} rows)
                              </span>

                              {/* FORMAT SELECTOR & SAVE EXPORTS */}
                              <div className="flex items-center gap-2">
                                <select
                                  value={vdbExportFormat}
                                  onChange={(e) => setVdbExportFormat(e.target.value as any)}
                                  className="text-xs font-bold border border-gray-300 rounded-lg p-1.5 focus:border-indigo-500 outline-none bg-white font-mono text-indigo-900"
                                >
                                  <option value="json">JSON Array (.json)</option>
                                  <option value="csv">Flattened CSV (.csv)</option>
                                  <option value="sql_sqlite">SQL SQLite (.sql)</option>
                                  <option value="sql_postgres">SQL PostgreSQL (.sql)</option>
                                  <option value="sql_mysql">SQL MySQL (.sql)</option>
                                  <option value="xml">XML Feed Tagged (.xml)</option>
                                  <option value="tsv">TSV Flat Document (.tsv)</option>
                                  <option value="markdown">Markdown Table (.md)</option>
                                </select>
                                <button
                                  onClick={() => handleExportDbTable(selectedVdbTable, vdbExportFormat)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10.5px] px-3 py-1.5 rounded-lg transition flex items-center gap-1 text-center font-sans shadow"
                                >
                                  <Download className="w-3 h-3" /> Export Table
                                </button>
                              </div>
                            </div>

                            <div className="flex-1 overflow-auto bg-gray-50 bg-opacity-35 max-h-[220px] md:max-h-full">
                              {selectVdbItemsFiltered().length === 0 ? (
                                <div className="text-center py-10 px-4 text-xs text-gray-450 italic">
                                  Query returned zero matches or table is empty columns. Verify SQL operators and strings.
                                </div>
                              ) : (
                                <table className="w-full text-left text-xs text-gray-700 border-collapse table-auto min-w-[700px]">
                                  <thead className="bg-gray-100 border-b border-gray-200 text-[10px] font-bold text-gray-500 sticky top-0 uppercase tracking-wider">
                                    <tr>
                                      <th className="p-2.5 pl-4">ROWID</th>
                                      {Object.keys(flattenObject(vdbTables[selectedVdbTable][0]))
                                        .slice(0, 5)
                                        .map((colName, index) => (
                                          <th key={index} className="p-2.5 capitalize text-left font-mono">{colName.split(".").pop()}</th>
                                        ))}
                                      <th className="p-2.5 text-right pr-4">Data Payload</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-150 bg-white">
                                    {selectVdbItemsFiltered()
                                      .slice((vdbPage - 1) * vdbPageSize, vdbPage * vdbPageSize)
                                      .map((item, idx) => {
                                        const originalRowId = (vdbPage - 1) * vdbPageSize + idx + 1;
                                        const flat = flattenObject(item);
                                        const columns = Object.keys(flat).slice(0, 5);
                                        return (
                                          <tr key={idx} className="hover:bg-indigo-50/25 transition">
                                            <td className="p-2.5 pl-4 font-mono text-[10px] text-gray-400 font-bold">{originalRowId}</td>
                                            {columns.map((col, cIdx) => (
                                              <td key={cIdx} className="p-2.5 text-gray-800 max-w-[130px] truncate" title={flat[col]}>
                                                {flat[col] === null || flat[col] === undefined ? "" : String(flat[col])}
                                              </td>
                                            ))}
                                            <td className="p-2.5 text-right pr-4">
                                              <details className="inline-block cursor-pointer">
                                                <summary className="text-[10.5px] text-indigo-650 hover:text-indigo-850 font-bold list-none select-none">
                                                  Inspect Row
                                                </summary>
                                                <pre className="text-left bg-gray-950 text-indigo-300 p-3.5 rounded-xl border border-gray-800 mt-2 absolute right-4 max-w-xl max-h-60 overflow-auto shadow-2xl text-[10.5px] whitespace-pre z-20 font-bold font-mono">
                                                  {JSON.stringify(item, null, 2)}
                                                </pre>
                                              </details>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                  </tbody>
                                </table>
                              )}
                            </div>

                            {/* INTERNAL DB PAGINATION FOOTER */}
                            {selectVdbItemsFiltered().length > vdbPageSize && (
                              <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs font-bold text-gray-650">
                                <span>Showing rows {(vdbPage - 1) * vdbPageSize + 1} to {Math.min(vdbPage * vdbPageSize, selectVdbItemsFiltered().length)} of {selectVdbItemsFiltered().length}</span>
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => setVdbPage(p => Math.max(1, p - 1))}
                                    disabled={vdbPage === 1}
                                    className="border border-gray-300 px-3 py-1 bg-white rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                                  >
                                    Previous
                                  </button>
                                  <button
                                    onClick={() => setVdbPage(p => Math.min(Math.ceil(selectVdbItemsFiltered().length / vdbPageSize), p + 1))}
                                    disabled={vdbPage >= Math.ceil(selectVdbItemsFiltered().length / vdbPageSize)}
                                    className="border border-gray-300 px-3 py-1 bg-white rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                                  >
                                    Next
                                  </button>
                                </div>
                              </div>
                            )}

                          </div>

                        </div>

                      </div>
                    )}

                  </div>
                )}

                {/* 3) TAB: PERFORMANCE & METRICS ANALYTICS */}
                {activeRightTab === "stats" && (
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    
                    {/* Check if metrics represent values */}
                    {!activeJob.pageMetrics || activeJob.pageMetrics.length === 0 ? (
                      <div className="py-16 text-center bg-gray-50 rounded-2xl border border-gray-200/60 flex flex-col items-center justify-center">
                        <BarChart3 className="w-10 h-10 text-gray-300 mb-2" />
                        <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-widest">No Real-time Metrics Recorded</h4>
                        <p className="text-[10.5px] text-gray-500 max-w-sm mt-1.5 leading-normal">
                          Metrics telemetry profiles requests page by page in real time. Please launch a dynamic scraper flow, and execution stats will plot beautifully on this screen!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        
                        {/* PERFORMANCE STAT CARDS */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          
                          <div className="bg-gradient-to-br from-indigo-50/50 to-indigo-100/30 p-3.5 rounded-xl border border-indigo-150">
                            <span className="text-gray-500 uppercase font-sans text-[8.5px] font-extrabold tracking-wider block">Total Page Queries</span>
                            <div className="mt-1 flex items-baseline gap-1.5">
                              <span className="text-xl font-black font-mono text-indigo-900">{activeJob.pageMetrics.length}</span>
                              <span className="text-[9.5px] text-indigo-505 font-bold">pages</span>
                            </div>
                            <div className="text-[9px] text-indigo-600 mt-0.5">Success Rate: 100% OK</div>
                          </div>

                          <div className="bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 p-3.5 rounded-xl border border-emerald-150">
                            <span className="text-gray-500 uppercase font-sans text-[8.5px] font-extrabold tracking-wider block">Avg Latency (ms)</span>
                            <div className="mt-1 flex items-baseline gap-1.5">
                              <span className="text-xl font-black font-mono text-emerald-900">
                                {Math.round(activeJob.pageMetrics.reduce((acc, m) => acc + m.latencyMs, 0) / activeJob.pageMetrics.length)}
                              </span>
                              <span className="text-[9.5px] text-emerald-505 font-bold">ms</span>
                            </div>
                            <div className="text-[9px] text-emerald-600 mt-0.5">Target: Under 1200ms</div>
                          </div>

                          <div className="bg-gradient-to-br from-amber-50/50 to-amber-100/30 p-3.5 rounded-xl border border-amber-150">
                            <span className="text-gray-500 uppercase font-sans text-[8.5px] font-extrabold tracking-wider block">Total Bandwidth</span>
                            <div className="mt-1 flex items-baseline gap-1.5">
                              <span className="text-xl font-black font-mono text-amber-900">
                                {(activeJob.pageMetrics.reduce((acc, m) => acc + m.sizeBytes, 0) / 1024).toFixed(1)}
                              </span>
                              <span className="text-[9.5px] text-amber-550 font-bold">KB</span>
                            </div>
                            <div className="text-[9px] text-amber-600 mt-0.5">Compressed JSON bytes</div>
                          </div>

                          <div className="bg-gradient-to-br from-purple-50/50 to-purple-100/30 p-3.5 rounded-xl border border-purple-150">
                            <span className="text-gray-500 uppercase font-sans text-[8.5px] font-extrabold tracking-wider block">Records Aggregated</span>
                            <div className="mt-1 flex items-baseline gap-1.5">
                              <span className="text-xl font-black font-mono text-purple-900">
                                {activeJob.items.length}
                              </span>
                              <span className="text-[9.5px] text-purple-500 font-bold">items</span>
                            </div>
                            <div className="text-[9px] text-purple-650 mt-0.5">Yield: {(activeJob.items.length / activeJob.pageMetrics.length).toFixed(1)} items / page</div>
                          </div>

                        </div>

                        {/* LINE AND BAR CHARTS (drawn in standard crisp vector SVGs) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          
                          {/* 1) CHART: REQUEST LATENCY (Bar) */}
                          <div className="border border-gray-200 rounded-xl p-3.5 bg-white space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold text-gray-800 uppercase tracking-widest flex items-center gap-1">
                                <TrendingUp className="w-4 h-4 text-indigo-600" />
                                Host Latency Trend (ms)
                              </span>
                              <span className="text-[9.5px] font-mono text-indigo-700 font-semibold bg-indigo-50 px-1.5 rounded">Pages 1..{activeJob.pageMetrics.length}</span>
                            </div>
                            <p className="text-[9.5px] text-gray-400">Response compilation latency in milliseconds per individual HTTP page fetching block</p>
                            
                            <div className="h-44 w-full border-b border-l border-gray-200 relative pt-4 flex items-end justify-around pb-2 font-mono">
                              {activeJob.pageMetrics.map((m, i) => {
                                // Find maximum latency to scale
                                const maxLat = Math.max(...(activeJob.pageMetrics || []).map(p => p.latencyMs), 1000);
                                const heightPercent = (m.latencyMs / maxLat) * 85; // cap height at 85%
                                return (
                                  <div key={i} className="flex-1 flex flex-col items-center group relative cursor-help" style={{ minWidth: "16px", maxWidth: "45px" }}>
                                    
                                    {/* Bar Tooltip */}
                                    <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition duration-150 bg-gray-900 text-white p-1 rounded font-mono text-[9px] whitespace-nowrap z-30 pointer-events-none shadow-md font-bold leading-none">
                                      P.{m.page}: {m.latencyMs}ms
                                    </div>

                                    {/* Styled graphical Bar */}
                                    <div 
                                      className="w-4 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t group-hover:from-indigo-500 group-hover:to-indigo-300 transition-all duration-300 shadow-sm"
                                      style={{ height: `${heightPercent}%` }}
                                    ></div>
                                    <span className="text-[9px] text-gray-450 mt-1 font-bold">P.{m.page}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* 2) CHART: DATA SIZE RECEIVED (Line) */}
                          <div className="border border-gray-200 rounded-xl p-3.5 bg-white space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold text-gray-800 uppercase tracking-widest flex items-center gap-1">
                                <Layers2 className="w-4 h-4 text-emerald-600" />
                                Response Weights (Bytes)
                              </span>
                              <span className="text-[9.5px] font-mono text-emerald-700 font-semibold bg-emerald-50 px-1.5 rounded">Byte Payload sizes</span>
                            </div>
                            <p className="text-[9.5px] text-gray-400">Total raw character body bytes transferred during each proxy loop sequence</p>
                            
                            <div className="h-44 w-full border-b border-l border-gray-200 relative pt-4 flex items-end justify-around pb-2 font-mono">
                              {activeJob.pageMetrics.map((m, i) => {
                                const max_size = Math.max(...(activeJob.pageMetrics || []).map(p => p.sizeBytes), 2048);
                                const hPercent = (m.sizeBytes / max_size) * 85;
                                return (
                                  <div key={i} className="flex-1 flex flex-col items-center group relative cursor-help" style={{ minWidth: "16px", maxWidth: "45px" }}>
                                    
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition duration-150 bg-gray-900 text-white p-1.5 rounded font-mono text-[9px] whitespace-nowrap z-30 pointer-events-none shadow-md font-bold">
                                      P.{m.page}: {(m.sizeBytes / 1024).toFixed(1)} KB
                                    </div>

                                    {/* Styled graphical Line Anchor Point */}
                                    <div className="w-full flex justify-center items-end" style={{ height: "100%" }}>
                                      <div className="w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full group-hover:bg-emerald-400 transition transform hover:scale-125 shadow-md flex-shrink-0 mb-[-7px]" style={{ marginBottom: `calc(${hPercent}% - 7px)` }}></div>
                                    </div>
                                    <span className="text-[9px] text-gray-450 mt-1 font-bold">P.{m.page}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                        </div>

                        {/* CATEGORICAL FIELD DISTRIBUTION PIE DONUT */}
                        {activeJob.items.length > 0 && (
                          <div className="border border-gray-200 rounded-xl p-3.5 bg-white space-y-3">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div>
                                <h5 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                                  <PieChart className="w-4 h-4 text-purple-600" />
                                  Database Distribution Slices
                                </h5>
                                <p className="text-[10px] text-gray-400 mt-0.5">Select a categorical field to analyze record aggregations across items.</p>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-[10.5px] font-bold text-gray-500 font-sans">Group By Column:</span>
                                <select
                                  value={statsCategoryField}
                                  onChange={(e) => setStatsCategoryField(e.target.value)}
                                  className="text-xs font-bold border border-gray-200 rounded-lg p-1.5 focus:border-indigo-500 outline-none font-mono bg-white text-indigo-900"
                                >
                                  <option value="">-- Auto-Detect Categoricals --</option>
                                  {getCategoricalFieldsOnActiveItems(activeJob.items).map(field => (
                                    <option key={field} value={field}>{field}</option>
                                  ))}
                                  {/* fallback categories if none parsed as clean under 15 */}
                                  {statsCategoryField && !getCategoricalFieldsOnActiveItems(activeJob.items).includes(statsCategoryField) && (
                                    <option value={statsCategoryField}>{statsCategoryField}</option>
                                  )}
                                </select>
                              </div>
                            </div>

                            {/* Perform grouping distributions */}
                            {(() => {
                              const usableField = statsCategoryField || getCategoricalFieldsOnActiveItems(activeJob.items)[0];
                              if (!usableField) {
                                return (
                                  <div className="text-center py-4 text-xs font-medium text-gray-400 italic">
                                    No clear repeating categorical columns detected in list structure. (Categorical column is any text key appearing under 15 unique times).
                                  </div>
                                );
                              }

                              const distData = getDistributionData(activeJob.items, usableField).slice(0, 10);
                              if (distData.length === 0) {
                                return <div className="text-xs text-gray-400 text-center py-2">Empty parameters mapping.</div>;
                              }

                              const totalSum = distData.reduce((acc, x) => acc + x.value, 0);
                              
                              // List of vibrant premium colors to paint pieces!
                              const slicesColors = [
                                "bg-indigo-600",
                                "bg-emerald-500",
                                "bg-amber-500",
                                "bg-purple-500",
                                "bg-pink-500",
                                "bg-sky-500",
                                "bg-orange-500",
                                "bg-rose-500",
                                "bg-teal-500"
                              ];

                              return (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pt-2">
                                  
                                  {/* Distribution share blocks list */}
                                  <div className="space-y-2">
                                    <span className="text-[10.5px] uppercase font-bold tracking-wider text-gray-400 block font-mono">Top unique entries for `{usableField}`</span>
                                    <div className="space-y-2">
                                      {distData.map((el, i) => {
                                        const colorClass = slicesColors[i % slicesColors.length];
                                        const sharePercent = ((el.value / totalSum) * 100).toFixed(1);
                                        return (
                                          <div key={el.name} className="space-y-1">
                                            <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                                              <span className="flex items-center gap-1.5 truncate max-w-[210px]" title={el.name}>
                                                <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`}></span>
                                                {el.name}
                                              </span>
                                              <span>{el.value} ({sharePercent}%)</span>
                                            </div>
                                            
                                            {/* Micro visual progress gauge */}
                                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                              <div className={`h-full ${colorClass}`} style={{ width: `${sharePercent}%` }}></div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Custom beautiful Pie Donut Vector SVG drawing! */}
                                  <div className="flex justify-center flex-col items-center">
                                    <div className="relative w-36 h-36 flex items-center justify-center">
                                      {/* Pie segments. For simplicity, we can render a beautiful structured donut in percentage-meter or neat nested gauges. Let's make an SVG ring! */}
                                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 42 42">
                                        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f3f4f6" strokeWidth="4.5" />
                                        
                                        {(() => {
                                          let cumulativePercent = 0;
                                          return distData.map((el, idx) => {
                                            const percent = (el.value / totalSum) * 100;
                                            const strokeDasharray = `${percent} ${100 - percent}`;
                                            const strokeDashoffset = 100 - cumulativePercent + 25; // start at top position
                                            cumulativePercent += percent;
                                            
                                            // Mapping tailwind bg color to HEX representation for SVG strokes
                                            const strokeStyles = [
                                              "#4f46e5", // indigo-600
                                              "#10b981", // emerald-500
                                              "#f59e0b", // amber-500
                                              "#a855f7", // purple-500
                                              "#ec4899", // pink-500
                                              "#0ea5e9", // sky-500
                                              "#f97316", // orange-500
                                              "#f43f5e", // rose-500
                                              "#14b8a6"  // teal-500
                                            ];
                                            const colorHex = strokeStyles[idx % strokeStyles.length];

                                            return (
                                              <circle
                                                key={el.name}
                                                cx="21"
                                                cy="21"
                                                r="15.915"
                                                fill="transparent"
                                                stroke={colorHex}
                                                strokeWidth="4.5"
                                                strokeDasharray={strokeDasharray}
                                                strokeDashoffset={strokeDashoffset}
                                                className="transition-all duration-500 hover:scale-105"
                                                title={`${el.name}: ${percent.toFixed(1)}%`}
                                              />
                                            );
                                          });
                                        })()}
                                      </svg>

                                      <div className="absolute text-center">
                                        <span className="text-[10px] text-gray-400 uppercase font-extrabold block leading-none font-sans">Dataset</span>
                                        <span className="text-sm font-black text-gray-800 leading-tight block mt-0.5">{totalSum}</span>
                                        <span className="text-[9px] text-gray-500 block leading-none">items</span>
                                      </div>
                                    </div>
                                    
                                    <span className="text-[9.5px] text-gray-400 font-bold block mt-2 text-center select-none font-sans">
                                      Proportional visual distribution of top fields
                                    </span>
                                  </div>

                                </div>
                              );
                            })()}
                          </div>
                        )}

                      </div>
                    )}

                  </div>
                )}

                {/* 4) TAB: PHP CODE GENERATOR */}
                {activeRightTab === "php" && (
                  <div className="flex-1 overflow-hidden flex flex-col">
                    <PhpClientGenerator job={activeJob} substituteVariables={substituteVariables} />
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center py-20 px-8 text-center bg-gray-50/20">
              <Database className="w-12 h-12 text-gray-350 bg-white p-3.5 rounded-2xl shadow-sm border border-gray-150 mb-3" />
              <h3 className="text-sm font-bold text-gray-700">No Active Import Job Selected</h3>
              <p className="text-xs text-gray-400 max-w-sm mt-1 leading-relaxed">
                Configure standard page values, query delay intervals, and automatic halting strategies to aggregate multiple datasets efficiently.
              </p>
            </div>
          )}

        </div>

      </div>

      {/* MODAL / BOTTOM SLIDE DRAWER Creator Creator for saved loops */}
      {showCreator && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full overflow-hidden flex flex-col animate-in fade-in zoom-in duration-250">
            
            {/* Modal header details */}
            <div className="p-4 bg-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-300" />
                <div>
                  <h4 className="text-sm font-extrabold">Publish Automated Import Blueprint</h4>
                  <p className="text-[10px] text-indigo-200">Convert active workspace URL into paginated iteration runs</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreator(false)}
                className="hover:bg-indigo-900 text-indigo-200 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Config Form field entries */}
            <div className="p-5 space-y-4 max-h-[480px] overflow-y-auto">
              
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider font-extrabold text-gray-500 block">Unique Job Title Name</label>
                <input
                  type="text"
                  value={newJobName}
                  onChange={(e) => setNewJobName(e.target.value)}
                  placeholder="e.g., Get UK SoftDev Vacancies"
                  className="w-full text-xs font-medium border border-gray-250 rounded-lg p-2.5 outline-none focus:border-indigo-500 transition-all text-gray-800 bg-white"
                />
              </div>

              {/* Param Modifier setups */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wider font-extrabold text-gray-500 block" title="The URL query parameter indicating page indexes">Page Parameter Key</label>
                  <input
                    type="text"
                    value={pageParamKey}
                    onChange={(e) => setPageParamKey(e.target.value)}
                    placeholder="pageNumber"
                    className="w-full text-xs font-mono font-medium border border-gray-250 rounded-lg p-2 bg-gray-50/50 outline-none focus:bg-white focus:border-indigo-500 transition-all text-gray-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wider font-extrabold text-gray-500 block" title="The query parameter representing items per query block">Page Size Key</label>
                  <input
                    type="text"
                    value={pageSizeParamKey}
                    onChange={(e) => setPageSizeParamKey(e.target.value)}
                    placeholder="pageSize"
                    className="w-full text-xs font-mono font-medium border border-gray-250 rounded-lg p-2 bg-gray-50/50 outline-none focus:bg-white focus:border-indigo-500 transition-all text-gray-800"
                  />
                </div>
              </div>

              {/* Steps count setups */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wider font-extrabold text-gray-500 block">Start Page</label>
                  <input
                    type="number"
                    value={startPage}
                    min="1"
                    onChange={(e) => setStartPage(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-xs font-bold font-mono border border-gray-250 rounded-lg p-2 text-center text-gray-800 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wider font-extrabold text-gray-500 block">End Page / limit</label>
                  <input
                    type="number"
                    value={endPage}
                    min="1"
                    onChange={(e) => setEndPage(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-xs font-bold font-mono border border-gray-250 rounded-lg p-2 text-center text-gray-800 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wider font-extrabold text-gray-500 block">Page Size</label>
                  <input
                    type="number"
                    value={pageSizeValue}
                    min="1"
                    onChange={(e) => setPageSizeValue(Math.max(1, parseInt(e.target.value) || 10))}
                    className="w-full text-xs font-bold font-mono border border-gray-250 rounded-lg p-2 text-center text-gray-800 bg-white"
                  />
                </div>
              </div>

              {/* Delay & auto throttling */}
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider font-extrabold text-gray-500 block flex items-center justify-between">
                  Rate-Limiter delay
                  <span className="text-gray-400 font-normal lowercase">Respect developer limits</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="100"
                    max="5000"
                    step="100"
                    value={delayBetweenPages}
                    onChange={(e) => setDelayBetweenPages(parseInt(e.target.value))}
                    className="flex-1 accent-indigo-600 cursor-pointer"
                  />
                  <span className="text-xs font-bold font-mono text-indigo-700 bg-indigo-50 px-2 py-1 rounded min-w-[70px] text-center">
                    {delayBetweenPages}ms
                  </span>
                </div>
              </div>

              {/* Auto empty checker */}
              <div className="flex items-center justify-between p-3 bg-indigo-50/55 rounded-xl border border-indigo-100/50">
                <div className="mr-3">
                  <span className="text-xs font-bold text-indigo-900 block">Auto-Halt Empty Sequences</span>
                  <span className="text-[10px] text-indigo-500 block mt-0.5">Pause execution when server page counts deplete</span>
                </div>
                <input
                  type="checkbox"
                  checked={autoStopEmpty}
                  onChange={(e) => setAutoStopEmpty(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 cursor-pointer"
                />
              </div>

              {/* Nested Detail Lookup */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Deep Detail Reference Lookup</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Extract sub-resources individually (WARNING: Slow!)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableDetailLookup}
                    onChange={(e) => setEnableDetailLookup(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600 cursor-pointer"
                  />
                </div>
                
                {enableDetailLookup && (
                  <div className="space-y-3 pt-3 border-t border-slate-200">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">List Item Reference Key Source</label>
                      <input
                        type="text"
                        value={detailReferenceKeySource}
                        onChange={(e) => setDetailReferenceKeySource(e.target.value)}
                        placeholder="e.g. vacancyReference or id"
                        className="w-full text-xs font-mono border border-slate-300 rounded p-1.5 focus:border-indigo-400 outline-none bg-white font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Detail Endpoint URL Template</label>
                      <input
                        type="text"
                        value={detailUrlTemplate}
                        onChange={(e) => setDetailUrlTemplate(e.target.value)}
                        className="w-full text-xs font-mono border border-slate-300 rounded p-1.5 focus:border-indigo-400 outline-none bg-white font-medium"
                      />
                      <span className="text-[9px] text-slate-400 block mt-0.5">Use <code className="bg-slate-200 px-1 rounded text-slate-700">{"{{reference}}"}</code> where the key should substitute.</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 flex gap-2 text-[10.5px] text-amber-800 leading-normal">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  The task snapshot aggregates current variables, authorization tokens, authentication secrets, URLs, and payloads config into a standalone runnable file sequence.
                </span>
              </div>

            </div>

            {/* Back Save buttons */}
            <div className="p-4 bg-gray-50 border-t border-gray-150 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowCreator(false)}
                className="text-xs text-gray-500 hover:text-gray-700 font-semibold px-4 py-2 hover:bg-gray-100 rounded-lg transition"
              >
                Discard
              </button>
              
              <button
                type="button"
                onClick={handleSaveNewJob}
                disabled={!newJobName.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition shadow-md disabled:opacity-50"
              >
                Create Job Blueprint
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
