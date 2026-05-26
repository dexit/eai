import React, { useState, useEffect, useRef } from "react";
import { 
  Check, 
  Trash2, 
  FileCode, 
  AlignLeft, 
  Copy, 
  HelpCircle,
  AlertTriangle,
  Info,
  Maximize2,
  Minimize2,
  ListRestart
} from "lucide-react";

interface RequestBodyEditorProps {
  value: string;
  onChange: (newValue: string) => void;
  jsonValidationError: string | null;
}

export default function RequestBodyEditor({ 
  value, 
  onChange, 
  jsonValidationError 
}: RequestBodyEditorProps) {
  const [editorMode, setEditorMode] = useState<"edit" | "preview">("edit");
  const [copied, setCopied] = useState(false);
  const [lineCount, setLineCount] = useState(1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync line numbers
  useEffect(() => {
    const lines = value.split("\n").length;
    setLineCount(Math.max(lines, 1));
  }, [value]);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tryBeautify = () => {
    if (!value.trim()) return;
    try {
      const parsed = JSON.parse(value);
      onChange(JSON.stringify(parsed, null, 2));
    } catch (e) {
      // Keep original but print error
    }
  };

  const tryMinify = () => {
    if (!value.trim()) return;
    try {
      const parsed = JSON.parse(value);
      onChange(JSON.stringify(parsed));
    } catch (e) {
      // Keep original
    }
  };

  const loadDemoPayload = (type: string) => {
    let payload = "";
    if (type === "search") {
      payload = JSON.stringify({
        searchTerm: "Developer",
        pageNumber: 1,
        pageSize: 10,
        sort: "Age",
        filters: {
          location: "London",
          distanceInMiles: 15,
          routes: ["Digital", "Creative"]
        }
      }, null, 2);
    } else if (type === "create") {
      payload = JSON.stringify({
        title: "Trainee Software Engineer Apprentice",
        shortDescription: "Excellent growth opportunity for candidate passionate about code craftsmanship.",
        numberOfPositions: 2,
        programmeId: "96",
        apprenticeshipRoute: "Digital",
        wage: {
          wageType: "ApprenticeshipMinimum",
          workingWeekDescription: "37.5 hours, Mon to Fri"
        }
      }, null, 2);
    } else {
      payload = JSON.stringify({
        clientId: "{{CLIENT_ID}}",
        clientSecret: "{{CLIENT_SECRET}}",
        scope: "recruitment:read"
      }, null, 2);
    }
    onChange(payload);
  };

  // Safe syntax highlight processor for standard key-value styling
  const highlightJson = (jsonStr: string): string => {
    if (!jsonStr) return '<span class="text-gray-400">// Empty body value</span>';
    // Escape standard HTML tags
    let escaped = jsonStr
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Match keywords, keys, strings, booleans, null, numbers
    return escaped.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        let cls = "text-amber-600 dark:text-amber-500 font-mono"; // default: number
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = "text-indigo-600 dark:text-indigo-400 font-semibold font-mono"; // key
          } else {
            cls = "text-emerald-600 dark:text-emerald-400 font-mono"; // string
          }
        } else if (/true|false/.test(match)) {
          cls = "text-purple-600 dark:text-purple-400 font-mono font-medium"; // boolean
        } else if (/null/.test(match)) {
          cls = "text-gray-400 dark:text-gray-500 font-mono italic"; // null
        }
        
        if (/:$/.test(match)) {
          return `<span class="${cls}">${match.slice(0, -1)}</span><span class="text-gray-400 font-mono">:</span>`;
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
  };

  // Keyboard TAB handler inside Textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const val = e.currentTarget.value;
      const newValue = val.substring(0, start) + "  " + val.substring(end);
      onChange(newValue);
      
      // Reset cursor position
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  const isValid = value.trim() === "" || !jsonValidationError;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col">
      {/* Editor Control Header Header Menu */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <FileCode className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-bold text-gray-700">JSON Request Body Payload</span>
          
          <div className="flex bg-gray-200/70 p-0.5 rounded-lg ml-3">
            <button
              type="button"
              onClick={() => setEditorMode("edit")}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition ${
                editorMode === "edit" 
                  ? "bg-white text-gray-800 shadow-sm" 
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Editor Mode
            </button>
            <button
              type="button"
              onClick={() => setEditorMode("preview")}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition ${
                editorMode === "preview" 
                  ? "bg-white text-gray-800 shadow-sm" 
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Live Highlighted
            </button>
          </div>
        </div>

        {/* Toolbar operations */}
        <div className="flex items-center gap-1.5">
          {value.trim() && (
            <>
              <button
                type="button"
                onClick={tryBeautify}
                disabled={!!jsonValidationError}
                className="text-[10px] bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 px-2 py-1 rounded-md transition disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1"
                title="Format JSON Code"
              >
                <AlignLeft className="w-3 h-3" />
                Format JSON
              </button>
              <button
                type="button"
                onClick={tryMinify}
                disabled={!!jsonValidationError}
                className="text-[10px] bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 px-2 py-1 rounded-md transition disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1"
                title="Compress to single line"
              >
                <Minimize2 className="w-3 h-3" />
                Minify
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[10px] bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 px-2.5 py-1 rounded-md transition flex items-center gap-1"
                title="Copy body code"
              >
                {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-150 px-2 py-1 rounded-md transition"
                title="Clear content"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Editor Main Canvas Row */}
      <div className="flex relative h-60 min-h-[220px]">
        {/* Editor Screen */}
        {editorMode === "edit" ? (
          <div className="flex w-full overflow-hidden bg-gray-900 text-gray-100">
            {/* Standard Gutter Line Counter */}
            <div className="bg-gray-950/80 p-3 select-none text-right font-mono text-[11px] text-gray-600 border-r border-gray-800/80 min-w-[40px] flex flex-col pt-3.5">
              {Array.from({ length: lineCount }).map((_, i) => (
                <div key={i} className="leading-5 h-5">{i + 1}</div>
              ))}
            </div>

            {/* Editing field */}
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='{&#10;  "title": "Enter your payload JSON structure here..."&#10;}'
              className="flex-1 font-mono text-[12px] p-3.5 bg-gray-900 text-gray-100 outline-none resize-none h-full overflow-y-auto leading-5 caret-blue-400"
              spellCheck={false}
              id="raw-json-body-textarea"
            />
          </div>
        ) : (
          /* Realtime Highlighter Preview Screen */
          <div className="w-full bg-gray-950 text-gray-200 p-4 overflow-y-auto font-mono text-[12px] leading-5 select-text">
            <pre 
              dangerouslySetInnerHTML={{ __html: highlightJson(value) }} 
              className="whitespace-pre-wrap break-all"
            />
          </div>
        )}
      </div>

      {/* Footer Validation Status Bar */}
      <div className={`p-2.5 border-t px-4 flex items-center justify-between gap-4 text-xs transition-colors ${
        value.trim() === "" 
          ? "bg-gray-50 border-gray-200 text-gray-500" 
          : isValid 
            ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/15 dark:text-emerald-400" 
            : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-900/15 dark:text-rose-400"
      }`}>
        <div className="flex items-center gap-1.5">
          {value.trim() === "" ? (
            <>
              <Info className="w-4 h-4 text-gray-400" />
              <span>Empty request payload body. No parameters will be post-sent with this HTTP execution.</span>
            </>
          ) : isValid ? (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></div>
              <Check className="w-4 h-4 text-emerald-600" />
              <strong className="font-semibold">Valid JSON Syntax Verified</strong>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-rose-600 animate-bounce" />
              <div className="flex flex-col">
                <span className="font-bold">Syntax Invalid JSON Formatting Error:</span>
                <span className="text-[11px] opacity-90 leading-tight font-mono whitespace-normal">{jsonValidationError}</span>
              </div>
            </>
          )}
        </div>

        {/* Demo Payload Quick Setters */}
        <div className="flex items-center gap-1 bg-white/70 shadow-inner px-2 py-1 rounded-lg border border-gray-200/50">
          <span className="text-[10px] text-gray-400 font-semibold uppercase">Insert Blueprint:</span>
          <button 
            type="button" 
            onClick={() => loadDemoPayload("search")} 
            className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline px-1 py-0.5"
          >
            Search
          </button>
          <span className="text-gray-300">|</span>
          <button 
            type="button" 
            onClick={() => loadDemoPayload("create")} 
            className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline px-1 py-0.5"
          >
            Draft
          </button>
          <span className="text-gray-300">|</span>
          <button 
            type="button" 
            onClick={() => loadDemoPayload("credentials")} 
            className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline px-1 py-0.5"
          >
            Auth Token
          </button>
        </div>
      </div>
    </div>
  );
}
