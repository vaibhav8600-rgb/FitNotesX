/**
 * Centralized workout validation framework
 * Provides type-safe validation for all workout-related inputs
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  value?: number;
}

export interface ValidationRules {
  weight: {
    min: number;
    max: number;
    decimals: number;
  };
  reps: {
    min: number;
    max: number;
  };
  time: {
    min: number;
    max: number;
  };
  distance: {
    min: number;
    max: number;
    decimals: number;
  };
}

export const DEFAULT_VALIDATION_RULES: ValidationRules = {
  weight: {
    min: 0.1,
    max: 1000.0,
    decimals: 1,
  },
  reps: {
    min: 1,
    max: 1000,
  },
  time: {
    min: 1,
    max: 86400, // 24 hours in seconds
  },
  distance: {
    min: 0.1,
    max: 999.9,
    decimals: 1,
  },
};

/**
 * Validates weight input
 */
export function validateWeight(value: string | number, rules = DEFAULT_VALIDATION_RULES.weight): ValidationResult {
  const errors: string[] = [];
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return { isValid: false, errors: ['Weight must be a valid number'] };
  }

  if (numValue < rules.min) {
    errors.push(`Weight must be at least ${rules.min}kg`);
  }

  if (numValue > rules.max) {
    errors.push(`Weight cannot exceed ${rules.max}kg`);
  }

  // Check decimal places
  const decimalStr = numValue.toString();
  if (decimalStr.includes('.')) {
    const decimals = decimalStr.split('.')[1].length;
    if (decimals > rules.decimals) {
      errors.push(`Weight can have at most ${rules.decimals} decimal place`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: errors.length === 0 ? Math.round(numValue * 10) / 10 : undefined,
  };
}

/**
 * Validates reps input
 */
export function validateReps(value: string | number, rules = DEFAULT_VALIDATION_RULES.reps): ValidationResult {
  const errors: string[] = [];
  const numValue = typeof value === 'string' ? parseInt(value, 10) : Math.floor(value);

  if (isNaN(numValue)) {
    return { isValid: false, errors: ['Reps must be a valid number'] };
  }

  if (numValue < rules.min) {
    errors.push(`Reps must be at least ${rules.min}`);
  }

  if (numValue > rules.max) {
    errors.push(`Reps cannot exceed ${rules.max}`);
  }

  // Ensure integer
  if (typeof value === 'string' && value.includes('.')) {
    errors.push('Reps must be a whole number');
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: errors.length === 0 ? numValue : undefined,
  };
}

/**
 * Validates time input (in seconds)
 */
export function validateTime(minutes: string | number, seconds: string | number, rules = DEFAULT_VALIDATION_RULES.time): ValidationResult {
  const errors: string[] = [];
  const mins = typeof minutes === 'string' ? parseInt(minutes, 10) : Math.floor(minutes);
  const secs = typeof seconds === 'string' ? parseInt(seconds, 10) : Math.floor(seconds);

  if (isNaN(mins) || isNaN(secs)) {
    return { isValid: false, errors: ['Time must be valid numbers'] };
  }

  if (mins < 0 || secs < 0) {
    errors.push('Time cannot be negative');
  }

  if (secs >= 60) {
    errors.push('Seconds must be less than 60');
  }

  const totalSeconds = mins * 60 + secs;

  if (totalSeconds < rules.min) {
    errors.push(`Time must be at least ${rules.min} second`);
  }

  if (totalSeconds > rules.max) {
    errors.push(`Time cannot exceed ${Math.floor(rules.max / 3600)}h ${Math.floor((rules.max % 3600) / 60)}m`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: errors.length === 0 ? totalSeconds : undefined,
  };
}

/**
 * Validates distance input
 */
export function validateDistance(value: string | number, rules = DEFAULT_VALIDATION_RULES.distance): ValidationResult {
  const errors: string[] = [];
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return { isValid: false, errors: ['Distance must be a valid number'] };
  }

  if (numValue < rules.min) {
    errors.push(`Distance must be at least ${rules.min}km`);
  }

  if (numValue > rules.max) {
    errors.push(`Distance cannot exceed ${rules.max}km`);
  }

  // Check decimal places
  const decimalStr = numValue.toString();
  if (decimalStr.includes('.')) {
    const decimals = decimalStr.split('.')[1].length;
    if (decimals > rules.decimals) {
      errors.push(`Distance can have at most ${rules.decimals} decimal place`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: errors.length === 0 ? Math.round(numValue * 10) / 10 : undefined,
  };
}

/**
 * Sanitizes and normalizes workout data
 */
export function sanitizeWorkoutData(data: {
  weight?: number;
  reps?: number;
  timeSec?: number;
  distance?: number;
}) {
  const sanitized: typeof data = {};

  if (data.weight !== undefined) {
    const result = validateWeight(data.weight);
    if (result.isValid && result.value !== undefined) {
      sanitized.weight = result.value;
    }
  }

  if (data.reps !== undefined) {
    const result = validateReps(data.reps);
    if (result.isValid && result.value !== undefined) {
      sanitized.reps = result.value;
    }
  }

  if (data.timeSec !== undefined && data.timeSec > 0) {
    const mins = Math.floor(data.timeSec / 60);
    const secs = data.timeSec % 60;
    const result = validateTime(mins, secs);
    if (result.isValid && result.value !== undefined) {
      sanitized.timeSec = result.value;
    }
  }

  if (data.distance !== undefined) {
    const result = validateDistance(data.distance);
    if (result.isValid && result.value !== undefined) {
      sanitized.distance = result.value;
    }
  }

  return sanitized;
}

/**
 * Check if workout data has validation issues
 */
export function hasValidationIssues(data: {
  weight?: number;
  reps?: number;
  timeSec?: number;
  distance?: number;
}): boolean {
  if (data.weight !== undefined) {
    const result = validateWeight(data.weight);
    if (!result.isValid) return true;
  }

  if (data.reps !== undefined) {
    const result = validateReps(data.reps);
    if (!result.isValid) return true;
  }

  if (data.timeSec !== undefined) {
    const mins = Math.floor(data.timeSec / 60);
    const secs = data.timeSec % 60;
    const result = validateTime(mins, secs);
    if (!result.isValid) return true;
  }

  if (data.distance !== undefined) {
    const result = validateDistance(data.distance);
    if (!result.isValid) return true;
  }

  return false;
}