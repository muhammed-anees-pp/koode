const INDIA_TIME_ZONE = "Asia/Kolkata";

const pad = (value) => String(value).padStart(2, "0");

export const uppercaseMeridiem = (value) =>
  String(value).replace(/\b(am|pm)\b/g, (match) => match.toUpperCase());

export const getIndiaTodayISO = () => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: INDIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
};

export const isoToCalendarDate = (value) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const calendarDateToISO = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const formatIndiaDate = (value) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: INDIA_TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
};

export const formatIndiaTime = (value) => {
  const [rawHours = "00", rawMinutes = "00"] = value.split(":");
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes);
  const meridiem = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${pad(minutes)} ${meridiem}`;
};

export const formatIndiaDateTime = (value) => {
  if (!value) return "";

  return uppercaseMeridiem(new Intl.DateTimeFormat("en-IN", {
    timeZone: INDIA_TIME_ZONE,
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value)));
};

export const getIndiaNowParts = () => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: INDIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(new Date());
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
    hour: Number(parts.find((part) => part.type === "hour")?.value),
    minute: Number(parts.find((part) => part.type === "minute")?.value),
  };
};

export const addDaysToISO = (value, days) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

export const getIndiaLeadTimeCutoffTimestamp = (hoursAhead = 24) => {
  const now = getIndiaNowParts();
  return Date.UTC(now.year, now.month - 1, now.day, now.hour, now.minute) + hoursAhead * 60 * 60 * 1000;
};

export const getIndiaSlotTimestamp = (dateISO, timeValue) => {
  const [year, month, day] = dateISO.split("-").map(Number);
  const [hours = "00", minutes = "00"] = timeValue.split(":");
  return Date.UTC(year, month - 1, day, Number(hours), Number(minutes));
};

export const compareIndiaAppointmentDateTime = (left, right) => {
  const leftStart = getIndiaSlotTimestamp(left.date, left.start_time);
  const rightStart = getIndiaSlotTimestamp(right.date, right.start_time);
  if (leftStart !== rightStart) return leftStart - rightStart;

  const leftEnd = getIndiaSlotTimestamp(left.date, left.end_time || left.start_time);
  const rightEnd = getIndiaSlotTimestamp(right.date, right.end_time || right.start_time);
  if (leftEnd !== rightEnd) return leftEnd - rightEnd;

  return String(left.created_at || "").localeCompare(String(right.created_at || ""));
};

export const isIndiaSlotBeyondLeadTime = (dateISO, timeValue, hoursAhead = 24) =>
  getIndiaSlotTimestamp(dateISO, timeValue) > getIndiaLeadTimeCutoffTimestamp(hoursAhead);

export const getEarliestBookableDateISO = (timeSlots, hoursAhead = 24, searchDays = 30) => {
  const today = getIndiaTodayISO();

  for (let offset = 0; offset <= searchDays; offset += 1) {
    const candidateDate = addDaysToISO(today, offset);
    const hasEligibleSlot = timeSlots.some(([startTime]) =>
      isIndiaSlotBeyondLeadTime(candidateDate, startTime, hoursAhead)
    );

    if (hasEligibleSlot) {
      return candidateDate;
    }
  }

  return today;
};
