import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sun, Moon, Monitor, Scale, Timer, Palette, Shield, Trash2, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useSettingsStore } from '@/store/settingsStore';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  
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

  const handleResetData = async () => {
    if (confirmText !== 'DELETE') return;
    
    try {
      await resetData();
      toast({
        title: "Data reset complete",
        description: "All data has been cleared successfully",
      });
      setShowResetDialog(false);
      setConfirmText('');
      navigate('/home');
    } catch (error) {
      toast({
        title: "Reset failed",
        description: "Failed to reset data. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        title="Settings" 
        onMenuClick={() => navigate(-1)}
      />
      
      <div className="p-4 space-y-6 pb-20">
        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Palette className="h-5 w-5" />
              <span>Appearance</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="theme-select">Theme</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger id="theme-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center space-x-2">
                      <Sun className="h-4 w-4" />
                      <span>Light</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center space-x-2">
                      <Moon className="h-4 w-4" />
                      <span>Dark</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="auto">
                    <div className="flex items-center space-x-2">
                      <Monitor className="h-4 w-4" />
                      <span>System</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Units & Measurements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Scale className="h-5 w-5" />
              <span>Units & Measurements</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="units-select">Unit System</Label>
              <Select value={units} onValueChange={setUnits}>
                <SelectTrigger id="units-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="metric">Metric (kg, km)</SelectItem>
                  <SelectItem value="imperial">Imperial (lb, mi)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="weight-increment">Default Weight Increment</Label>
              <Select 
                value={weightIncrement.toString()} 
                onValueChange={(value) => setWeightIncrement(parseFloat(value))}
              >
                <SelectTrigger id="weight-increment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1.25">1.25 {units === 'metric' ? 'kg' : 'lb'}</SelectItem>
                  <SelectItem value="2.5">2.5 {units === 'metric' ? 'kg' : 'lb'}</SelectItem>
                  <SelectItem value="5">5 {units === 'metric' ? 'kg' : 'lb'}</SelectItem>
                  <SelectItem value="10">10 {units === 'metric' ? 'kg' : 'lb'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Workout */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Timer className="h-5 w-5" />
              <span>Workout</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="timer-sound">Timer Sound</Label>
                <p className="text-sm text-muted-foreground">
                  Play sound when rest timer completes
                </p>
              </div>
              <Switch
                id="timer-sound"
                checked={timerSound}
                onCheckedChange={setTimerSound}
              />
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Privacy & Data</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <h4 className="font-medium">Data Storage</h4>
              <p className="text-sm text-muted-foreground">
                All your workout data is stored locally on your device. Nothing is sent to external servers.
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="font-medium text-destructive">Danger Zone</h4>
              <p className="text-sm text-muted-foreground">
                This action cannot be undone. All your workout data, exercises, measurements, and settings will be permanently deleted.
              </p>
              <Button
                variant="destructive"
                onClick={() => setShowResetDialog(true)}
                className="w-full"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Reset All Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span>Reset All Data</span>
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. All workouts, exercises, measurements, 
              and settings will be permanently deleted from your device.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confirm-text">Type "DELETE" to confirm</Label>
              <Input
                id="confirm-text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
              />
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowResetDialog(false);
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