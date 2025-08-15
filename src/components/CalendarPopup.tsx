import { useState, useRef, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useWorkoutsStore } from '@/store/workoutsStore';
import { useNavigate } from 'react-router-dom';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface CalendarPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CalendarPopup({ isOpen, onClose }: CalendarPopupProps) {
  const navigate = useNavigate();
  const popupRef = useRef<HTMLDivElement>(null);
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

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Prevent body scroll when popup is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

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
    onClose();
    navigate('/home');
  };

  const hasWorkout = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return workoutDates.has(dateString);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={popupRef}
        className="bg-background border border-border rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="p-4">
          
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevMonth}
            >
              <ChevronLeft size={20} />
            </Button>
            
            <h3 className="text-lg font-medium">
              {format(currentMonth, 'MMMM yyyy')}
            </h3>
            
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
            <CardContent className="p-3">
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {WEEKDAYS.map(day => (
                  <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date, idx) => {
                  if (!date) {
                    return <div key={`pad-${idx}`} className="p-2 rounded-md" />;
                  }
                  const isCurrentMonth = isSameMonth(date, currentMonth);
                  const isCurrentDay = isToday(date);
                  const hasWorkoutData = hasWorkout(date);

                  return (
                    <button
                      key={date.toDateString()}
                      onClick={() => handleDateClick(date)}
                      className={`
                        relative p-2 text-sm rounded-md transition-colors
                        ${isCurrentMonth 
                          ? 'text-foreground hover:bg-secondary' 
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
                        <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          <div className="mt-3 flex items-center justify-center space-x-4 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-primary rounded-full" />
              <span>Today</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-1 h-1 bg-primary rounded-full" />
              <span>Has workout</span>
            </div>
          </div>

          {/* Recent Workouts */}
          {workouts.length > 0 && (
            <Card className="mt-4">
              <CardContent className="p-3">
                <h4 className="font-medium mb-2 text-sm">Recent Workouts</h4>
                <div className="space-y-1">
                  {workouts.slice(0, 3).map(workout => (
                    <button
                      key={workout.id}
                      onClick={() => {
                        setCurrentDate(workout.date);
                        onClose();
                        navigate('/home');
                      }}
                      className="w-full text-left p-2 rounded-md hover:bg-secondary transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-xs">{workout.date}</div>
                          <div className="text-xs text-muted-foreground">
                            {workout.exercises.length} exercise{workout.exercises.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
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
    </div>
  );
}