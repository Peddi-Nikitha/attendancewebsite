"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/hooks/useAuth";
import { useEmployees } from "@/lib/firebase/hooks/useEmployees";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, AlertCircle, CheckCircle, Download, X } from "lucide-react";
import { bulkImportAttendance } from "@/lib/firebase/services/attendance";

type ImportResult = {
  success: number;
  errors: number;
  errorDetails: Array<{ row: number; employeeId: string; date: string; error: string }>;
};

export default function AdminTimesheetImportPage() {
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const { employees, loading: employeesLoading } = useEmployees();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Array<Record<string, string>> | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const isStaticAdmin = (() => {
      try { return localStorage.getItem("staticAdmin") === "true"; } catch { return false; }
    })();

    if (!isStaticAdmin) {
      if (!authLoading) {
        if (!userProfile || userProfile.role !== "admin") {
          router.replace("/login");
        }
      }
    }
  }, [router, authLoading, userProfile]);

  // Parse CSV file
  const parseCSV = (text: string): Array<Record<string, string>> => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Validate required columns
    const requiredColumns = ['date', 'employeeid', 'in', 'out'];
    const missingColumns = requiredColumns.filter(col => 
      !headers.some(h => h === col || h === col.replace('id', '_id'))
    );
    
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}. Found columns: ${headers.join(', ')}`);
    }

    const data: Array<Record<string, string>> = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      if (row.date || row.employeeid || row['employee_id']) {
        data.push(row);
      }
    }

    return data;
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setResult(null);
    setPreview(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);
        setPreview(parsed.slice(0, 5)); // Show first 5 rows as preview
      } catch (err: any) {
        setError(err.message || 'Failed to parse CSV file');
        setFile(null);
      }
    };
    reader.readAsText(selectedFile);
  };

  // Convert CSV row to import format
  const convertRowToImport = (row: Record<string, string>, rowIndex: number) => {
    // Normalize column names (handle variations)
    const employeeId = row.employeeid || row['employee_id'] || row.email || '';
    const date = row.date || '';
    const checkIn = row.in || row.checkin || row['check_in'] || '';
    const checkOut = row.out || row.checkout || row['check_out'] || '';
    const lunchBreak = row['lunch break'] || row.lunchbreak || row['lunch_break'] || row.lunch || '';
    const total = row.total || row['total hours'] || row.totalhours || '';
    const status = row.status || '';

    // Parse lunch break (can be "HH:MM-HH:MM" or duration in hours)
    let lunchBreakStart: string | undefined;
    let lunchBreakEnd: string | undefined;
    let lunchBreakDuration: number | undefined;

    if (lunchBreak) {
      if (lunchBreak.includes('-')) {
        const [start, end] = lunchBreak.split('-').map(s => s.trim());
        lunchBreakStart = start;
        lunchBreakEnd = end;
      } else {
        // Try to parse as duration (hours)
        const duration = parseFloat(lunchBreak);
        if (!isNaN(duration)) {
          lunchBreakDuration = duration;
        }
      }
    }

    // Parse total hours
    let totalHours: number | undefined;
    if (total) {
      // Handle formats like "8h 30m", "8.5", "8:30"
      const totalStr = total.toLowerCase();
      if (totalStr.includes('h') || totalStr.includes(':')) {
        // Parse "8h 30m" or "8:30"
        const hoursMatch = totalStr.match(/(\d+)h?/);
        const minutesMatch = totalStr.match(/(\d+)m/);
        const hours = hoursMatch ? parseFloat(hoursMatch[1]) : 0;
        const minutes = minutesMatch ? parseFloat(minutesMatch[1]) : 0;
        totalHours = hours + (minutes / 60);
      } else {
        totalHours = parseFloat(total);
      }
      if (isNaN(totalHours)) {
        totalHours = undefined;
      }
    }

    // Normalize status
    let normalizedStatus: "present" | "absent" | "half-day" | "holiday" | "leave" | "weekend" | undefined;
    if (status) {
      const statusLower = status.toLowerCase();
      if (statusLower.includes('leave')) {
        normalizedStatus = 'leave';
      } else if (statusLower.includes('weekend') || statusLower.includes('saturday') || statusLower.includes('sunday')) {
        normalizedStatus = 'weekend';
      } else if (statusLower.includes('holiday')) {
        normalizedStatus = 'holiday';
      } else if (statusLower.includes('absent')) {
        normalizedStatus = 'absent';
      } else if (statusLower.includes('half')) {
        normalizedStatus = 'half-day';
      } else if (statusLower.includes('present')) {
        normalizedStatus = 'present';
      }
    }

    return {
      employeeId: employeeId.trim(),
      date: date.trim(),
      checkIn: checkIn.trim() || undefined,
      checkOut: checkOut.trim() || undefined,
      lunchBreakStart,
      lunchBreakEnd,
      lunchBreakDuration,
      totalHours,
      status: normalizedStatus,
    };
  };

  // Handle import
  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setError(null);
    setResult(null);

    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      
      // Convert to import format
      const records = parsed.map((row, index) => convertRowToImport(row, index));
      
      // Filter out invalid records
      const validRecords = records.filter(r => r.employeeId && r.date);
      
      if (validRecords.length === 0) {
        throw new Error('No valid records found in CSV');
      }

      // Import to Firebase
      const importResult = await bulkImportAttendance(validRecords);
      setResult(importResult);
    } catch (err: any) {
      setError(err.message || 'Failed to import CSV');
    } finally {
      setImporting(false);
    }
  };

  // Download sample CSV
  const downloadSample = () => {
    const sample = `date,employeeId,in,out,lunch break,total,status
