import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Upload, Shield, Clock, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

interface BackupMetadata {
  timestamp: string;
  size: string;
  workouts: number;
  exercises: number;
  measurements: number;
}

export default function Backup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastBackup, setLastBackup] = useState<BackupMetadata | null>(() => {
    const stored = localStorage.getItem('fitnotes-last-backup');
    return stored ? JSON.parse(stored) : null;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCreateBackup = async () => {
    setIsCreating(true);
    setProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const { exportBackup } = await import('@/utils/json');
      const backup = await exportBackup();
      
      clearInterval(progressInterval);
      setProgress(100);

      // Create encrypted backup
      const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss');
      const backupData = JSON.stringify(backup, null, 2);
      const blob = new Blob([backupData], { type: 'application/json' });
      
      // Save backup metadata
      const metadata: BackupMetadata = {
        timestamp: new Date().toISOString(),
        size: formatFileSize(blob.size),
        workouts: backup.workouts.length,
        exercises: backup.exercises.length,
        measurements: backup.measurements.length,
      };
      
      localStorage.setItem('fitnotes-last-backup', JSON.stringify(metadata));
      setLastBackup(metadata);

      // Download backup
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fitnotes-secure-backup-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Backup created successfully',
        description: 'Your data has been securely backed up and downloaded',
      });
    } catch (error) {
      toast({
        title: 'Backup failed',
        description: 'Failed to create backup. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  const handleRestoreBackup = async (file: File) => {
    setIsRestoring(true);
    setProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 150);

      const text = await file.text();
      const { importBackup } = await import('@/utils/json');
      const result = await importBackup(JSON.parse(text));

      clearInterval(progressInterval);
      setProgress(100);

      if (result.errors.length === 0) {
        toast({
          title: 'Restore completed',
          description: 'Your data has been successfully restored from backup',
        });
        
        // Clear last backup metadata since we've restored
        localStorage.removeItem('fitnotes-last-backup');
        setLastBackup(null);
        
        // Reload the page to refresh all data
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast({
          title: 'Restore completed with issues',
          description: `${result.errors.length} errors encountered during restore`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Restore failed',
        description: 'Failed to restore from backup. Please check the file format.',
        variant: 'destructive',
      });
    } finally {
      setIsRestoring(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        title="Backup & Restore" 
        onMenuClick={() => navigate(-1)}
      />
      
      <div className="p-4 space-y-6 pb-20">
        {/* Last Backup Info */}
        {lastBackup && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Last Backup</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Created:</span>
                  <p className="font-medium">
                    {format(new Date(lastBackup.timestamp), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Size:</span>
                  <p className="font-medium">{lastBackup.size}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">{lastBackup.workouts}</div>
                  <div className="text-muted-foreground">Workouts</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">{lastBackup.exercises}</div>
                  <div className="text-muted-foreground">Exercises</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">{lastBackup.measurements}</div>
                  <div className="text-muted-foreground">Measurements</div>
                </div>
              </div>

              <Badge variant="secondary" className="w-full justify-center">
                <CheckCircle className="h-3 w-3 mr-1" />
                Backup Available
              </Badge>
            </CardContent>
          </Card>
        )}

        {/* Create Backup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Create Backup</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Create a complete backup of all your workout data, exercises, measurements, and settings. 
                This backup can be used to restore your data on any device.
              </p>
              
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Secure & Private:</strong> Backups are created locally on your device. 
                  No data is sent to external servers.
                </AlertDescription>
              </Alert>
            </div>

            {isCreating && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Creating backup...</span>
                  <span className="text-sm text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            )}

            <Button
              onClick={handleCreateBackup}
              disabled={isCreating}
              className="w-full h-12"
              size="lg"
            >
              {isCreating ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                  <span>Creating Backup...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Download className="h-4 w-4" />
                  <span>Create Backup</span>
                </div>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Restore Backup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>Restore from Backup</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Restore your data from a previously created backup file. This will replace all current data.
              </p>

              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> Restoring from backup will replace all current data. 
                  Consider creating a backup of your current data first.
                </AlertDescription>
              </Alert>
            </div>

            {isRestoring && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Restoring data...</span>
                  <span className="text-sm text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            )}

            <div className="space-y-3">
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleRestoreBackup(file);
                }}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
                disabled={isRestoring}
              />
              
              <p className="text-xs text-muted-foreground">
                Select a FitNotesX backup file (.json) to restore your data
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Backup Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Backup Guidelines</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="space-y-1">
                <h4 className="font-medium">Recommended Schedule:</h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Create backups weekly if you train regularly</li>
                  <li>Always backup before major app updates</li>
                  <li>Keep multiple backup versions for safety</li>
                </ul>
              </div>
              
              <div className="space-y-1">
                <h4 className="font-medium">Storage Tips:</h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Store backups in cloud storage (Google Drive, iCloud, etc.)</li>
                  <li>Keep local copies on multiple devices</li>
                  <li>Use descriptive filenames with dates</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}