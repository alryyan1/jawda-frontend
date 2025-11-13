import { format, formatDistanceToNow } from "date-fns";
import { arSA } from "date-fns/locale";
import { arabicDayToNumber } from "./constants";

export { arabicDayToNumber };

// Calculate date for a given day name
export const getDateForDay = (dayName: string): string => {
  const today = new Date();
  const todayDay = today.getDay();
  const tomorrowDay = (todayDay + 1) % 7;
  const targetDay = arabicDayToNumber[dayName] ?? -1;

  if (targetDay === -1) return "";

  // Calculate days until target day (starting from tomorrow)
  const daysUntilTarget =
    targetDay >= tomorrowDay
      ? targetDay - tomorrowDay
      : 7 - tomorrowDay + targetDay;

  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + daysUntilTarget + 1); // +1 because we start from tomorrow

  return format(targetDate, "yyyy-MM-dd", { locale: arSA });
};

// Format date for display
export const formatDateDisplay = (dateString: string): string => {
  if (!dateString) return "";
  const date = new Date(dateString + "T00:00:00");
  return format(date, "d MMMM", { locale: arSA });
};

// Format relative time from Firestore timestamp
export const formatRelativeTime = (createdAt: unknown): string => {
  if (!createdAt) return "";

  let date: Date;

  // Handle Firestore timestamp
  if (
    createdAt &&
    typeof createdAt === "object" &&
    "toDate" in createdAt &&
    typeof (createdAt as { toDate: () => Date }).toDate === "function"
  ) {
    date = (createdAt as { toDate: () => Date }).toDate();
  } else if (
    createdAt &&
    typeof createdAt === "object" &&
    "seconds" in createdAt
  ) {
    // Firestore timestamp with seconds
    date = new Date((createdAt as { seconds: number }).seconds * 1000);
  } else if (createdAt instanceof Date) {
    date = createdAt;
  } else if (typeof createdAt === "string") {
    date = new Date(createdAt);
  } else {
    return "";
  }

  try {
    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: arSA,
    });
  } catch {
    return "";
  }
};

// Generate time slots based on schedule
export const generateTimeSlots = (
  start: string,
  end: string,
  intervalMinutes: number = 30
): string[] => {
  const slots: string[] = [];
  const [startHour, startMin] = start.split(":").map(Number);
  const [endHour, endMin] = end.split(":").map(Number);

  let currentHour = startHour;
  let currentMin = startMin;

  while (
    currentHour < endHour ||
    (currentHour === endHour && currentMin < endMin)
  ) {
    const timeString = `${String(currentHour).padStart(2, "0")}:${String(
      currentMin
    ).padStart(2, "0")}`;
    slots.push(timeString);

    currentMin += intervalMinutes;
    if (currentMin >= 60) {
      currentMin -= 60;
      currentHour += 1;
    }
  }

  return slots;
};

