import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Calendar, FileText, Database, CheckCircle } from 'lucide-react';
import { format, subDays, subMonths, subYears } from 'date-fns';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type ExportFormat = 'csv' | 'json';
type DateRange = 'all' | 'last_30' | 'last_90' | 'last_year' | 'custom';

export default function Export() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const getDateRangeLabel = () => {
    const today = new Date();
    switch (dateRange) {
      case 'last_30':
        return `${format(subDays(today, 30), 'MMM d')} - ${format(today, 'MMM d, yyyy')}`;
      case 'last_90':
        return `${format(subDays(today, 90), 'MMM d')} - ${format(today, 'MMM d, yyyy')}`;
      case 'last_year':
        return `${format(subYears(today, 1), 'MMM d, yyyy')} - ${format(today, 'MMM d, yyyy')}`;
      case 'custom':
        if (startDate && endDate) {
          return `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`;
        }
        return 'Select dates';
      case 'all':
      default:
        return 'All data';
    }
  };

  const getDateFilter = () => {
    const today = new Date();
    switch (dateRange) {
      case 'last_30':
        return { start: subDays(today, 30), end: today };
      case 'last_90':
        return { start: subDays(today, 90), end: today };
      case 'last_year':
        return { start: subYears(today, 1), end: today };
      case 'custom':
        return startDate && endDate ? { start: startDate, end: endDate } : null;
      case 'all':
      default:
        return null;
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      const dateFilter = getDateFilter();
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      if (exportFormat === 'csv') {
        const { exportWorkoutsCSV } = await import('@/utils/csv');
        const csv = await exportWorkoutsCSV();
        
        clearInterval(progressInterval);
        setExportProgress(100);
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fitnotes-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({ 
          title: 'Export completed', 
          description: 'CSV file has been downloaded successfully' 
        });
      } else {
        const { exportBackup } = await import('@/utils/json');
        const backup = await exportBackup();
        
        clearInterval(progressInterval);
        setExportProgress(100);
        
        const blob = new Blob([JSON.stringify(backup, null, 2)], { 
          type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fitnotes-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({ 
          title: 'Backup created', 
          description: 'JSON backup file has been downloaded successfully' 
        });
      }
    } catch (error) {
      toast({ 
        title: 'Export failed', 
        description: 'Failed to export data. Please try again.', 
        variant: 'destructive' 
      });
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportProgress(0), 2000);
    }
  };

  const canExport = dateRange !== 'custom' || (startDate && endDate);

  return (
    <div className="min-h-screen bg-background">
      <Header 
        title="Export Data" 
        onMenuClick={() => navigate(-1)}
      />
      
      <div className="p-4 space-y-6 pb-20">
        {/* Export Format */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Export Format</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={exportFormat === 'csv' ? 'default' : 'outline'}
                onClick={() => setExportFormat('csv')}
                className="h-auto p-4"
              >
                <div className="text-center">
                  <FileText className="h-6 w-6 mx-auto mb-2" />
                  <div className="font-medium">CSV</div>
                  <div className="text-xs text-muted-foreground">
                    Spreadsheet format
                  </div>
                </div>
              </Button>
              
              <Button
                variant={exportFormat === 'json' ? 'default' : 'outline'}
                onClick={() => setExportFormat('json')}
                className="h-auto p-4"
              >
                <div className="text-center">
                  <Database className="h-6 w-6 mx-auto mb-2" />
                  <div className="font-medium">JSON</div>
                  <div className="text-xs text-muted-foreground">
                    Complete backup
                  </div>
                </div>
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {exportFormat === 'csv' 
                ? 'Export workout data in CSV format for use in spreadsheet applications'
                : 'Export complete backup including all data and settings'
              }
            </div>
          </CardContent>
        </Card>

        {/* Date Range */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Date Range</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label>Select time period</Label>
              <Select value={dateRange} onValueChange={(value: DateRange) => setDateRange(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="last_30">Last 30 days</SelectItem>
                  <SelectItem value="last_90">Last 90 days</SelectItem>
                  <SelectItem value="last_year">Last year</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !startDate && 'text-muted-foreground'
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'MMM d, yyyy') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        disabled={(date) => date > new Date() || (endDate && date > endDate)}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !endDate && 'text-muted-foreground'
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'MMM d, yyyy') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        disabled={(date) => date > new Date() || (startDate && date < startDate)}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              <strong>Selected range:</strong> {getDateRangeLabel()}
            </div>
          </CardContent>
        </Card>

        {/* Export Progress */}
        {isExporting && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Exporting data...</span>
                  <span className="text-sm text-muted-foreground">{exportProgress}%</span>
                </div>
                <Progress value={exportProgress} className="w-full" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Export Button */}
        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={handleExport}
              disabled={!canExport || isExporting}
              className="w-full h-12"
              size="lg"
            >
              {isExporting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                  <span>Exporting...</span>
                </div>
              ) : exportProgress === 100 ? (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Export Completed</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Download className="h-4 w-4" />
                  <span>Export Data</span>
                </div>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}