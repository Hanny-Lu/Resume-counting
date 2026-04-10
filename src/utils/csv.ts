import Papa from 'papaparse';
import { JobRecord } from '../types';

export const exportToCSV = (records: JobRecord[]) => {
  const csv = Papa.unparse(records.map(r => ({
    Type: r.type === 'apply' ? 'Apply' : 'Reject',
    Company: r.company,
    JobTitle: r.jobTitle,
    Notes: r.notes,
    Date: new Date(r.timestamp).toLocaleString(),
    Timestamp: r.timestamp,
    ID: r.id
  })));

  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `job_tracker_export_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const importFromCSV = (file: File): Promise<JobRecord[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const importedRecords: JobRecord[] = results.data.map((row: any) => ({
            id: row.ID || crypto.randomUUID(),
            type: row.Type === 'Apply' || row.Type === 'apply' || row.Type === '投递' ? 'apply' : 'reject',
            company: row.Company || '',
            jobTitle: row.JobTitle || '',
            notes: row.Notes || '',
            timestamp: parseInt(row.Timestamp) || new Date(row.Date).getTime() || Date.now(),
          }));
          resolve(importedRecords);
        } catch (e) {
          reject(e);
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};
