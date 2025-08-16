import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, Database, AlertCircle, CheckCircle, X } from 'lucide-react';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useExercisesStore } from '@/store/exercisesStore';
import { useWorkoutsStore } from '@/store/workoutsStore';

interface ImportPreview {
  type: 'csv' | 'json';
  filename: string;
  size: number;
  workouts: number;
  exercises: number;
  measurements: number;
  conflicts: string[];
}

interface ImportResult {
  success: boolean;
  setsAdded: number;
  duplicatesSkipped: number;
  errors: string[];
}

export default function Import() {
  const navigate = useNavigate();
  const { loadExercises } = useExercisesStore();
  const { loadWorkouts, loadWorkoutByDate, currentDate } = useWorkoutsStore();

  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const analyzeFile = async (file: File): Promise<ImportPreview> => {
    const text = await file.text();
    const isJSON = file.name.endsWith('.json');

    if (isJSON) {
      try {
        const data = JSON.parse(text);
        return {
          type: 'json',
          filename: file.name,
          size: file.size,
          workouts: data.workouts?.length || 0,
          exercises: data.exercises?.length || 0,
          measurements: data.measurements?.length || 0,
          conflicts: [], // TODO: Implement conflict detection
        };
      } catch (error) {
        throw new Error('Invalid JSON format');
      }
    } else {
      // CSV analysis
      const lines = text.split('\n').filter(line => line.trim());
      return {
        type: 'csv',
        filename: file.name,
        size: file.size,
        workouts: Math.max(0, lines.length - 1), // Assuming header row
        exercises: 0,
        measurements: 0,
        conflicts: [],
      };
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.json')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select a CSV or JSON file',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    setResult(null);

    try {
      const previewData = await analyzeFile(file);
      setPreview(previewData);
    } catch (error) {
      toast({
        title: 'File analysis failed',
        description: error instanceof Error ? error.message : 'Unable to analyze file',
        variant: 'destructive',
      });
      setSelectedFile(null);
      setPreview(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !preview) return;

    setIsImporting(true);
    setImportProgress(0);

    try {
      const text = await selectedFile.text();

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      let importResult: ImportResult;

      if (preview.type === 'csv') {
        const { importCSV } = await import('@/utils/csv');
        const summary = await importCSV(text);
        importResult = {
          success: true,
          setsAdded: summary.setsAdded,
          duplicatesSkipped: summary.duplicatesSkipped,
          errors: [],
        };
      } else {
        const { importBackup } = await import('@/utils/json');
        const result = await importBackup(JSON.parse(text));
        importResult = {
          success: result.errors.length === 0,
          setsAdded: 0, // JSON import doesn't track sets specifically
          duplicatesSkipped: 0,
          errors: result.errors,
        };
      }

      clearInterval(progressInterval);
      setImportProgress(100);
      setResult(importResult);
      // Refresh in-memory state so pages reflect imported data
      await loadExercises();
      await loadWorkouts();
      await loadWorkoutByDate(currentDate);


      if (importResult.success) {
        toast({
          title: 'Import completed',
          description: preview.type === 'csv'
            ? `${importResult.setsAdded} sets imported, ${importResult.duplicatesSkipped} duplicates skipped`
            : 'Backup imported successfully',
        });
      } else {
        toast({
          title: 'Import completed with issues',
          description: `${importResult.errors.length} errors encountered`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Import failed',
        description: 'Failed to import file. Please check the format and try again.',
        variant: 'destructive',
      });
      setResult({
        success: false,
        setsAdded: 0,
        duplicatesSkipped: 0,
        errors: ['Import failed'],
      });
    } finally {
      setIsImporting(false);
    }
  };

  const resetImport = () => {
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    setImportProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        title="Import Data"
        onMenuClick={() => navigate(-1)}
      />

      <div className="p-4 space-y-6 pb-20">
        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>Select File</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                isDragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              )}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <div className="space-y-2">
                <p className="text-lg font-medium">
                  Drop your file here or click to browse
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports CSV workout data and JSON backups
                </p>
              </div>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4"
                variant="outline"
              >
                Choose File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>

        {/* File Preview */}
        {preview && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {preview.type === 'csv' ? (
                    <FileText className="h-5 w-5" />
                  ) : (
                    <Database className="h-5 w-5" />
                  )}
                  <span>Import Preview</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetImport}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">File:</span>
                  <p className="font-medium truncate">{preview.filename}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Size:</span>
                  <p className="font-medium">{formatFileSize(preview.size)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <Badge variant="secondary">
                    {preview.type.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Format:</span>
                  <p className="font-medium">
                    {preview.type === 'csv' ? 'Workout Data' : 'Complete Backup'}
                  </p>
                </div>
              </div>

              {preview.type === 'json' && (
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-lg font-bold text-primary">{preview.workouts}</div>
                    <div className="text-muted-foreground">Workouts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-primary">{preview.exercises}</div>
                    <div className="text-muted-foreground">Exercises</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-primary">{preview.measurements}</div>
                    <div className="text-muted-foreground">Measurements</div>
                  </div>
                </div>
              )}

              {preview.type === 'csv' && (
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">{preview.workouts}</div>
                  <div className="text-muted-foreground">Data rows</div>
                </div>
              )}

              {preview.conflicts.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {preview.conflicts.length} potential conflicts detected.
                    Existing data will be preserved.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Import Progress */}
        {isImporting && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Importing data...</span>
                  <span className="text-sm text-muted-foreground">{importProgress}%</span>
                </div>
                <Progress value={importProgress} className="w-full" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Import Result */}
        {result && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
                {result.success ? (
                  <CheckCircle className="h-12 w-12 text-success mx-auto" />
                ) : (
                  <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
                )}

                <div>
                  <h3 className="text-lg font-semibold">
                    {result.success ? 'Import Completed' : 'Import Failed'}
                  </h3>
                  {result.success && preview?.type === 'csv' && (
                    <p className="text-muted-foreground">
                      {result.setsAdded} sets imported, {result.duplicatesSkipped} duplicates skipped
                    </p>
                  )}
                </div>

                {result.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium mb-2">Errors encountered:</div>
                      <ul className="list-disc list-inside text-sm">
                        {result.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Import Button */}
        {preview && !result && (
          <Card>
            <CardContent className="pt-6">
              <Button
                onClick={handleImport}
                disabled={isImporting}
                className="w-full h-12"
                size="lg"
              >
                {isImporting ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                    <span>Importing...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Upload className="h-4 w-4" />
                    <span>Import Data</span>
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}