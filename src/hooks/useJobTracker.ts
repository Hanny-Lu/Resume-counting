import { useState, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { JobRecord, AppSettings, DashboardStats, RecordType } from '../types';
import { isToday, isThisWeek, isThisMonth, startOfDay, startOfWeek, startOfMonth, format, subDays, eachDayOfInterval, subWeeks, subMonths } from 'date-fns';

const STORAGE_KEY_RECORDS = 'job_tracker_records';
const STORAGE_KEY_SETTINGS = 'job_tracker_settings';

const defaultSettings: AppSettings = {
  autoClear: true,
  dailyGoal: 10,
};

export function useJobTracker() {
  const [records, setRecords] = useState<JobRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from local storage
  useEffect(() => {
    const savedRecords = localStorage.getItem(STORAGE_KEY_RECORDS);
    const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);

    if (savedRecords) {
      try {
        setRecords(JSON.parse(savedRecords));
      } catch (e) {
        console.error('Failed to parse records', e);
      }
    }

    if (savedSettings) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
      } catch (e) {
        console.error('Failed to parse settings', e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to local storage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    }
  }, [records, settings, isLoaded]);

  const addRecord = (type: RecordType, company: string, jobTitle: string, notes: string) => {
    const newRecord: JobRecord = {
      id: uuidv4(),
      type,
      company: company.trim(),
      jobTitle: jobTitle.trim(),
      notes: notes.trim(),
      timestamp: Date.now(),
    };
    setRecords(prev => [newRecord, ...prev]);
    return newRecord;
  };

  const deleteRecord = (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  const updateRecord = (id: string, updates: Partial<Omit<JobRecord, 'id' | 'timestamp'>>) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const undoLast = () => {
    if (records.length > 0) {
      const lastRecordId = records[0].id; // Since we prepend new records
      deleteRecord(lastRecordId);
      return records[0];
    }
    return null;
  };

  const undoLastOfType = (type: RecordType) => {
    const recordIndex = records.findIndex(r => r.type === type);
    if (recordIndex !== -1) {
      const record = records[recordIndex];
      deleteRecord(record.id);
      return record;
    }
    return null;
  };

  const clearAll = () => {
    setRecords([]);
  };

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  // Derived Stats
  const stats = useMemo<DashboardStats>(() => {
    let totalApplies = 0;
    let totalRejects = 0;
    let todayApplies = 0;
    let weekApplies = 0;
    let monthApplies = 0;

    records.forEach(r => {
      if (r.type === 'apply') {
        totalApplies++;
        if (isToday(r.timestamp)) todayApplies++;
        if (isThisWeek(r.timestamp, { weekStartsOn: 1 })) weekApplies++;
        if (isThisMonth(r.timestamp)) monthApplies++;
      } else if (r.type === 'reject') {
        totalRejects++;
      }
    });

    const rejectRate = totalApplies > 0 ? `${((totalRejects / totalApplies) * 100).toFixed(1)}%` : '--';

    return {
      totalApplies,
      totalRejects,
      todayApplies,
      weekApplies,
      monthApplies,
      rejectRate,
    };
  }, [records]);

  // Chart Data
  const chartData = useMemo(() => {
    const now = new Date();
    
    // Daily (Last 7 days)
    const dailyData = Array.from({ length: 7 }).map((_, i) => {
      const d = subDays(now, 6 - i);
      const dateStr = format(d, 'MM-dd');
      const count = records.filter(r => r.type === 'apply' && format(r.timestamp, 'MM-dd') === dateStr).length;
      return { name: dateStr, value: count };
    });

    // Weekly (Last 4 weeks)
    const weeklyData = Array.from({ length: 4 }).map((_, i) => {
      const d = subWeeks(now, 3 - i);
      const weekStr = `W${format(d, 'w')}`;
      const count = records.filter(r => r.type === 'apply' && format(r.timestamp, 'w') === format(d, 'w') && format(r.timestamp, 'yyyy') === format(d, 'yyyy')).length;
      return { name: weekStr, value: count };
    });

    // Monthly (Last 6 months)
    const monthlyData = Array.from({ length: 6 }).map((_, i) => {
      const d = subMonths(now, 5 - i);
      const monthStr = format(d, 'MM月');
      const count = records.filter(r => r.type === 'apply' && format(r.timestamp, 'MM') === format(d, 'MM') && format(r.timestamp, 'yyyy') === format(d, 'yyyy')).length;
      return { name: monthStr, value: count };
    });

    return { daily: dailyData, weekly: weeklyData, monthly: monthlyData };
  }, [records]);

  // Check for duplicates
  const checkDuplicate = (company: string, jobTitle: string) => {
    if (!company && !jobTitle) return false;
    return records.some(r => 
      r.type === 'apply' && 
      r.company.toLowerCase() === company.toLowerCase() && 
      r.jobTitle.toLowerCase() === jobTitle.toLowerCase()
    );
  };

  return {
    records,
    settings,
    stats,
    chartData,
    isLoaded,
    addRecord,
    deleteRecord,
    updateRecord,
    undoLast,
    undoLastOfType,
    clearAll,
    updateSettings,
    checkDuplicate,
    setRecords, // For import
  };
}