2025-01-15,employee@example.com,09:00,17:00,12:00-13:00,7,
2025-01-16,employee@example.com,09:30,17:30,12:30-13:30,7,
2025-01-17,employee@example.com,,,leave,0,leave
2025-01-18,employee@example.com,09:00,13:00,,4,half-day
2025-01-19,employee@example.com,09:00,17:00,12:00-13:00,7,`;
    
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timesheet-import-sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = authLoading || employeesLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Bulk Timesheet Import</h1>
        <p className="text-sm text-slate-600">Upload a CSV file to import attendance records in bulk.</p>
      </div>

      <Card>
        <CardHeader 
          title="Import CSV File" 
          subtitle="Upload a CSV file with attendance data"
        />
        <CardContent>
          <div className="space-y-4">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select CSV File
              </label>
              <div className="flex items-center gap-4">
                <label className="flex-1 cursor-pointer">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={importing}
                  />
                  <div className="flex items-center gap-3 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-4 hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
                    <Upload className="text-slate-400" size={24} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">
                        {file ? file.name : 'Click to upload CSV file'}
                      </p>
                      <p className="text-xs text-slate-500">CSV files only</p>
                    </div>
                  </div>
                </label>
                <Button
                  onClick={downloadSample}
                  variant="outline"
                  disabled={importing}
                >
                  <Download className="mr-2" size={16} />
                  Download Sample
                </Button>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
                <AlertCircle className="text-red-600 mt-0.5" size={20} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-600 hover:text-red-800"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Preview */}
            {preview && preview.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-2">Preview (first 5 rows)</h3>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {Object.keys(preview[0]).map((key) => (
                          <th key={key} className="px-3 py-2 text-left font-medium text-slate-700 border-b border-slate-200">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, index) => (
                        <tr key={index} className="hover:bg-slate-50">
                          {Object.values(row).map((value, cellIndex) => (
                            <td key={cellIndex} className="px-3 py-2 border-b border-slate-100 text-slate-600">
                              {value || '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Import Button */}
            {file && (
              <Button
                onClick={handleImport}
                disabled={importing || isLoading}
                className="w-full"
                size="lg"
              >
                {importing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Importing...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2" size={18} />
                    Import Records
                  </>
                )}
              </Button>
            )}

            {/* Result Display */}
            {result && (
              <div className={`rounded-lg border px-4 py-3 ${
                result.errors > 0 
                  ? 'border-amber-200 bg-amber-50' 
                  : 'border-green-200 bg-green-50'
              }`}>
                <div className="flex items-start gap-3">
                  {result.errors > 0 ? (
                    <AlertCircle className="text-amber-600 mt-0.5" size={20} />
                  ) : (
                    <CheckCircle className="text-green-600 mt-0.5" size={20} />
                  )}
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      result.errors > 0 ? 'text-amber-800' : 'text-green-800'
                    }`}>
                      Import Complete
                    </p>
                    <p className={`text-sm mt-1 ${
                      result.errors > 0 ? 'text-amber-700' : 'text-green-700'
                    }`}>
                      Successfully imported {result.success} record(s)
                      {result.errors > 0 && `, ${result.errors} error(s) occurred`}
                    </p>
                    {result.errorDetails.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium text-amber-800">Error Details:</p>
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {result.errorDetails.map((detail, index) => (
                            <div key={index} className="text-xs text-amber-700 bg-amber-100 rounded px-2 py-1">
                              Row {detail.row}: {detail.error} (Employee: {detail.employeeId}, Date: {detail.date})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
              <h3 className="text-sm font-medium text-blue-900 mb-2">CSV Format Requirements</h3>
              <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li><strong>Required columns:</strong> date, employeeId, in, out</li>
                <li><strong>Optional columns:</strong> lunch break, total, status</li>
                <li><strong>Date format:</strong> YYYY-MM-DD (e.g., 2025-01-15)</li>
                <li><strong>Time format:</strong> HH:MM or HH:MM:SS (e.g., 09:00, 17:30)</li>
                <li><strong>Lunch break:</strong> "HH:MM-HH:MM" (e.g., "12:00-13:00") or duration in hours</li>
                <li><strong>Status:</strong> leave, weekend, holiday, absent, half-day, or present</li>
                <li><strong>Weekends:</strong> Automatically detected (Saturday/Sunday)</li>
                <li><strong>Employee ID:</strong> Use employee email address</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

