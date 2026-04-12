import { useState, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  orderBy, 
  getDoc,
  getDocFromServer
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { JobRecord, AppSettings, DashboardStats, RecordType } from '../types';
import { isToday, isThisWeek, isThisMonth, format, subDays, subWeeks, subMonths } from 'date-fns';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';

const defaultSettings: AppSettings = {
  autoClear: true,
  dailyGoal: 10,
};

export function useJobTracker() {
  const [records, setRecords] = useState<JobRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Test Connection
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Sync
  useEffect(() => {
    if (!isAuthReady) return;

    if (!user) {
      setRecords([]);
      setSettings(defaultSettings);
      setIsLoaded(true);
      return;
    }

    const userPath = `users/${user.uid}`;
    const recordsPath = `${userPath}/records`;
    const settingsPath = `${userPath}/settings/app`;

    // Sync Records
    const q = query(collection(db, recordsPath), orderBy('timestamp', 'desc'));
    const unsubscribeRecords = onSnapshot(q, (snapshot) => {
      const fetchedRecords = snapshot.docs.map(doc => doc.data() as JobRecord);
      setRecords(fetchedRecords);
      setIsLoaded(true);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, recordsPath);
    });

    // Sync Settings
    const unsubscribeSettings = onSnapshot(doc(db, settingsPath), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as AppSettings);
      } else {
        // Initialize settings if they don't exist
        setDoc(doc(db, settingsPath), defaultSettings).catch(e => {
          handleFirestoreError(e, OperationType.WRITE, settingsPath);
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, settingsPath);
    });

    return () => {
      unsubscribeRecords();
      unsubscribeSettings();
    };
  }, [user, isAuthReady]);

  const addRecord = async (type: RecordType, company: string, jobTitle: string, notes: string) => {
    if (!user) return null;

    const id = uuidv4();
    const newRecord: JobRecord = {
      id,
      type,
      company: company.trim(),
      jobTitle: jobTitle.trim(),
      notes: notes.trim(),
      timestamp: Date.now(),
    };

    const path = `users/${user.uid}/records/${id}`;
    try {
      await setDoc(doc(db, path), newRecord);
      return newRecord;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
      return null;
    }
  };

  const deleteRecord = async (id: string) => {
    if (!user) return;
    const path = `users/${user.uid}/records/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  };

  const updateRecord = async (id: string, updates: Partial<Omit<JobRecord, 'id' | 'timestamp'>>) => {
    if (!user) return;
    const path = `users/${user.uid}/records/${id}`;
    try {
      await updateDoc(doc(db, path), updates);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  };

  const undoLast = async () => {
    if (records.length > 0) {
      const lastRecord = records[0];
      await deleteRecord(lastRecord.id);
      return lastRecord;
    }
    return null;
  };

  const undoLastOfType = async (type: RecordType) => {
    const record = records.find(r => r.type === type);
    if (record) {
      await deleteRecord(record.id);
      return record;
    }
    return null;
  };

  const clearAll = async () => {
    if (!user) return;
    // For simplicity, we'll just delete them one by one or suggest using a batch if there are many
    // In a real app, you might want a more efficient way
    const promises = records.map(r => deleteRecord(r.id));
    await Promise.all(promises);
  };

  const updateSettings = async (updates: Partial<AppSettings>) => {
    if (!user) return;
    const path = `users/${user.uid}/settings/app`;
    try {
      await setDoc(doc(db, path), { ...settings, ...updates });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  };

  // Derived Stats
  const stats = useMemo<DashboardStats>(() => {
    let totalApplies = 0;
    let totalRejects = 0;
    let totalInterviews2 = 0;
    let totalFinals = 0;
    let todayApplies = 0;
    let weekApplies = 0;
    let monthApplies = 0;

    const safeRecords = Array.isArray(records) ? records : [];

    safeRecords.forEach(r => {
      const ts = r.timestamp || Date.now();
      if (r.type === 'apply') {
        totalApplies++;
        try {
          if (isToday(ts)) todayApplies++;
          if (isThisWeek(ts, { weekStartsOn: 1 })) weekApplies++;
          if (isThisMonth(ts)) monthApplies++;
        } catch (e) {
          console.error('Date parsing error', e);
        }
      } else if (r.type === 'reject') {
        totalRejects++;
      } else if (r.type === 'interview2') {
        totalInterviews2++;
      } else if (r.type === 'final') {
        totalFinals++;
      }
    });

    const rejectRate = totalApplies > 0 ? `${((totalRejects / totalApplies) * 100).toFixed(1)}%` : '--';

    return {
      totalApplies,
      totalRejects,
      totalInterviews2,
      totalFinals,
      todayApplies,
      weekApplies,
      monthApplies,
      rejectRate,
    };
  }, [records]);

  // Chart Data
  const chartData = useMemo(() => {
    const now = new Date();
    const safeRecords = Array.isArray(records) ? records : [];
    
    // Daily (Last 7 days)
    const dailyData = Array.from({ length: 7 }).map((_, i) => {
      const d = subDays(now, 6 - i);
      const dateStr = format(d, 'MM-dd');
      const count = safeRecords.filter(r => {
        if (r.type !== 'apply') return false;
        try {
          return format(r.timestamp || Date.now(), 'MM-dd') === dateStr;
        } catch (e) {
          return false;
        }
      }).length;
      return { name: dateStr, value: count };
    });

    // Weekly (Last 4 weeks)
    const weeklyData = Array.from({ length: 4 }).map((_, i) => {
      const d = subWeeks(now, 3 - i);
      const weekStr = `W${format(d, 'w')}`;
      const count = safeRecords.filter(r => {
        if (r.type !== 'apply') return false;
        try {
          const ts = r.timestamp || Date.now();
          return format(ts, 'w') === format(d, 'w') && format(ts, 'yyyy') === format(d, 'yyyy');
        } catch (e) {
          return false;
        }
      }).length;
      return { name: weekStr, value: count };
    });

    // Monthly (Last 6 months)
    const monthlyData = Array.from({ length: 6 }).map((_, i) => {
      const d = subMonths(now, 5 - i);
      const monthStr = format(d, 'MMM');
      const count = safeRecords.filter(r => {
        if (r.type !== 'apply') return false;
        try {
          const ts = r.timestamp || Date.now();
          return format(ts, 'MM') === format(d, 'MM') && format(ts, 'yyyy') === format(d, 'yyyy');
        } catch (e) {
          return false;
        }
      }).length;
      return { name: monthStr, value: count };
    });

    return { daily: dailyData, weekly: weeklyData, monthly: monthlyData };
  }, [records]);

  // Check for duplicates
  const checkDuplicate = (company: string, jobTitle: string) => {
    if (!company && !jobTitle) return false;
    const safeRecords = Array.isArray(records) ? records : [];
    return safeRecords.some(r => 
      r.type === 'apply' && 
      (r.company || '').toLowerCase() === (company || '').toLowerCase() && 
      (r.jobTitle || '').toLowerCase() === (jobTitle || '').toLowerCase()
    );
  };

  return {
    records,
    settings,
    stats,
    chartData,
    isLoaded,
    user,
    isAuthReady,
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
