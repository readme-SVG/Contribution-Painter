import test from "node:test";
import assert from "node:assert/strict";
import { createCalendar } from "../../js/core/calendar.js";
import { HISTORY_LIMIT, Pattern, resolveLevel } from "../../js/core/pattern.js";

const patternAt = (date = "2024-06-10") =>
  new Pattern(createCalendar(2024, date));

test("stroke history groups drag changes and redo is invalidated by a new stroke", () => {
  const pattern = patternAt();
  const [a, b] = pattern.calendar.activeIndices;
  pattern.beginStroke();
  pattern.set(a, 2);
  pattern.set(b, 3);
  assert.equal(pattern.endStroke(), true);
  assert.deepEqual(pattern.stats(1), { days: 2, minimum: 5, maximum: 5 });
  pattern.undo();
  assert.equal(pattern.stats().days, 0);
  pattern.redo();
  assert.equal(pattern.levels[b], 3);
  pattern.undo();
  pattern.transact(() => pattern.set(a, 1));
  assert.equal(pattern.redo(), false);
});

test("failed transactions roll back and no-op strokes do not pollute history", () => {
  const pattern = patternAt();
  const index = pattern.calendar.activeIndices[0];
  pattern.set(index, 2);
  assert.throws(() =>
    pattern.transact(() => {
      pattern.set(index, 4);
      throw new Error("invalid");
    }),
  );
  assert.equal(pattern.levels[index], 2);
  pattern.beginStroke();
  pattern.set(index, 2);
  assert.equal(pattern.endStroke(), false);
  assert.equal(pattern.past.length, 0);
});

test("history is bounded and future/out-of-range cells cannot be painted", () => {
  const pattern = patternAt("2025-01-01");
  const index = pattern.calendar.activeIndices[0];
  for (let level = 1; level <= HISTORY_LIMIT + 10; level += 1)
    pattern.transact(() => pattern.set(index, level % 5));
  assert.equal(pattern.past.length, HISTORY_LIMIT);
  assert.equal(
    pattern.set(pattern.calendar.days.find((day) => !day.editable).index, 4),
    false,
  );
  assert.equal(pattern.set(pattern.calendar.days.at(-1).index, 4), false);
  assert.throws(() => pattern.set(index, 6), RangeError);
});

test("partial fill selects exact unique days and random fill never creates invisible painted days", () => {
  const pattern = patternAt("2025-01-01");
  pattern.fill(50, 5, () => 0);
  assert.equal(pattern.stats(1).days, 183);
  assert.equal(pattern.levels.filter((level) => level > 0).length, 183);
  assert.ok(pattern.levels.every((level) => level === 0 || level === 1));
  pattern.fill(0, 4);
  assert.equal(pattern.stats().days, 0);
  pattern.fill(100, 4);
  assert.equal(pattern.stats().days, 366);
  pattern.invert();
  assert.equal(pattern.stats().days, 0);
});

test("random brush can erase but stats and immutable commit plans agree", () => {
  assert.equal(
    resolveLevel(5, () => 0),
    0,
  );
  assert.equal(
    resolveLevel(5, () => 0.999),
    4,
  );
  const pattern = patternAt("2025-01-01");
  pattern.fill(100, 5, () => 0);
  assert.equal(pattern.stats(5, true).days, 366);
  assert.equal(pattern.levels.filter((level) => level > 0).length, 366);
  const expected = pattern.stats(5, true).maximum;
  const plan = pattern.commitPlan(5, true, () => 0.999);
  assert.equal(
    plan.reduce((sum, day) => sum + day.count, 0),
    expected,
  );
  assert.ok(Object.isFrozen(plan));
  pattern.clear();
  assert.equal(plan.length, 366);
  assert.throws(() => pattern.commitPlan(7, false), RangeError);
});
