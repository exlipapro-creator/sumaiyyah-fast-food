export interface DeliveryWindowOption {
  id: string;
  label: string;
  start_time: string; // "11:30"
  end_time: string;   // "12:00"
  category: "lunch" | "afternoon" | "evening";
  cutoff_minutes_prior: number; // e.g. 120 (2 hrs)
}

export const CORPORATE_DELIVERY_WINDOWS: DeliveryWindowOption[] = [
  { id: "lunch-1", label: "11:30 AM – 12:00 PM (Early Lunch)", start_time: "11:30", end_time: "12:00", category: "lunch", cutoff_minutes_prior: 120 },
  { id: "lunch-2", label: "12:00 PM – 12:30 PM (Peak Lunch)", start_time: "12:00", end_time: "12:30", category: "lunch", cutoff_minutes_prior: 120 },
  { id: "lunch-3", label: "12:30 PM – 1:00 PM (Standard Lunch)", start_time: "12:30", end_time: "13:00", category: "lunch", cutoff_minutes_prior: 120 },
  { id: "lunch-4", label: "1:00 PM – 1:30 PM (Midday Lunch)", start_time: "13:00", end_time: "13:30", category: "lunch", cutoff_minutes_prior: 120 },
  { id: "lunch-5", label: "1:30 PM – 2:00 PM (Late Lunch)", start_time: "13:30", end_time: "14:00", category: "lunch", cutoff_minutes_prior: 120 },
  { id: "afternoon-1", label: "2:30 PM – 3:30 PM (Afternoon Meeting)", start_time: "14:30", end_time: "15:30", category: "afternoon", cutoff_minutes_prior: 120 },
  { id: "afternoon-2", label: "4:00 PM – 5:00 PM (Tea / Wrap-Up)", start_time: "16:00", end_time: "17:00", category: "afternoon", cutoff_minutes_prior: 120 },
  { id: "evening-1", label: "5:30 PM – 6:30 PM (Evening All-Hands)", start_time: "17:30", end_time: "18:30", category: "evening", cutoff_minutes_prior: 150 },
  { id: "evening-2", label: "6:30 PM – 7:30 PM (Dinner & Overtime)", start_time: "18:30", end_time: "19:30", category: "evening", cutoff_minutes_prior: 150 },
];

export interface ScheduleValidationResult {
  valid: boolean;
  error?: string;
  target_dispatch_time?: string;
  delivery_window_label?: string;
  start_time?: string;
  end_time?: string;
}

/**
 * Calculates the target dispatch time based on the window start time and transit buffer.
 * Standard transit & staging buffer: 25 minutes prior to window start.
 */
export function calculateDispatchTime(deliveryDate: string, startTime: string): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes - 25; // 25 min buffer for Kariakoo -> Dar delivery
  const dispatchHour = Math.max(7, Math.floor(totalMinutes / 60));
  const dispatchMinute = Math.max(0, totalMinutes % 60);
  return `${String(dispatchHour).padStart(2, "0")}:${String(dispatchMinute).padStart(2, "0")}`;
}

/**
 * Validates requested scheduled date and delivery window against real cutoff rules.
 * Supports same-day scheduling if ordered with sufficient lead time, or future dates.
 */
export function validateDeliverySchedule(
  deliveryDateStr: string,
  windowIdOrLabel: string,
  now: Date = new Date()
): ScheduleValidationResult {
  if (!deliveryDateStr || typeof deliveryDateStr !== "string") {
    return { valid: false, error: "Please select a scheduled delivery date." };
  }

  // Parse target date YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(deliveryDateStr)) {
    return { valid: false, error: "Invalid delivery date format (expected YYYY-MM-DD)." };
  }

  const windowOption = CORPORATE_DELIVERY_WINDOWS.find(
    (w) => w.id === windowIdOrLabel || w.label === windowIdOrLabel || w.start_time === windowIdOrLabel
  );

  if (!windowOption) {
    return { valid: false, error: "Please select a valid delivery window from the scheduled options." };
  }

  const [year, month, day] = deliveryDateStr.split("-").map(Number);
  const targetDate = new Date(year, month - 1, day);

  // Strip time from now for day comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const maxFutureDate = new Date(today);
  maxFutureDate.setDate(today.getDate() + 30); // Max 30 days advance booking

  if (targetDate < today) {
    return { valid: false, error: "Scheduled delivery date cannot be in the past." };
  }

  if (targetDate > maxFutureDate) {
    return { valid: false, error: "Scheduled delivery dates are open up to 30 days in advance." };
  }

  const isToday = targetDate.getTime() === today.getTime();

  if (isToday) {
    const [wHour, wMin] = windowOption.start_time.split(":").map(Number);
    const windowStartTimestamp = new Date(year, month - 1, day, wHour, wMin, 0).getTime();
    const cutoffTimestamp = windowStartTimestamp - windowOption.cutoff_minutes_prior * 60 * 1000;

    if (now.getTime() > cutoffTimestamp) {
      return {
        valid: false,
        error: `Cutoff passed for the ${windowOption.label} slot. Same-day corporate orders require at least ${Math.round(
          windowOption.cutoff_minutes_prior / 60
        )} hours preparation notice. Please choose a later slot or tomorrow.`,
      };
    }
  }

  const targetDispatch = calculateDispatchTime(deliveryDateStr, windowOption.start_time);

  return {
    valid: true,
    delivery_window_label: windowOption.label,
    start_time: windowOption.start_time,
    end_time: windowOption.end_time,
    target_dispatch_time: targetDispatch,
  };
}
