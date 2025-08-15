import { useEffect, useState } from 'react';
import { Search, Plus } from 'lucide-react';
import Header from '@/components/Header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useExercisesStore } from '@/store/exercisesStore';
import { useWorkoutsStore } from '@/store/workoutsStore';
import { useNavigate } from 'react-router-dom';
import { Exercise } from '@/db/dexie';

const EXERCISE_TYPES = [
  { value: 'weight_reps', label: 'Weight & Reps' },
  { value: 'bodyweight', label: 'Bodyweight' },
  { value: 'distance_time', label: 'Distance & Time' },
  { value: 'time_only', label: 'Time Only' },
  { value: 'reps_only', label: 'Reps Only' },
];

const CATEGORIES = [
  'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Cardio'
];

export default function Exercises() {
  const navigate = useNavigate();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('ALL');
  
  const {
    exercises,
    searchQuery,
    setSearchQuery,
    getFilteredExercises,
    getCategories,
    addExercise
  } = useExercisesStore();
  
  const { 
    currentWorkout, 
    currentDate, 
    createWorkout, 
    addExerciseToWorkout 
  } = useWorkoutsStore();

  const [newExercise, setNewExercise] = useState({
    name: '',
    category: '',
    type: 'weight_reps' as Exercise['type'],
    notes: ''
  });

  const tabs = ['ALL', 'CUSTOM', 'CATEGORIES', 'ROUTINES'];
  const filteredExercises = getFilteredExercises();
  const categories = getCategories().filter(cat => !['ALL', 'CUSTOM'].includes(cat));

  const handleAddExercise = async () => {
    if (!newExercise.name.trim() || !newExercise.category.trim()) return;
    
    try {
      await addExercise({
        ...newExercise,
        custom: true
      });
      
      setNewExercise({
        name: '',
        category: '',
        type: 'weight_reps',
        notes: ''
      });
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Error adding exercise:', error);
    }
  };

  const handleExerciseClick = async (exercise: Exercise) => {
    try {
      let workoutId = currentWorkout?.id;
      
      // Create workout if it doesn't exist
      if (!workoutId) {
        workoutId = await createWorkout(currentDate);
      }
      
      // Add exercise to workout
      if (workoutId && exercise.id) {
        await addExerciseToWorkout(workoutId, exercise.id);
      }
      
      // Navigate to training
      navigate(`/training/${exercise.id}`);
    } catch (error) {
      console.error('Error adding exercise to workout:', error);
    }
  };

  const renderByCategory = () => {
    const exercisesByCategory = categories.reduce((acc, category) => {
      acc[category] = exercises.filter(ex => ex.category === category);
      return acc;
    }, {} as Record<string, Exercise[]>);

    return (
      <div className="space-y-6">
        {categories.map(category => {
          const categoryExercises = exercisesByCategory[category] || [];
          if (categoryExercises.length === 0) return null;
          
          return (
            <div key={category}>
              <h3 className="text-lg font-semibold text-primary mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {categoryExercises.map(exercise => (
                  <Card 
                    key={exercise.id}
                    className="cursor-pointer hover:bg-surface-secondary transition-colors"
                    onClick={() => handleExerciseClick(exercise)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{exercise.name}</h4>
                          <p className="text-sm text-muted-foreground capitalize">
                            {exercise.type.replace('_', ' & ')}
                          </p>
                        </div>
                        <Plus size={20} className="text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderExerciseList = () => {
    if (filteredExercises.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {searchQuery ? 'No exercises found' : 'No exercises yet'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {filteredExercises.map(exercise => (
          <Card 
            key={exercise.id}
            className="cursor-pointer hover:bg-surface-secondary transition-colors"
            onClick={() => handleExerciseClick(exercise)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{exercise.name}</h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {exercise.category}
                    </Badge>
                    <span className="text-sm text-muted-foreground capitalize">
                      {exercise.type.replace('_', ' & ')}
                    </span>
                  </div>
                </div>
                <Plus size={20} className="text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        title="Exercise Library" 
        onAddClick={() => setIsAddDialogOpen(true)}
      />
      
      {/* Tabs */}
      <div className="bg-surface border-b border-border">
        <div className="flex items-center px-4">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                selectedTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
          <Input
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Content */}
        {selectedTab === 'CATEGORIES' ? renderByCategory() : renderExerciseList()}
      </div>

      {/* Add Exercise Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Exercise</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="exercise-name">Exercise Name</Label>
              <Input
                id="exercise-name"
                value={newExercise.name}
                onChange={(e) => setNewExercise(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Barbell Rows"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="exercise-category">Category</Label>
              <Select
                value={newExercise.category}
                onValueChange={(value) => setNewExercise(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="exercise-type">Type</Label>
              <Select
                value={newExercise.type}
                onValueChange={(value) => setNewExercise(prev => ({ ...prev, type: value as Exercise['type'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXERCISE_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="exercise-notes">Notes (Optional)</Label>
              <Textarea
                id="exercise-notes"
                value={newExercise.notes}
                onChange={(e) => setNewExercise(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
                rows={3}
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
                onClick={handleAddExercise}
                disabled={!newExercise.name.trim() || !newExercise.category.trim()}
              >
                Add Exercise
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}