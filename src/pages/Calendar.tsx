import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useWorkoutsStore } from '@/store/workoutsStore';
import { useNavigate } from 'react-router-dom';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Calendar() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { workouts, setCurrentDate, loadWorkoutByDate } = useWorkoutsStore();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad to Monday-start grid
  const startPadding = (monthStart.getDay() + 6) % 7; // Mon=0 ... Sun=6
  const calendarDays = [
    ...Array.from({ length: startPadding }, () => null as Date | null),
    ...monthDays,
  ];

  // Get workout dates for quick lookup
  const workoutDates = new Set(workouts.map(w => w.date));

  const handlePrevMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const handleDateClick = async (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    setCurrentDate(dateString);
    await loadWorkoutByDate(dateString);
    navigate('/home');
  };

  const hasWorkout = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return workoutDates.has(dateString);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="Calendar" onMenuClick={() => navigate(-1)} />
      
      <div className="p-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevMonth}
          >
            <ChevronLeft size={20} />
          </Button>
          
          <h2 className="text-xl font-semibold">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextMonth}
          >
            <ChevronRight size={20} />
          </Button>
        </div>

        {/* Calendar Grid */}
        <Card>
          <CardContent className="p-4">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, idx) => {
                if (!date) {
                  return <div key={`pad-${idx}`} className="p-3 rounded-lg" />;
                }
                const isCurrentMonth = isSameMonth(date, currentMonth);
                const isCurrentDay = isToday(date);
                const hasWorkoutData = hasWorkout(date);

                return (
                  <button
                    key={date.toDateString()}
                    onClick={() => handleDateClick(date)}
                    className={`
                      relative p-3 text-sm rounded-lg transition-colors
                      ${isCurrentMonth 
                        ? 'text-foreground hover:bg-surface-secondary' 
                        : 'text-muted-foreground'
                      }
                      ${isCurrentDay 
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                        : ''
                      }
                    `}
                  >
                    <span className="relative z-10">
                      {format(date, 'd')}
                    </span>
                    
                    {/* Workout Indicator */}
                    {hasWorkoutData && !isCurrentDay && (
                      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center space-x-6 text-sm text-muted-foreground">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-primary rounded-full" />
            <span>Today</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-primary rounded-full" />
            <span>Has workout</span>
          </div>
        </div>

        {/* Recent Workouts */}
        {workouts.length > 0 && (
          <Card className="mt-6">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Recent Workouts</h3>
              <div className="space-y-2">
                {workouts.slice(0, 5).map(workout => (
                  <button
                    key={workout.id}
                    onClick={() => {
                      setCurrentDate(workout.date);
                      navigate('/home');
                    }}
                    className="w-full text-left p-3 rounded-lg hover:bg-surface-secondary transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{workout.date}</div>
                        <div className="text-sm text-muted-foreground">
                          {workout.exercises.length} exercise{workout.exercises.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {workout.exercises.reduce((total, ex) => total + ex.sets.length, 0)} sets
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}