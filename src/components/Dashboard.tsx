import React, { useState, useRef } from 'react';
import { format } from 'date-fns';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { 
  Briefcase, XCircle, Calendar, TrendingUp, RotateCcw, Copy, 
  Settings, Download, Upload, Trash2, CheckCircle2, AlertCircle, Search, Edit2
} from 'lucide-react';
import { toast, Toaster } from 'sonner';

import { useJobTracker } from '../hooks/useJobTracker';
import { exportToCSV, importFromCSV } from '../utils/csv';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from './ui/core';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { JobRecord } from '../types';

export default function Dashboard() {
  const {
    records, settings, stats, chartData, isLoaded,
    addRecord, deleteRecord, updateRecord, undoLast, undoLastOfType, clearAll, updateSettings, checkDuplicate, setRecords
  } = useJobTracker();

  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [chartTab, setChartTab] = useState('daily');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'apply' | 'reject'>('all');
  const [filterTime, setFilterTime] = useState<'all' | 'today' | 'week' | 'month'>('all');
  
  const [editingRecord, setEditingRecord] = useState<JobRecord | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isLoaded) return null;

  const safeConfirm = (msg: string) => {
    try {
      return window.confirm(msg);
    } catch (e) {
      return true;
    }
  };

  const handleAdd = (type: 'apply' | 'reject') => {
    if (type === 'apply' && checkDuplicate(company, jobTitle)) {
      const confirm = safeConfirm('This company and position have been recorded before. Continue?');
      if (!confirm) return;
    }

    addRecord(type, company, jobTitle, notes);
    toast.success(type === 'apply' ? 'Application recorded' : 'Rejection recorded');

    if (settings.autoClear) {
      setCompany('');
      setJobTitle('');
      setNotes('');
    }
  };

  const handleUndo = () => {
    const undone = undoLast();
    if (undone) {
      toast.info(`Undid: ${undone.type === 'apply' ? 'Application' : 'Rejection'} - ${undone.company || 'Unknown Company'}`);
    } else {
      toast.error('No records to undo');
    }
  };

  const handleQuickAdd = (type: 'apply' | 'reject') => {
    addRecord(type, '', '', '');
    toast.success(type === 'apply' ? 'Application +1' : 'Rejection +1');
  };

  const handleUndoType = (type: 'apply' | 'reject') => {
    const undone = undoLastOfType(type);
    if (undone) {
      toast.info(`Undid the latest ${type === 'apply' ? 'application' : 'rejection'}`);
    } else {
      toast.error(`No ${type === 'apply' ? 'application' : 'rejection'} records to undo`);
    }
  };

  const handleReuseLast = () => {
    const lastApply = records.find(r => r.type === 'apply');
    if (lastApply) {
      setCompany(lastApply.company);
      setJobTitle(lastApply.jobTitle);
      setNotes(lastApply.notes);
      toast.success('Filled with previous record');
    } else {
      toast.error('No previous application records');
    }
  };

  const handleDelete = (id: string) => {
    if (safeConfirm('Are you sure you want to delete this record?')) {
      deleteRecord(id);
      toast.success('Record deleted');
    }
  };

  const handleSaveEdit = () => {
    if (editingRecord) {
      updateRecord(editingRecord.id, {
        company: editingRecord.company,
        jobTitle: editingRecord.jobTitle,
        notes: editingRecord.notes,
      });
      setEditingRecord(null);
      toast.success('Record updated');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importFromCSV(file);
      setRecords(prev => [...imported, ...prev]);
      toast.success(`Successfully imported ${imported.length} records`);
    } catch (err) {
      toast.error('Import failed, please check file format');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredRecords = (Array.isArray(records) ? records : []).filter(r => {
    const matchType = filterType === 'all' || r.type === filterType;
    const matchSearch = (r.company || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (r.jobTitle || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchTime = true;
    const now = Date.now();
    const timestamp = r.timestamp || now;
    if (filterTime === 'today') {
      matchTime = new Date(timestamp).toDateString() === new Date(now).toDateString();
    } else if (filterTime === 'week') {
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
      matchTime = timestamp >= weekAgo;
    } else if (filterTime === 'month') {
      const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
      matchTime = timestamp >= monthAgo;
    }

    return matchType && matchSearch && matchTime;
  });

  const todayProgress = Math.min(100, (stats.todayApplies / settings.dailyGoal) * 100);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <Toaster position="top-center" />
      
      {/* Edit Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-semibold mb-4">Edit Record</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Company Name</label>
                <Input 
                  value={editingRecord.company} 
                  onChange={e => setEditingRecord({...editingRecord, company: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Job Title</label>
                <Input 
                  value={editingRecord.jobTitle} 
                  onChange={e => setEditingRecord({...editingRecord, jobTitle: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Notes</label>
                <Input 
                  value={editingRecord.notes} 
                  onChange={e => setEditingRecord({...editingRecord, notes: e.target.value})}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setEditingRecord(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit}>Save Changes</Button>
            </div>
          </div>
        </div>
      )}

      
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Job Application Tracker</h1>
            <p className="text-sm text-slate-500 mt-1">
              {format(new Date(), 'EEEE, MMM dd, yyyy')}
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Daily Goal</span>
              <span className="text-sm font-semibold">{stats.todayApplies} / {settings.dailyGoal}</span>
            </div>
            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-500" 
                style={{ width: `${todayProgress}%` }}
              />
            </div>
            {stats.todayApplies >= settings.dailyGoal && (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            )}
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card 
            className="col-span-2 bg-blue-600 text-white border-none cursor-pointer hover:bg-blue-700 transition-colors relative group shadow-md hover:shadow-lg"
            onClick={() => handleQuickAdd('apply')}
          >
            <CardContent className="p-6 flex flex-col justify-center h-full">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-blue-100">
                  <Briefcase className="w-5 h-5" />
                  <span className="font-medium">Total Applies</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleUndoType('apply'); }}
                  className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-blue-100 hover:text-white flex items-center gap-1 text-xs bg-blue-800/40 hover:bg-blue-800/60 px-2 py-1 rounded"
                  title="Undo last application"
                >
                  <RotateCcw className="w-3 h-3" /> Undo
                </button>
              </div>
              <div className="text-4xl font-bold">{stats.totalApplies}</div>
            </CardContent>
          </Card>
          
          <Card 
            className="col-span-2 bg-slate-800 text-white border-none cursor-pointer hover:bg-slate-900 transition-colors relative group shadow-md hover:shadow-lg"
            onClick={() => handleQuickAdd('reject')}
          >
            <CardContent className="p-6 flex flex-col justify-center h-full">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-slate-300">
                  <XCircle className="w-5 h-5" />
                  <span className="font-medium">Total Rejects</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleUndoType('reject'); }}
                  className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-slate-300 hover:text-white flex items-center gap-1 text-xs bg-slate-700/50 hover:bg-slate-700/80 px-2 py-1 rounded"
                  title="Undo last rejection"
                >
                  <RotateCcw className="w-3 h-3" /> Undo
                </button>
              </div>
              <div className="flex items-end gap-3">
                <div className="text-4xl font-bold">{stats.totalRejects}</div>
                <div className="text-sm text-slate-400 mb-1">Rejection Rate {stats.rejectRate}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1">
            <CardContent className="p-4 flex flex-col justify-center h-full">
              <span className="text-xs text-slate-500 font-medium mb-1">Today's Applies</span>
              <span className="text-2xl font-semibold text-slate-900">{stats.todayApplies}</span>
            </CardContent>
          </Card>
          
          <Card className="col-span-1">
            <CardContent className="p-4 flex flex-col justify-center h-full">
              <span className="text-xs text-slate-500 font-medium mb-1">This Week's Applies</span>
              <span className="text-2xl font-semibold text-slate-900">{stats.weekApplies}</span>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Entry */}
          <Card className="lg:col-span-1 shadow-sm border-slate-200">
            <CardHeader className="pb-4 border-b border-slate-100">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Quick Entry
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Company Name</label>
                  <Input 
                    placeholder="e.g., Google, Meta..." 
                    value={company} 
                    onChange={e => setCompany(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Job Title</label>
                  <Input 
                    placeholder="e.g., Frontend Engineer..." 
                    value={jobTitle} 
                    onChange={e => setJobTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Notes (Optional)</label>
                  <Input 
                    placeholder="e.g., Referral, LinkedIn..." 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <Button 
                  className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700" 
                  onClick={() => handleAdd('apply')}
                >
                  <Briefcase className="w-5 h-5 mr-2" />
                  Apply +1
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full h-12 text-base border-slate-300 text-slate-700 hover:bg-slate-50"
                  onClick={() => handleAdd('reject')}
                >
                  <XCircle className="w-5 h-5 mr-2 text-slate-400" />
                  Reject +1
                </Button>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <Button variant="ghost" size="sm" className="text-slate-500" onClick={handleReuseLast}>
                  <Copy className="w-4 h-4 mr-1.5" /> Reuse Last
                </Button>
                <Button variant="ghost" size="sm" className="text-slate-500" onClick={handleUndo}>
                  <RotateCcw className="w-4 h-4 mr-1.5" /> Undo Action
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <Card className="lg:col-span-2 shadow-sm border-slate-200 flex flex-col">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-slate-500" />
                  Application Trends
                </CardTitle>
                <Tabs value={chartTab} onValueChange={setChartTab} className="w-auto">
                  <TabsList>
                    <TabsTrigger value="daily" contextValue={chartTab}>Daily</TabsTrigger>
                    <TabsTrigger value="weekly" contextValue={chartTab}>Weekly</TabsTrigger>
                    <TabsTrigger value="monthly" contextValue={chartTab}>Monthly</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col">
              <div className="mb-6 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                {chartTab === 'daily' && `${chartData?.daily?.reduce((a, b) => a + b.value, 0) || 0} applications in the last 7 days`}
                {chartTab === 'weekly' && `${chartData?.weekly?.reduce((a, b) => a + b.value, 0) || 0} applications in the last 4 weeks`}
                {chartTab === 'monthly' && `${chartData?.monthly?.reduce((a, b) => a + b.value, 0) || 0} applications in the last 6 months`}
              </div>
              <div className="flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData[chartTab as keyof typeof chartData]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }} 
                      allowDecimals={false}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f1f5f9' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      {chartData[chartTab as keyof typeof chartData].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.value > 0 ? '#3b82f6' : '#cbd5e1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* History List */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-lg">History</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input 
                    placeholder="Search company or title..." 
                    className="pl-9 w-[200px] h-9 text-sm"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <select 
                  className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
                  value={filterTime}
                  onChange={e => setFilterTime(e.target.value as any)}
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
                <select 
                  className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
                  value={filterType}
                  onChange={e => setFilterType(e.target.value as any)}
                >
                  <option value="all">All Records</option>
                  <option value="apply">Applies Only</option>
                  <option value="reject">Rejects Only</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-100 uppercase">
                  <tr>
                    <th className="px-6 py-3 font-medium">Time</th>
                    <th className="px-6 py-3 font-medium">Type</th>
                    <th className="px-6 py-3 font-medium">Company</th>
                    <th className="px-6 py-3 font-medium">Title</th>
                    <th className="px-6 py-3 font-medium">Notes</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                        No records found
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.slice(0, 50).map((record) => (
                      <tr key={record.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                          {format(record.timestamp, 'MM-dd HH:mm')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${record.type === 'apply' ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                            {record.type === 'apply' ? 'Apply' : 'Reject'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {record.company || '-'}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {record.jobTitle || '-'}
                        </td>
                        <td className="px-6 py-4 text-slate-500 truncate max-w-[200px]">
                          {record.notes || '-'}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 h-8 px-2"
                            onClick={() => setEditingRecord(record)}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-2"
                            onClick={() => handleDelete(record.id)}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {filteredRecords.length > 50 && (
                <div className="p-4 text-center text-sm text-slate-500 border-t border-slate-100">
                  Showing only the latest 50 records
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Settings / Footer */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200 text-sm text-slate-500">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                checked={settings.autoClear}
                onChange={e => updateSettings({ autoClear: e.target.checked })}
              />
              Auto-clear after entry
            </label>
            <div className="flex items-center gap-2">
              <span>Daily Goal:</span>
              <Input 
                type="number" 
                className="w-16 h-7 px-2 text-xs" 
                value={settings.dailyGoal}
                onChange={e => updateSettings({ dailyGoal: parseInt(e.target.value) || 10 })}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImport}
            />
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-3 h-3 mr-1.5" /> Import CSV
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => exportToCSV(records)}>
              <Download className="w-3 h-3 mr-1.5" /> Export CSV
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs text-red-500 hover:bg-red-50" onClick={() => {
              if (safeConfirm('Warning: This will clear all local data and cannot be undone! Are you sure?')) {
                clearAll();
                toast.success('Data cleared');
              }
            }}>
              <Trash2 className="w-3 h-3 mr-1.5" /> Clear Data
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
