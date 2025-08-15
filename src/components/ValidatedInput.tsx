import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ValidationResult } from '@/validation/workoutValidation';

interface ValidatedInputProps {
  label: string;
  value: string | number;
  onChange: (value: string, isValid: boolean, normalizedValue?: number) => void;
  onBlur?: () => void;
  validator: (value: string | number) => ValidationResult;
  placeholder?: string;
  type?: 'number' | 'text';
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  step?: string;
  min?: string;
  max?: string;
  required?: boolean;
}

export function ValidatedInput({
  label,
  value,
  onChange,
  onBlur,
  validator,
  placeholder,
  type = 'number',
  className,
  disabled,
  autoFocus,
  step,
  min,
  max,
  required,
}: ValidatedInputProps) {
  const [touched, setTouched] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult>({ 
    isValid: true, 
    errors: [] 
  });

  useEffect(() => {
    if (value !== '' && value !== undefined) {
      const result = validator(value);
      setValidationResult(result);
      onChange(value.toString(), result.isValid, result.value);
    } else {
      setValidationResult({ isValid: !required, errors: required ? ['This field is required'] : [] });
      onChange('', !required);
    }
  }, [value, validator, onChange, required]);

  const handleBlur = () => {
    setTouched(true);
    onBlur?.();
  };

  const showErrors = touched && !validationResult.isValid;
  const inputId = `input-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const errorId = `${inputId}-error`;

  return (
    <div className={cn('space-y-2', className)}>
      <Label 
        htmlFor={inputId}
        className={cn(
          'text-sm font-medium',
          showErrors && 'text-destructive'
        )}
      >
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      
      <div className="relative">
        <Input
          id={inputId}
          type={type}
          value={value}
          onChange={(e) => {
            const newValue = e.target.value;
            const result = validator(newValue);
            setValidationResult(result);
            onChange(newValue, result.isValid, result.value);
          }}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          step={step}
          min={min}
          max={max}
          className={cn(
            'transition-colors',
            showErrors && 'border-destructive focus:border-destructive focus:ring-destructive',
            validationResult.isValid && touched && 'border-success focus:border-success'
          )}
          aria-invalid={showErrors}
          aria-describedby={showErrors ? errorId : undefined}
        />
        
        {showErrors && (
          <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-destructive" />
        )}
      </div>
      
      {showErrors && (
        <div 
          id={errorId}
          className="flex items-start space-x-1 text-sm text-destructive"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            {validationResult.errors.map((error, index) => (
              <div key={index}>{error}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}