export const DAYS_PER_WEEK = 7;
export const MAX_LEVEL = 4;
export const MULTIPLIERS = Object.freeze([1, 3, 5, 10]);

const DAY_MS = 86_400_000;

export function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

export function utcDay(value = new Date()) {
  const date = new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function createCalendar(year, today = new Date()) {
  if (!Number.isInteger(year) || year < 1970 || year > 9998) {
    throw new RangeError("The year must be between 1970 and 9998.");
  }

  const firstDay = Date.UTC(year, 0, 1);
  const lastDay = Date.UTC(year, 11, 31);
  const start = firstDay - new Date(firstDay).getUTCDay() * DAY_MS;
  const end = lastDay + (6 - new Date(lastDay).getUTCDay()) * DAY_MS;
  const columns = Math.ceil((end - start + DAY_MS) / (7 * DAY_MS));
  const cutoff = utcDay(today);
  const days = [];
  const activeIndices = [];
  const byDate = new Map();
  const months = [];
  let previousMonth = -1;

  for (let timestamp = start; timestamp <= end; timestamp += DAY_MS) {
    const date = new Date(timestamp);
    const index = days.length;
    const key = dateKey(date);
    const editable =
      timestamp >= firstDay && timestamp <= lastDay && timestamp <= cutoff;
    const day = Object.freeze({
      index,
      key,
      timestamp,
      column: Math.floor(index / DAYS_PER_WEEK),
      row: index % DAYS_PER_WEEK,
      editable,
    });
    days.push(day);
    byDate.set(key, day);
    if (editable) activeIndices.push(index);

    if (
      timestamp >= firstDay &&
      timestamp <= lastDay &&
      date.getUTCMonth() !== previousMonth
    ) {
      months.push(
        Object.freeze({ column: day.column, month: date.getUTCMonth() }),
      );
      previousMonth = date.getUTCMonth();
    }
  }

  return Object.freeze({
    year,
    start,
    end,
    columns,
    days: Object.freeze(days),
    activeIndices: Object.freeze(activeIndices),
    byDate,
    months: Object.freeze(months),
  });
}

export function availableYears(today = new Date()) {
  const year = new Date(today).getUTCFullYear();
  return Array.from({ length: 12 }, (_, index) => year + 1 - index);
}
