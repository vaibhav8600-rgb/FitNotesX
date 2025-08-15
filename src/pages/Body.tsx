import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { db, Measurement } from '@/db/dexie';
import { useSettingsStore } from '@/store/settingsStore';
import { format } from 'date-fns';
import { colorVar } from '@/utils/theme';

const MEASUREMENT_TYPES = [
  { value: 'weight', label: 'Weight' },
  { value: 'body_fat', label: 'Body Fat %' },
  { value: 'muscle_mass', label: 'Muscle Mass' },
  { value: 'waist', label: 'Waist' },
  { value: 'chest', label: 'Chest' },
  { value: 'arms', label: 'Arms' },
  { value: 'thighs', label: 'Thighs' },
];

const TABS = ['WEIGHT', 'MEASUREMENTS', 'GRAPH'];

export default function Body() {
  const [activeTab, setActiveTab] = useState('WEIGHT');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [selectedType, setSelectedType] = useState<Measurement['type']>('weight');
  const { units } = useSettingsStore();

  const [newMeasurement, setNewMeasurement] = useState({
    type: 'weight' as Measurement['type'],
    value: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: ''
  });

  useEffect(() => {
    loadMeasurements();
  }, []);

  const loadMeasurements = async () => {
    try {
      const data = await db.measurements.orderBy('date').reverse().toArray();
      setMeasurements(data);
    } catch (error) {
      console.error('Error loading measurements:', error);
    }
  };

  const handleAddMeasurement = async () => {
    if (!newMeasurement.value || !newMeasurement.date) return;
    
    try {
      await db.measurements.add({
        type: newMeasurement.type,
        value: parseFloat(newMeasurement.value),
        date: newMeasurement.date,
        notes: newMeasurement.notes || undefined,
        createdAt: new Date()
      });
      
      await loadMeasurements();
      setIsAddDialogOpen(false);
      setNewMeasurement({
        type: 'weight',
        value: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        notes: ''
      });
    } catch (error) {
      console.error('Error adding measurement:', error);
    }
  };

  const getLatestMeasurement = (type: Measurement['type']) => {
    return measurements.find(m => m.type === type);
  };

  const getPreviousMeasurement = (type: Measurement['type']) => {
    const filtered = measurements.filter(m => m.type === type);
    return filtered.length > 1 ? filtered[1] : null;
  };

  const calculateChange = (current: number, previous: number) => {
    return current - previous;
  };

  const getUnit = (type: Measurement['type']) => {
    switch (type) {
      case 'weight':
      case 'muscle_mass':
        return units === 'metric' ? 'kg' : 'lb';
      case 'body_fat':
        return '%';
      case 'waist':
      case 'chest':
      case 'arms':
      case 'thighs':
        return units === 'metric' ? 'cm' : 'in';
      default:
        return '';
    }
  };

  const renderWeightTab = () => {
    const latestWeight = getLatestMeasurement('weight');
    const previousWeight = getPreviousMeasurement('weight');
    const change = latestWeight && previousWeight 
      ? calculateChange(latestWeight.value, previousWeight.value)
      : null;

    return (
      <div className="space-y-4">
        {/* Quick Weight Entry */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="text-center">
                <Label htmlFor="weight">Weight ({getUnit('weight')})</Label>
                <div className="flex items-center justify-center space-x-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const current = parseFloat(newMeasurement.value) || 0;
                      setNewMeasurement(prev => ({ 
                        ...prev, 
                        value: Math.max(current - 0.1, 0).toFixed(1)
                      }));
                    }}
                  >
                    -
                  </Button>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={newMeasurement.value}
                    onChange={(e) => setNewMeasurement(prev => ({ ...prev, value: e.target.value }))}
                    className="w-32 text-center text-lg"
                    placeholder="70.0"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const current = parseFloat(newMeasurement.value) || 0;
                      setNewMeasurement(prev => ({ 
                        ...prev, 
                        value: (current + 0.1).toFixed(1)
                      }));
                    }}
                  >
                    +
                  </Button>
                </div>
              </div>
              
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={newMeasurement.date}
                  onChange={(e) => setNewMeasurement(prev => ({ ...prev, date: e.target.value }))}
                  className="mt-1"
                />
              </div>
              
              <div className="flex space-x-2">
                <Button
                  onClick={() => {
                    setNewMeasurement(prev => ({ ...prev, type: 'weight' }));
                    handleAddMeasurement();
                  }}
                  className="flex-1"
                  disabled={!newMeasurement.value}
                >
                  Save
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setNewMeasurement(prev => ({ ...prev, value: '' }))}
                  className="flex-1"
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Latest Weight */}
        {latestWeight && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">
                    {latestWeight.value} {getUnit('weight')}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {latestWeight.date}
                  </div>
                </div>
                {change && (
                  <div className={`flex items-center space-x-1 ${
                    change > 0 ? 'text-warning' : change < 0 ? 'text-success' : 'text-muted-foreground'
                  }`}>
                    {change > 0 ? (
                      <TrendingUp size={16} />
                    ) : change < 0 ? (
                      <TrendingDown size={16} />
                    ) : null}
                    <span className="text-sm font-medium">
                      {change > 0 ? '+' : ''}{change.toFixed(1)} {getUnit('weight')}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Weight History */}
        {measurements.filter(m => m.type === 'weight').length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {measurements
                  .filter(m => m.type === 'weight')
                  .slice(0, 10)
                  .map(measurement => (
                    <div key={measurement.id} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                      <div>
                        <div className="font-medium">
                          {measurement.value} {getUnit('weight')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {measurement.date}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        title="Body Tracking" 
        onAddClick={() => setIsAddDialogOpen(true)}
      />
      
      {/* Tabs */}
      <div className="bg-surface border-b border-border">
        <div className="flex items-center px-4">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {activeTab === 'WEIGHT' && renderWeightTab()}
        
        {activeTab === 'MEASUREMENTS' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Measurements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={selectedType} onValueChange={(v) => setSelectedType(v as Measurement['type'])}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {MEASUREMENT_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    {measurements.filter(m => m.type === selectedType).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No entries yet.</p>
                    ) : (
                      measurements
                        .filter(m => m.type === selectedType)
                        .slice(0, 20)
                        .map(m => (
                          <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                            <div className="font-medium">{m.value} {getUnit(selectedType)}</div>
                            <div className="text-sm text-muted-foreground">{m.date}</div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {activeTab === 'GRAPH' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Progress Chart</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={selectedType} onValueChange={(v) => setSelectedType(v as Measurement['type'])}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {MEASUREMENT_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="h-56">
                  <Line
                    data={(() => {
                      const data = measurements
                        .filter(m => m.type === selectedType)
                        .slice()
                        .sort((a, b) => a.date.localeCompare(b.date));
                      return {
                        labels: data.map(m => m.date),
                        datasets: [{
                          data: data.map(m => m.value),
                          borderColor: colorVar('primary'),
                          backgroundColor: colorVar('primary', 0.2),
                          tension: 0.3,
                          fill: true,
                        }]
                      };
                    })()}
                    options={{
                      responsive: true,
                      plugins: { legend: { display: false } },
                      scales: {
                        x: { ticks: { color: colorVar('muted-foreground') }, grid: { color: colorVar('chart-grid') } },
                        y: { ticks: { color: colorVar('muted-foreground') }, grid: { color: colorVar('chart-grid') } },
                      }
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Measurement Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Measurement</DialogTitle>
            <DialogDescription>Add a new measurement entry.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={newMeasurement.type}
                onValueChange={(value) => setNewMeasurement(prev => ({ 
                  ...prev, 
                  type: value as Measurement['type'] 
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEASUREMENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Value ({getUnit(newMeasurement.type)})</Label>
              <Input
                type="number"
                step="0.1"
                value={newMeasurement.value}
                onChange={(e) => setNewMeasurement(prev => ({ ...prev, value: e.target.value }))}
                placeholder="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={newMeasurement.date}
                onChange={(e) => setNewMeasurement(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleAddMeasurement}
                disabled={!newMeasurement.value || !newMeasurement.date}
              >
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}