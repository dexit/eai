import React, { useState, useMemo, useEffect } from 'react';
import { Database, Download, RefreshCw, Layers, Clock, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, parseISO, isValid } from 'date-fns';

interface AnalyticsDashboardProps {
  vdbTables: { [tableName: string]: any[] };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function AnalyticsDashboard({ vdbTables }: AnalyticsDashboardProps) {
  const [selectedTable, setSelectedTable] = useState<string>(Object.keys(vdbTables)[0] || "");
  const [dateField, setDateField] = useState<string>("");
  const [categoryField, setCategoryField] = useState<string>("");

  const tableNames = Object.keys(vdbTables);
  const data = vdbTables[selectedTable] || [];

  // Flatten helper for nested keys
  const flattenObject = (ob: any): any => {
    const toReturn: any = {};
    for (let i in ob) {
      if (!ob.hasOwnProperty(i)) continue;
      if ((typeof ob[i]) === 'object' && ob[i] !== null) {
        if (Array.isArray(ob[i])) {
          toReturn[i] = JSON.stringify(ob[i]);
        } else {
          const flatObject = flattenObject(ob[i]);
          for (let x in flatObject) {
            if (!flatObject.hasOwnProperty(x)) continue;
            toReturn[i + '.' + x] = flatObject[x];
          }
        }
      } else {
        toReturn[i] = ob[i];
      }
    }
    return toReturn;
  };

  const flatData = useMemo(() => {
    return data.map(item => flattenObject(item));
  }, [data]);

  const availableKeys = useMemo(() => {
    const keys = new Set<string>();
    flatData.forEach(item => {
      Object.keys(item).forEach(k => keys.add(k));
    });
    return Array.from(keys).sort();
  }, [flatData]);

  // Smart field suggestions
  useEffect(() => {
    if (availableKeys.length > 0) {
      const suggestedDate = availableKeys.find(k => k.toLowerCase().includes('date') || k.toLowerCase().includes('time') || k.toLowerCase().includes('created'));
      const suggestedCategory = availableKeys.find(k => k.toLowerCase().includes('type') || k.toLowerCase().includes('status') || k.toLowerCase().includes('category') || k.toLowerCase().includes('level'));
      
      if (suggestedDate && !dateField) setDateField(suggestedDate);
      if (suggestedCategory && !categoryField) setCategoryField(suggestedCategory);
    }
  }, [availableKeys, selectedTable]);

  // Prepare time series data
  const timeSeriesData = useMemo(() => {
    if (!dateField || flatData.length === 0) return [];
    
    const countByDate: Record<string, number> = {};
    
    flatData.forEach(item => {
      if (item[dateField]) {
        let dateVal = item[dateField];
        let parsed = new Date(dateVal);
        if (typeof dateVal === 'string' && isValid(parseISO(dateVal))) {
          parsed = parseISO(dateVal);
        }
        
        if (isValid(parsed)) {
          const dateStr = format(parsed, 'yyyy-MM-dd');
          countByDate[dateStr] = (countByDate[dateStr] || 0) + 1;
        }
      }
    });

    return Object.entries(countByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [flatData, dateField]);

  // Prepare category data
  const categoryData = useMemo(() => {
    if (!categoryField || flatData.length === 0) return [];
    
    const counts: Record<string, number> = {};
    flatData.forEach(item => {
      let val = item[categoryField];
      if (val === undefined || val === null) val = 'Unknown';
      const key = String(val);
      counts[key] = (counts[key] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10
  }, [flatData, categoryField]);

  if (tableNames.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full p-8 text-center text-slate-500">
        <Database className="w-16 h-16 mb-4 text-slate-300" />
        <h2 className="text-xl font-bold text-slate-700 mb-2">No Databases Available</h2>
        <p className="max-w-md text-sm">You need to import items into memory using the Jobs Manager to view analytics.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-800">Global DB Analytics Hub</h2>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Target Table:</span>
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="px-3 py-1.5 text-sm font-medium border border-slate-300 rounded focus:border-indigo-500 outline-none bg-slate-50"
            >
              {tableNames.map(name => (
                <option key={name} value={name}>{name} ({vdbTables[name].length} rows)</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {data.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
            <p className="text-slate-500">Table is empty.</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Records</span>
                <span className="text-3xl font-extrabold text-indigo-600">{data.length.toLocaleString()}</span>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Columns (Flattened)</span>
                <span className="text-3xl font-extrabold text-indigo-600">{availableKeys.length}</span>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Data Model Scope</span>
                <span className="text-xl font-bold text-slate-700 truncate" title={selectedTable}>{selectedTable}</span>
                <span className="text-xs text-slate-400 mt-1">Active Memory Node</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Chart */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-[400px] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-slate-400" />
                    Categorical Breakdown
                  </h3>
                  <select 
                    value={categoryField}
                    onChange={(e) => setCategoryField(e.target.value)}
                    className="text-xs border border-slate-200 rounded p-1 w-48 text-ellipsis overflow-hidden"
                  >
                    <option value="">-- Select Category Column --</option>
                    {availableKeys.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                
                <div className="flex-1 relative">
                  {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [value, 'Count']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
                      Select a valid categorical column to render chart
                    </div>
                  )}
                </div>
              </div>

              {/* Time Series Chart */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-[400px] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    Growth / Timeline
                  </h3>
                  <select 
                    value={dateField}
                    onChange={(e) => setDateField(e.target.value)}
                    className="text-xs border border-slate-200 rounded p-1 w-48 text-ellipsis overflow-hidden"
                  >
                    <option value="">-- Select Date Column --</option>
                    {availableKeys.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                
                <div className="flex-1 relative">
                  {timeSeriesData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={timeSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="date" tick={{fontSize: 10}} tickMargin={10} minTickGap={20} />
                        <YAxis tick={{fontSize: 10}} allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Volume" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
                      Select a valid Date column to render timeline
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
