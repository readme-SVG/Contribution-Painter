import test from "node:test";
import assert from "node:assert/strict";
import {
  availableYears,
  createCalendar,
  utcDay,
} from "../../js/core/calendar.js";

test("calendar boundaries include exactly the selected year and Sunday-aligned weeks", () => {
  for (const year of [2020, 2021, 2023, 2024, 2025, 2026]) {
    const calendar = createCalendar(year, "2027-01-01T00:00:00Z");
    assert.equal(
      calendar.activeIndices.length,
      year === 2020 || year === 2024 ? 366 : 365,
    );
    assert.equal(new Date(calendar.start).getUTCDay(), 0);
    assert.equal(new Date(calendar.end).getUTCDay(), 6);
    assert.ok([53, 54].includes(calendar.columns));
    assert.equal(calendar.months.length, 12);
    assert.equal(calendar.months[0].month, 0);
    assert.equal(calendar.days[calendar.activeIndices[0]].key, `${year}-01-01`);
    assert.equal(
      calendar.days[calendar.activeIndices.at(-1)].key,
      `${year}-12-31`,
    );
  }
});

test("future days and adjacent years are not editable", () => {
  const calendar = createCalendar(2024, "2024-02-29T23:59:00Z");
  assert.equal(calendar.activeIndices.length, 60);
  assert.equal(calendar.byDate.get("2024-02-29").editable, true);
  assert.equal(calendar.byDate.get("2024-03-01").editable, false);
  assert.equal(calendar.byDate.get("2023-12-31").editable, false);
  assert.equal(createCalendar(2025, "2024-12-31").activeIndices.length, 0);
});

test("UTC arithmetic is independent of host timezone and DST", () => {
  assert.equal(utcDay("2024-03-10T23:59:00-07:00"), Date.UTC(2024, 2, 11));
  const calendar = createCalendar(2024, "2025-01-01");
  const keys = calendar.activeIndices.map((index) => calendar.days[index].key);
  assert.equal(new Set(keys).size, 366);
  assert.ok(keys.includes("2024-03-10"));
  assert.ok(keys.includes("2024-11-03"));
  assert.deepEqual(availableYears("2026-11-13").slice(0, 2), [2027, 2026]);
});
