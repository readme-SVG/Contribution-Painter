import { MAX_LEVEL, MULTIPLIERS } from "./calendar.js";

export const HISTORY_LIMIT = 50;
export const RANDOM_BRUSH = 5;

export function resolveLevel(brush, random = Math.random, minimum = 0) {
  if (brush === RANDOM_BRUSH)
    return minimum + Math.floor(random() * (MAX_LEVEL - minimum + 1));
  if (!Number.isInteger(brush) || brush < 0 || brush > MAX_LEVEL) {
    throw new RangeError("Invalid paint intensity.");
  }
  return brush;
}

export class Pattern {
  constructor(calendar) {
    this.calendar = calendar;
    this.levels = new Uint8Array(calendar.days.length);
    this.past = [];
    this.future = [];
  }

  set(index, level) {
    if (!this.calendar.days[index]?.editable) return false;
    if (!Number.isInteger(level) || level < 0 || level > MAX_LEVEL) {
      throw new RangeError("Invalid paint intensity.");
    }
    if (this.levels[index] === level) return false;
    this.levels[index] = level;
    return true;
  }

  beginStroke() {
    if (this.stroke) throw new Error("A paint stroke is already in progress.");
    this.stroke = this.levels.slice();
  }

  endStroke() {
    const before = this.stroke;
    if (!before) return false;
    this.stroke = null;
    const changes = [];
    for (let index = 0; index < this.levels.length; index += 1) {
      if (before[index] !== this.levels[index])
        changes.push([index, before[index], this.levels[index]]);
    }
    if (!changes.length) return false;
    this.past.push(changes);
    if (this.past.length > HISTORY_LIMIT) this.past.shift();
    this.future.length = 0;
    return true;
  }

  transact(change) {
    this.beginStroke();
    try {
      change();
      return this.endStroke();
    } catch (error) {
      this.levels.set(this.stroke);
      this.stroke = null;
      throw error;
    }
  }

  undo() {
    return this.#restore(this.past, this.future);
  }

  redo() {
    return this.#restore(this.future, this.past);
  }

  #restore(source, destination) {
    const changes = source.pop();
    if (!changes) return false;
    for (const [index, before, after] of changes)
      this.levels[index] = source === this.past ? before : after;
    destination.push(changes);
    return true;
  }

  clear() {
    return this.transact(() => this.levels.fill(0));
  }

  invert() {
    return this.transact(() => {
      for (const index of this.calendar.activeIndices) {
        this.levels[index] = MAX_LEVEL - this.levels[index];
      }
    });
  }

  fill(percent, brush, random = Math.random) {
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      throw new RangeError("Fill percentage must be between 0 and 100.");
    }
    const pool = [...this.calendar.activeIndices];
    const target = Math.round(pool.length * (percent / 100));
    return this.transact(() => {
      this.levels.fill(0);
      // A partial Fisher–Yates shuffle avoids shuffling the unused tail.
      for (let index = 0; index < target; index += 1) {
        const picked = index + Math.floor(random() * (pool.length - index));
        [pool[index], pool[picked]] = [pool[picked], pool[index]];
        this.levels[pool[index]] = resolveLevel(brush, random, 1);
      }
    });
  }

  replace(cells) {
    return this.transact(() => {
      this.levels.fill(0);
      for (const [key, level] of Object.entries(cells)) {
        const day = this.calendar.byDate.get(key);
        if (
          !day?.editable ||
          !Number.isInteger(level) ||
          level < 0 ||
          level > MAX_LEVEL
        ) {
          throw new RangeError(
            "The pattern contains an invalid date or intensity.",
          );
        }
        this.levels[day.index] = level;
      }
    });
  }

  stats(multiplier = 5, spread = false) {
    let days = 0;
    let intensity = 0;
    for (const index of this.calendar.activeIndices) {
      const level = this.levels[index];
      if (level > 0) {
        days += 1;
        intensity += level;
      }
    }
    const minimum = intensity * multiplier;
    return { days, minimum, maximum: minimum + (spread ? days * 2 : 0) };
  }

  commitPlan(multiplier, spread, random = Math.random) {
    if (!MULTIPLIERS.includes(multiplier))
      throw new RangeError("Invalid commit multiplier.");
    const plan = [];
    for (const index of this.calendar.activeIndices) {
      const level = this.levels[index];
      if (!level) continue;
      const count =
        level * multiplier + (spread ? Math.floor(random() * 3) : 0);
      plan.push(Object.freeze({ date: this.calendar.days[index].key, count }));
    }
    return Object.freeze(plan);
  }
}
