import { useEffect, useState } from 'react';
import { Search, Plus, MoreVertical } from 'lucide-react'; // NEW
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
import {
  DropdownMenu,            // NEW
  DropdownMenuTrigger,     // NEW
  DropdownMenuContent,     // NEW
  DropdownMenuItem,        // NEW
} from '@/components/ui/dropdown-menu'; // NEW
import { useExercisesStore } from '@/store/exercisesStore';
import { useWorkoutsStore } from '@/store/workoutsStore';
import { useNavigate } from 'react-router-dom';
import { db, Exercise } from '@/db/dexie'; // UPDATED: import db for delete cascade

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

type EditForm = {            // NEW
  id: number;
  name: string;
  category: string;          // selected value (existing category or "__new__")
  type: Exercise['type'];
  notes?: string;
  newCategory?: string;      // when "__new__" chosen
};

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
    addExercise,
    loadExercises
  } = useExercisesStore();

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  const {
    currentWorkout,
    currentDate,
    createWorkout,
    addExerciseToWorkout,
    loadWorkouts, // NEW: refresh after delete
    loadWorkoutByDate, // NEW: refresh after delete
  } = useWorkoutsStore();

  const [newExercise, setNewExercise] = useState({
    name: '',
    category: '',
    type: 'weight_reps' as Exercise['type'],
    notes: ''
  });

  // --- Edit/Delete state (NEW) ---
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Exercise | null>(null);
  const [usageCount, setUsageCount] = useState<number>(0);

  const tabs = ['ALL', 'CUSTOM', 'CATEGORIES', 'ROUTINES'];
  const filteredExercises = getFilteredExercises();
  const categoriesAll = getCategories().filter(cat => !['ALL', 'CUSTOM'].includes(cat)); // UPDATED

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

  // ====== EDIT (NEW) =========================================================
  const openEdit = (ex: Exercise) => {
    // default to current category; user can switch to "__new__"
    setEditForm({
      id: ex.id!,
      name: ex.name,
      category: ex.category || '', // existing category
      type: ex.type,
      notes: ex.notes || '',
      newCategory: '',
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editForm) return;

    const name = editForm.name.trim().replace(/\s+/g, ' ');
    if (!name) return;

    // case-insensitive uniqueness, excluding current id
    const dup = exercises.some(
      (e) => e.id !== editForm.id && e.name.trim().toLowerCase() === name.toLowerCase()
    );
    if (dup) {
      console.error('Duplicate name');
      return;
    }

    // Determine category to save
    let categoryToSave = editForm.category;
    if (editForm.category === '__new__') {
      const nc = (editForm.newCategory || '').trim().replace(/\s+/g, ' ');
      if (!nc) {
        console.error('New category required');
        return;
      }
      categoryToSave = nc;
    }

    try {
      await db.exercises.update(editForm.id, {
        name,
        category: categoryToSave,
        type: editForm.type,
        notes: editForm.notes?.trim() || undefined,
      });
      await loadExercises();
      setEditOpen(false);
      setEditForm(null);
    } catch (e) {
      console.error('Edit failed', e);
    }
  };

  // ====== DELETE (NEW) =======================================================
  const openDelete = async (ex: Exercise) => {
    setPendingDelete(ex);
    // count how many workouts reference this exercise
    const ws = await db.workouts.toArray();
    const count = ws.reduce(
      (acc, w) => acc + ((w.exercises || []).some((e) => e.exerciseId === ex.id) ? 1 : 0),
      0
    );
    setUsageCount(count);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    const ex = pendingDelete;
    if (!ex?.id) return;
    try {
      await db.transaction('rw', [db.workouts, db.exercises], async () => {
        // remove from all workouts
        const ws = await db.workouts.toArray();
        const changed: { id: number; exercises: any[] }[] = [];
        for (const w of ws) {
          const filtered = (w.exercises || []).filter((e: any) => e.exerciseId !== ex.id);
          if (filtered.length !== (w.exercises || []).length) {
            changed.push({ id: w.id!, exercises: filtered });
          }
        }
        if (changed.length) {
          await Promise.all(changed.map((c) => db.workouts.update(c.id, { exercises: c.exercises })));
        }
        // delete exercise
        await db.exercises.delete(ex.id);
      });

      // refresh memory
      await loadExercises();
      await loadWorkouts?.();
      await loadWorkoutByDate?.(currentDate);
    } catch (e) {
      console.error('Delete failed', e);
    } finally {
      setConfirmOpen(false);
      setPendingDelete(null);
      setUsageCount(0);
    }
  };

  // ====== UI fragments =======================================================
  const KebabMenu = ({ exercise }: { exercise: Exercise }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => e.stopPropagation()} // prevent card click
          aria-label="More actions"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onClick={(e) => e.stopPropagation()} // prevent card click
      >
        <DropdownMenuItem
          onClick={() => openEdit(exercise)}
          onSelect={(e) => e.preventDefault()}
        >
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => openDelete(exercise)}
          onSelect={(e) => e.preventDefault()}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const renderByCategory = () => {
    const exercisesByCategory = categoriesAll.reduce((acc, category) => {
      acc[category] = exercises.filter(ex => ex.category === category);
      return acc;
    }, {} as Record<string, Exercise[]>);

    return (
      <div className="space-y-6">
        {categoriesAll.map(category => {
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
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <h4 className="font-medium">{exercise.name}</h4>
                          <p className="text-sm text-muted-foreground capitalize">
                            {exercise.type.replace('_', ' & ')}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                         
                          <KebabMenu exercise={exercise} /> {/* NEW */}
                        </div>
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
              <div className="flex items-center justify-between gap-2">
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
                <div className="flex items-center gap-1">
                  
                  <KebabMenu exercise={exercise} /> {/* NEW */}
                </div>
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

      {/* Edit Exercise Dialog (NEW) */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Edit Exercise</DialogTitle>
          </DialogHeader>

          {editForm && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Exercise name"
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={editForm.category}
                  onValueChange={(v) => setEditForm({ ...editForm, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesAll.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                    <SelectItem value="__new__">Create new…</SelectItem>
                  </SelectContent>
                </Select>
                {editForm.category === '__new__' && (
                  <Input
                    className="mt-2"
                    placeholder="New category"
                    value={editForm.newCategory || ''}
                    onChange={(e) => setEditForm({ ...editForm, newCategory: e.target.value })}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={editForm.type}
                  onValueChange={(v) => setEditForm({ ...editForm, type: v as Exercise['type'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXERCISE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={editForm.notes ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={saveEdit}>Save</Button>
                <Button className="flex-1" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog (NEW) */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Delete Exercise?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {usageCount > 0
              ? `This exercise appears in ${usageCount} workout(s). Deleting will remove it from all those workouts.`
              : 'This will permanently delete the exercise.'}
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="destructive" className="flex-1" onClick={confirmDelete}>Delete</Button>
            <Button variant="outline" className="flex-1" onClick={() => setConfirmOpen(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
