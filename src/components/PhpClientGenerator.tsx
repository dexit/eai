import React, { useState } from 'react';
import { Download, FileCode, Layers, Copy, CheckCircle2 } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ImportJob } from '../types';

interface PhpClientGeneratorProps {
  job: ImportJob;
  substituteVariables: (val: string) => string;
}

export default function PhpClientGenerator({ job, substituteVariables }: PhpClientGeneratorProps) {
  const [copied, setCopied] = useState<{ [key: string]: boolean }>({});
  const [activeFile, setActiveFile] = useState<string>("index.php");

  const baseUrl = job.config.url;
  const method = job.config.method;
  const startPage = job.pagination.startValue;
  const endPage = job.pagination.endValue;
  const delayMs = job.pagination.delayMs;
  const paramKey = job.pagination.paramKey;
  const autoStop = job.pagination.autoStopEmpty;
  const rootKey = job.detectedArrayKey || "results";

  const headers = job.config.headers.filter(h => h.enabled).map(h => `    "${h.key}: " . getenv('${h.key.toUpperCase().replace(/[^a-zA-Z0-9]/g, "_")}'),`).join("\n");
  const envVars = job.config.headers.filter(h => h.enabled).map(h => `${h.key.toUpperCase().replace(/[^a-zA-Z0-9]/g, "_")}="${substituteVariables(h.value)}"`).join("\n");

  const indexPhpContent = `<?php
/**
 * Auto-Generated PHP API Scraper Client
 * Target: ${baseUrl}
 */

require_once __DIR__ . '/vendor/autoload.php';
$config = require __DIR__ . '/config/settings.php';

// Load Env
$dotenv = Dotenv\\Dotenv::createImmutable(__DIR__);
$dotenv->safeLoad();

$baseUrl = $config['api_url'];
$startPage = $config['start_page'];
$endPage = $config['end_page'];
$delayMs = $config['delay_ms'];
$delaySeconds = max(1, round($delayMs / 1000));
$paramKey = $config['param_key'];

print "Initializing scrape job for pages: {$startPage} through {$endPage}\\n";

$headers = [
${headers}
    "Accept: application/json"
];

$allResults = [];
$db = new PDO($config['db']['dsn'], $config['db']['user'], $config['db']['pass'], [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
]);

for ($page = $startPage; $page <= $endPage; $page++) {
    print "[Page {$page}] Dispatching Request...\\n";
    
    $queryParts = parse_url($baseUrl, PHP_URL_QUERY);
    $urlObj = $baseUrl . (empty($queryParts) ? "?" : "&") . "{$paramKey}={$page}";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $urlObj);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "${method}");
${job.config.body ? `    curl_setopt($ch, CURLOPT_POSTFIELDS, '${job.config.body.replace(/'/g, "\\'")}');\n` : ""}
    $response = curl_exec($ch);
    $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error || $httpcode !== 200) {
        print "ERROR [Page {$page}]: {$error} (HTTP {$httpcode})\\n";
        break;
    }
    
    $decoded = json_decode($response, true);
    
    $batch = [];
    if (isset($decoded['${rootKey}']) && is_array($decoded['${rootKey}'])) {
        $batch = $decoded['${rootKey}'];
    } elseif (isset($decoded['vacancies']) && is_array($decoded['vacancies'])) {
        $batch = $decoded['vacancies'];
    } else {
        $batch = (is_array($decoded) && isset($decoded[0])) ? $decoded : [$decoded];
    }
    
    $batchSize = count($batch);
    print "[Page {$page}] Found {$batchSize} items.\\n";

${job.config.detailLookup && job.config.detailLookup.enabled ? `
    // Deep Detail Lookup
    $detailCount = 0;
    foreach ($batch as &$item) {
        $refValue = $item['${job.config.detailLookup.referenceKeySource}'] ?? null;
        if ($refValue) {
            $compUrl = str_replace("{{reference}}", urlencode($refValue), "${job.config.detailLookup.detailUrlTemplate}");
            $chD = curl_init();
            curl_setopt($chD, CURLOPT_URL, $compUrl);
            curl_setopt($chD, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($chD, CURLOPT_HTTPHEADER, $headers);
            $detailResp = curl_exec($chD);
            if (curl_getinfo($chD, CURLINFO_HTTP_CODE) === 200) {
                 $item['_detailLookup'] = json_decode($detailResp, true);
                 $detailCount++;
            }
            curl_close($chD);
            usleep(${job.config.detailLookup.delayMs * 1000});
        }
    }
    print "Completed {$detailCount} deep record extractions.\\n";
` : ""}

    // Database insertion example
    $stmt = $db->prepare("INSERT INTO raw_payloads (data) VALUES (:data)");
    foreach ($batch as $record) {
        $stmt->execute(['data' => json_encode($record)]);
    }

    $allResults = array_merge($allResults, $batch);
    
    ${autoStop ? `if ($batchSize === 0) {
        print "Page empty. Halting pagination.\\n";
        break;
    }` : ""}
    
    if ($page < $endPage) {
        sleep($delaySeconds);
    }
}

file_put_contents('scraper_data.json', json_encode($allResults, JSON_PRETTY_PRINT));
print "Task Completed. Exported to scraper_data.json and inserted into DB.\\n";
`;

  const composerJsonContent = `{
  "name": "project/api-scraper",
  "description": "Auto-generated paginated API client",
  "type": "project",
  "require": {
    "vlucas/phpdotenv": "^5.5",
    "ext-curl": "*",
    "ext-json": "*",
    "ext-pdo": "*"
  }
}`;

  const envContent = `DB_CONNECTION=sqlite
