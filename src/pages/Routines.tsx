import { useState, useEffect } from 'react';
import { Plus, Play, Edit, Trash2 } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { db, Routine, RoutineExercise } from '@/db/dexie';
import { useExercisesStore } from '@/store/exercisesStore';
import { useWorkoutsStore } from '@/store/workoutsStore';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const ROUTINE_COLORS = [
  '#4ECDC4', // Teal (primary)
  '#FF6B6B', // Red
  '#4ECDC4', // Blue
  '#45B7D1', // Light Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#F8BBD9', // Pink
];

export default function Routines() {
  const navigate = useNavigate();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState<number[]>([]);
  
  const { exercises } = useExercisesStore();
  const { createWorkout, currentDate } = useWorkoutsStore();

  const [newRoutine, setNewRoutine] = useState({
    name: '',
    description: '',
    color: ROUTINE_COLORS[0]
  });

  useEffect(() => {
    loadRoutines();
  }, []);

  const loadRoutines = async () => {
    try {
      const data = await db.routines.orderBy('createdAt').reverse().toArray();
      setRoutines(data);
    } catch (error) {
      console.error('Error loading routines:', error);
    }
  };

  const handleAddRoutine = async () => {
    if (!newRoutine.name.trim() || selectedExercises.length === 0) return;
    
    try {
      const routineExercises: RoutineExercise[] = selectedExercises.map(exerciseId => ({
        exerciseId,
        template: {} // Empty template for now
      }));

      await db.routines.add({
        name: newRoutine.name,
        description: newRoutine.description || undefined,
        color: newRoutine.color,
        exercises: routineExercises,
        createdAt: new Date()
      });
      
      await loadRoutines();
      setIsAddDialogOpen(false);
      setNewRoutine({
        name: '',
        description: '',
        color: ROUTINE_COLORS[0]
      });
      setSelectedExercises([]);
    } catch (error) {
      console.error('Error adding routine:', error);
    }
  };

  const handleStartRoutine = async (routine: Routine) => {
    try {
      // Create workout with routine exercises
      const workoutExercises = routine.exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        sets: [] // Start with empty sets
      }));
      
      await createWorkout(currentDate, workoutExercises);
      navigate('/training');
    } catch (error) {
      console.error('Error starting routine:', error);
    }
  };

  const handleDeleteRoutine = async (id: number) => {
    try {
      await db.routines.delete(id);
      await loadRoutines();
    } catch (error) {
      console.error('Error deleting routine:', error);
    }
  };

  const getExerciseName = (exerciseId: number) => {
    const exercise = exercises.find(ex => ex.id === exerciseId);
    return exercise?.name || 'Unknown Exercise';
  };

  const toggleExerciseSelection = (exerciseId: number) => {
    setSelectedExercises(prev => 
      prev.includes(exerciseId)
        ? prev.filter(id => id !== exerciseId)
        : [...prev, exerciseId]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        title="Routines" 
        onAddClick={() => setIsAddDialogOpen(true)}
      />
      
      <div className="p-4 space-y-4">
        {routines.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">No routines yet</h3>
            <p className="text-muted-foreground mb-6">
              Create workout routines to quickly start structured training sessions
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Routine
            </Button>
          </div>
        ) : (
          routines.map(routine => (
            <Card key={routine.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: routine.color }}
                    />
                    <div>
                      <CardTitle className="text-lg">{routine.name}</CardTitle>
                      {routine.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {routine.description}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRoutine(routine.id!)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  {/* Exercise List */}
                  <div className="space-y-2">
                    {routine.exercises.map((ex, index) => (
                      <div key={`${ex.exerciseId}-${index}`} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                        <span className="text-sm">{getExerciseName(ex.exerciseId)}</span>
                        <Badge variant="secondary" className="text-xs">
                          {exercises.find(e => e.id === ex.exerciseId)?.category || 'Unknown'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{routine.exercises.length} exercises</span>
                    <span>Created {format(routine.createdAt, 'MMM d, yyyy')}</span>
                  </div>
                  
                  <Button
                    onClick={() => handleStartRoutine(routine)}
                    className="w-full"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Start Routine
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Routine Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Routine</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="routine-name">Routine Name</Label>
              <Input
                id="routine-name"
                value={newRoutine.name}
                onChange={(e) => setNewRoutine(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Push Day, Upper Body"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="routine-description">Description (Optional)</Label>
              <Textarea
                id="routine-description"
                value={newRoutine.description}
                onChange={(e) => setNewRoutine(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your routine..."
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center space-x-2">
                {ROUTINE_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewRoutine(prev => ({ ...prev, color }))}
                    className={`w-8 h-8 rounded-full border-2 ${
                      newRoutine.color === color ? 'border-foreground' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Exercises ({selectedExercises.length} selected)</Label>
              <div className="max-h-60 overflow-y-auto space-y-1 border border-border rounded-md p-2">
                {exercises.map(exercise => (
                  <label
                    key={exercise.id}
                    className="flex items-center space-x-3 p-2 rounded hover:bg-surface-secondary cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedExercises.includes(exercise.id!)}
                      onChange={() => toggleExerciseSelection(exercise.id!)}
                      className="rounded"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{exercise.name}</div>
                      <div className="text-sm text-muted-foreground">{exercise.category}</div>
                    </div>
                  </label>
                ))}
              </div>
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
                onClick={handleAddRoutine}
                disabled={!newRoutine.name.trim() || selectedExercises.length === 0}
              >
                Create Routine
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}