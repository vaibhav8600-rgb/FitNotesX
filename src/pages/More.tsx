import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, 
  Download, 
  Upload, 
  Archive, 
  Info, 
  Sun, 
  Moon, 
  Monitor,
  Scale,
  Plus,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import Header from '@/components/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSettingsStore } from '@/store/settingsStore';
import { useToast } from '@/hooks/use-toast';

const MORE_ITEMS = [
  { icon: Settings, label: 'Settings', action: 'settings' },
  { icon: Download, label: 'Export Data', action: 'export' },
  { icon: Upload, label: 'Import Data', action: 'import' },
  { icon: Archive, label: 'Backup & Restore', action: 'backup' },
  { icon: Info, label: 'About', action: 'about' },
];

export default function More() {
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const navigate = useNavigate(); 
  const { toast } = useToast();
  
  const { 
    theme, 
    units, 
    weightIncrement, 
    timerSound, 
    setTheme, 
    setUnits, 
    setWeightIncrement, 
    setTimerSound,
    resetData 
  } = useSettingsStore();

  const handleItemClick = (action: string) => {
    // Navigate to dedicated pages instead of showing dialogs
    switch (action) {
      case 'settings':
        navigate('/settings');
        break;
      case 'export':
        navigate('/export');
        break;
      case 'import':
        navigate('/import');
        break;
      case 'backup':
        navigate('/backup');
        break;
      case 'about':
        navigate('/about');
        break;
      default:
        setActiveDialog(action);
    }
  };

  const handleExportCSV = async () => {
    try {
      const { exportWorkoutsCSV } = await import('@/utils/csv');
      const csv = await exportWorkoutsCSV();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fitnotes-export-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Export complete', description: 'CSV downloaded' });
      setActiveDialog(null);
    } catch (error) {
      toast({ title: 'Export failed', description: 'Failed to export CSV', variant: 'destructive' });
    }
  };

  const handleExportJSON = async () => {
    try {
      const { exportBackup } = await import('@/utils/json');
      const backup = await exportBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fitnotes-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Backup created', description: 'JSON downloaded' });
      setActiveDialog(null);
    } catch (error) {
      toast({ title: 'Export failed', description: 'Failed to export backup', variant: 'destructive' });
    }
  };

  const handleImportData = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      if (file.name.endsWith('.csv')) {
        const { importCSV } = await import('@/utils/csv');
        const summary = await importCSV(text);
        toast({ title: 'Import complete', description: `${summary.setsAdded} sets added, ${summary.duplicatesSkipped} duplicates skipped` });
      } else {
        const { importBackup } = await import('@/utils/json');
        const result = await importBackup(JSON.parse(text));
        if (result.errors.length) {
          toast({ title: 'Import issues', description: result.errors.join(', '), variant: 'destructive' });
        } else {
          toast({ title: 'Restore complete', description: 'Backup imported successfully' });
        }
      }
      setActiveDialog(null);
    } catch (error) {
      toast({ title: 'Import failed', description: 'Failed to import file', variant: 'destructive' });
    }
  };

  const handleResetData = async () => {
    if (confirmText !== 'DELETE') return;
    
    try {
      await resetData();
      toast({
        title: "Data reset",
        description: "All data has been cleared",
      });
      setActiveDialog(null);
      setConfirmText('');
    } catch (error) {
      toast({
        title: "Reset failed",
        description: "Failed to reset data",
        variant: "destructive",
      });
    }
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return Sun;
      case 'dark':
        return Moon;
      default:
        return Monitor;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="More" />
      
      <div className="p-4 space-y-3">
        {MORE_ITEMS.map(({ icon: Icon, label, action }) => (
          <Card 
            key={action}
            className="cursor-pointer hover:bg-surface-secondary transition-colors"
            onClick={() => handleItemClick(action)}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Icon size={20} className="text-muted-foreground" />
                <span className="font-medium">{label}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Settings Dialog */}
      <Dialog open={activeDialog === 'settings'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>App appearance and preferences</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Theme */}
            <div className="space-y-2">
              <Label>Theme</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center space-x-2">
                      <Sun size={16} />
                      <span>Light</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center space-x-2">
                      <Moon size={16} />
                      <span>Dark</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="auto">
                    <div className="flex items-center space-x-2">
                      <Monitor size={16} />
                      <span>Auto</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Units */}
            <div className="space-y-2">
              <Label>Units</Label>
              <Select value={units} onValueChange={setUnits}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="metric">Metric (kg/km)</SelectItem>
                  <SelectItem value="imperial">Imperial (lb/mi)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Weight Increment */}
            <div className="space-y-2">
              <Label>Weight Increment</Label>
              <Select 
                value={weightIncrement.toString()} 
                onValueChange={(value) => setWeightIncrement(parseFloat(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1.25">1.25</SelectItem>
                  <SelectItem value="2.5">2.5</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Timer Sound */}
            <div className="flex items-center justify-between">
              <Label htmlFor="timer-sound">Timer Sound</Label>
              <Switch
                id="timer-sound"
                checked={timerSound}
                onCheckedChange={setTimerSound}
              />
            </div>

            {/* Reset Data */}
            <div className="pt-4 border-t border-border">
              <Button
                variant="destructive"
                onClick={() => {
                  setActiveDialog(null);
                  setTimeout(() => setActiveDialog('reset'), 100);
                }}
                className="w-full"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Reset All Data
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={activeDialog === 'export'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Data</DialogTitle>
            <DialogDescription>
              Download your workout data and settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Button onClick={handleExportCSV} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Export as CSV
            </Button>
            <Button onClick={handleExportJSON} variant="outline" className="w-full">
              <Archive className="mr-2 h-4 w-4" />
              Export Full Backup (JSON)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={activeDialog === 'import'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Data</DialogTitle>
            <DialogDescription>
              Import workout data from CSV or restore from backup
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="file"
              accept=".csv,.json"
              onChange={(e) => handleImportData(e.target.files?.[0] || null)}
            />
            <p className="text-sm text-muted-foreground">
              Supported formats: CSV files and JSON backups
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Backup Dialog */}
      <Dialog open={activeDialog === 'backup'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Backup & Restore</DialogTitle>
            <DialogDescription>
              Create a complete backup or restore from a previous backup
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Button onClick={handleExportJSON} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Create Backup
            </Button>
            <Input
              type="file"
              accept=".json"
              onChange={(e) => handleImportData(e.target.files?.[0] || null)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* About Dialog */}
      <Dialog open={activeDialog === 'about'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>About FitNotesX</DialogTitle>
            <DialogDescription>App info and build details</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              FitNotesX is a comprehensive workout tracking application that helps you 
              monitor your fitness progress, track exercises, and analyze your performance.
            </p>
            <div className="text-sm">
              <p><strong>Version:</strong> 1.0.0</p>
              <p><strong>Build:</strong> PWA</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog open={activeDialog === 'reset'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span>Reset All Data</span>
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. All workouts, exercises, measurements, 
              and settings will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type "DELETE" to confirm</Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
              />
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setActiveDialog(null);
                  setConfirmText('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleResetData}
                disabled={confirmText !== 'DELETE'}
                className="flex-1"
              >
                Reset Data
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}