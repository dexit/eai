import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Copy } from 'lucide-react';

interface JSONTreeExplorerProps {
  data: any;
  rootName?: string;
  defaultExpanded?: boolean;
}

interface TreeNodeProps {
  label: string;
  value: any;
  path: string;
  isRoot?: boolean;
  isLast?: boolean;
  defaultExpanded?: boolean;
}

const TreeNode: React.FC<TreeNodeProps> = ({ label, value, path, isRoot = false, isLast = true, defaultExpanded = false }) => {
  const [expanded, setExpanded] = useState(defaultExpanded || isRoot);
  const [copied, setCopied] = useState(false);

  const isObject = typeof value === 'object' && value !== null;
  const isArray = Array.isArray(value);
  const isEmpty = isObject && Object.keys(value).length === 0;

  const handleCopyPath = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  const renderValue = () => {
    if (value === null) return <span className="text-gray-400 italic">null</span>;
    if (typeof value === 'boolean') return <span className="text-purple-600 font-bold">{value ? 'true' : 'false'}</span>;
    if (typeof value === 'number') return <span className="text-blue-600">{value}</span>;
    if (typeof value === 'string') return <span className="text-green-600">"{value}"</span>;
    return <span className="text-gray-500 italic">unknown</span>;
  };

  if (isObject) {
    const keys = Object.keys(value);
    const bracketOpen = isArray ? '[' : '{';
    const bracketClose = isArray ? ']' : '}';
    const itemType = isArray ? 'items' : 'keys';

    return (
      <div className="font-mono text-sm leading-6">
        <div 
          className="flex items-center group cursor-pointer select-none hover:bg-gray-100/50 rounded px-1 -mx-1"
          onClick={toggleExpand}
        >
          <div className="w-4 h-4 flex items-center justify-center mr-1 text-gray-400">
            {!isEmpty && (expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />)}
          </div>
          {label && (
            <span className="text-indigo-700 mr-2 font-medium">
              "{label}":
            </span>
          )}
          <span className="text-gray-500 mr-2">{bracketOpen}</span>
          {!expanded && !isEmpty && (
            <span className="text-gray-400 text-[10px] italic">
              {keys.length} {itemType}
            </span>
          )}
          {(expanded && isEmpty) || !expanded ? (
            <span className="text-gray-500">{bracketClose}{!isLast && ','}</span>
          ) : null}
          
          {/* Path copy action */ }
          <button 
            onClick={handleCopyPath}
            title={`Copy Path: ${path}`}
            className="ml-auto opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
          >
            {copied ? <span className="text-[9px] font-bold text-emerald-600 px-1">COPIED!</span> : <Copy className="w-3 h-3" />}
          </button>
        </div>

        {expanded && !isEmpty && (
          <div className="pl-5 border-l border-gray-200 ml-2 mt-1 gap-1 flex flex-col">
            {keys.map((key, index) => {
              const childPath = isRoot ? key : isArray ? `${path}[${key}]` : `${path}.${key}`;
              return (
                <TreeNode 
                  key={key} 
                  label={isArray ? '' : key} 
                  value={value[key as keyof typeof value]} 
                  path={childPath}
                  isLast={index === keys.length - 1}
                  defaultExpanded={defaultExpanded}
                />
              );
            })}
            <div className="text-gray-500">{bracketClose}{!isLast && ','}</div>
          </div>
        )}
      </div>
    );
  }

  // Primitive value rendering
  return (
    <div className="font-mono text-sm leading-6 flex items-center group hover:bg-gray-100/50 rounded px-1 -mx-1">
      <div className="w-5 pr-1"></div>
      {label && <span className="text-indigo-700 mr-2">"{label}":</span>}
      {renderValue()}
      {!isLast && <span className="text-gray-500">,</span>}
      
      <button 
        onClick={handleCopyPath}
        title={`Copy Path: ${path}`}
        className="ml-auto opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
      >
        {copied ? <span className="text-[9px] font-bold text-emerald-600 px-1">COPIED!</span> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
};

export default function JSONTreeExplorer({ data, rootName = 'root', defaultExpanded = false }: JSONTreeExplorerProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter implementation
  const filterData = (obj: any, term: string): any => {
    if (!term) return obj;
    const lowerTerm = term.toLowerCase();

    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
      return String(obj).toLowerCase().includes(lowerTerm) ? obj : undefined;
    }

    if (Array.isArray(obj)) {
      const filteredArr = obj.map(item => filterData(item, term)).filter(item => item !== undefined);
      return filteredArr.length > 0 ? filteredArr : undefined;
    }

    if (typeof obj === 'object' && obj !== null) {
      const filteredObj: any = {};
      let hasMatch = false;
      Object.entries(obj).forEach(([key, value]) => {
        if (key.toLowerCase().includes(lowerTerm)) {
          filteredObj[key] = value;
          hasMatch = true;
        } else {
          const childMatch = filterData(value, term);
          if (childMatch !== undefined) {
            filteredObj[key] = childMatch;
            hasMatch = true;
          }
        }
      });
      return hasMatch ? filteredObj : undefined;
    }

    return undefined;
  };

  const displayData = filterData(data, searchTerm);

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="p-2 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
         <div className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-2">JSON Explorer</div>
         <div className="w-64 max-w-full">
            <input 
              type="text" 
              placeholder="Search keys or values..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-200 rounded outline-none focus:border-indigo-400 text-gray-700 font-mono shadow-sm"
            />
         </div>
      </div>
      <div className="p-4 overflow-y-auto flex-1 h-[400px]">
        {displayData === undefined ? (
           <div className="text-gray-400 text-xs italic">No matching results found in the JSON tree...</div>
        ) : (
          <TreeNode 
            label="" 
            value={displayData} 
            path={rootName === 'root' ? '' : rootName} 
            isRoot={true} 
            defaultExpanded={defaultExpanded || !!searchTerm}
          />
        )}
      </div>
    </div>
  );
}