DB_FILE=./database.sqlite

# API Authentication Details
${envVars}
`;

  const settingsPhpContent = `<?php
return [
    'api_url' => '${baseUrl}',
    'start_page' => ${startPage},
    'end_page' => ${endPage},
    'delay_ms' => ${delayMs},
    'param_key' => '${paramKey}',
    'db' => [
        'dsn' => 'sqlite:' . __DIR__ . '/../database.sqlite',
        'user' => null,
        'pass' => null
    ]
];`;

  const schemaSqlContent = `CREATE TABLE IF NOT EXISTS raw_payloads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);`;

  const files = {
    "index.php": indexPhpContent,
    "composer.json": composerJsonContent,
    ".env": envContent,
    "config/settings.php": settingsPhpContent,
    "db/schema.sql": schemaSqlContent
  };

  const handleDownloadZip = async () => {
    const zip = new JSZip();
    
    zip.file("index.php", indexPhpContent);
    zip.file("composer.json", composerJsonContent);
    zip.file(".env.example", envContent);
    zip.file(".env", envContent);
    
    const configFolder = zip.folder("config")!;
    configFolder.file("settings.php", settingsPhpContent);
    
    const dbFolder = zip.folder("db")!;
    dbFolder.file("schema.sql", schemaSqlContent);

    zip.file("README.md", "# PHP API Scraper\\n\\n1. Run \`composer install\`\\n2. Setup database: \`sqlite3 database.sqlite < db/schema.sql\`\\n3. Edit \`.env\` file\\n4. Run \`php index.php\`");
    
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, "php_scraper_project.zip");
  };

  const handleCopy = (filename: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopied({ ...copied, [filename]: true });
    setTimeout(() => setCopied({ ...copied, [filename]: false }), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-t border-slate-700">
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <div>
          <h5 className="text-xs font-bold text-slate-100 flex items-center gap-2 uppercase tracking-wide">
            <Layers className="w-4 h-4 text-purple-400" />
            PHP Paginated Project Generator
          </h5>
          <p className="text-[10px] text-slate-400 mt-1">Full structural PHP execution environment (Composer, Dotenv, PDO DB).</p>
        </div>
        <button
          onClick={handleDownloadZip}
          className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 flex items-center gap-2 rounded-lg text-xs font-bold transition shadow"
        >
          <Download className="w-4 h-4" /> Download ZIP
        </button>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Tree Map Sidebar */}
        <div className="w-48 bg-slate-800/50 border-r border-slate-800 p-2 overflow-y-auto">
          <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-2 px-2">Project Root</div>
          <div className="space-y-0.5 font-mono text-xs">
            <button
              onClick={() => setActiveFile("index.php")}
              className={`w-full text-left px-2 py-1.5 rounded transition ${activeFile === "index.php" ? "bg-purple-900/40 text-purple-300" : "text-slate-300 hover:bg-slate-800"}`}
            >
              <FileCode className="w-3 h-3 inline-block mr-1.5" /> index.php
            </button>
            <button
              onClick={() => setActiveFile("composer.json")}
              className={`w-full text-left px-2 py-1.5 rounded transition ${activeFile === "composer.json" ? "bg-purple-900/40 text-purple-300" : "text-slate-300 hover:bg-slate-800"}`}
            >
              <FileCode className="w-3 h-3 inline-block mr-1.5" /> composer.json
            </button>
            <button
              onClick={() => setActiveFile(".env")}
              className={`w-full text-left px-2 py-1.5 rounded transition ${activeFile === ".env" ? "bg-purple-900/40 text-purple-300" : "text-slate-300 hover:bg-slate-800"}`}
            >
              <FileCode className="w-3 h-3 inline-block mr-1.5" /> .env
            </button>
            
            <div className="pt-2 pb-1 px-2 flex items-center gap-1.5 text-slate-400">
              <Layers className="w-3 h-3" /> config/
            </div>
            <button
              onClick={() => setActiveFile("config/settings.php")}
              className={`w-full text-left pl-5 pr-2 py-1.5 rounded transition ${activeFile === "config/settings.php" ? "bg-purple-900/40 text-purple-300" : "text-slate-300 hover:bg-slate-800"}`}
            >
              <FileCode className="w-3 h-3 inline-block mr-1.5" /> settings.php
            </button>

            <div className="pt-2 pb-1 px-2 flex items-center gap-1.5 text-slate-400">
              <Layers className="w-3 h-3" /> db/
            </div>
            <button
              onClick={() => setActiveFile("db/schema.sql")}
              className={`w-full text-left pl-5 pr-2 py-1.5 rounded transition ${activeFile === "db/schema.sql" ? "bg-purple-900/40 text-purple-300" : "text-slate-300 hover:bg-slate-800"}`}
            >
              <FileCode className="w-3 h-3 inline-block mr-1.5" /> schema.sql
            </button>
            
          </div>
        </div>

        {/* Editor Preview */}
        <div className="flex-1 flex flex-col bg-[#0f172a]">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-[#1e293b]/50">
            <span className="text-xs font-mono text-purple-300">{activeFile}</span>
            <button
              onClick={() => handleCopy(activeFile, files[activeFile as keyof typeof files])}
              className="text-xs text-slate-400 hover:text-slate-200 transition flex items-center gap-1 bg-slate-800 px-2 py-1 rounded"
            >
              {copied[activeFile] ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              {copied[activeFile] ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <pre className="font-mono text-[11.5px] text-slate-300 leading-relaxed font-medium">
              {(files as any)[activeFile]}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
