import test from "node:test";
import assert from "node:assert/strict";
import { createCalendar } from "../../js/core/calendar.js";
import { Pattern } from "../../js/core/pattern.js";
import {
  loadDraft,
  parseDocument,
  saveDraft,
  serializePattern,
} from "../../js/core/portability.js";

const years = [2025, 2024];
const today = "2025-01-01";

test("JSON roundtrip contains only artwork and preserves intensities", () => {
  const pattern = new Pattern(createCalendar(2024, today));
  pattern.set(pattern.calendar.byDate.get("2024-02-29").index, 3);
  const document = serializePattern(pattern);
  assert.deepEqual(Object.keys(document).sort(), [
    "cells",
    "format",
    "version",
    "year",
  ]);
  assert.deepEqual(
    parseDocument(JSON.stringify(document), years, today),
    document,
  );
});

test("imports reject unknown formats, dates, future cells, levels and oversized files", () => {
  const valid = {
    format: "contribution-painter",
    version: 1,
    year: 2024,
    cells: { "2024-01-01": 1 },
  };
  for (const change of [
    { version: 2 },
    { year: 2020 },
    { cells: { "2024-02-30": 1 } },
    { cells: { "2024-01-01": 5 } },
    { cells: { "2024-01-01": "1" } },
    { cells: [] },
  ]) {
    assert.throws(
      () =>
        parseDocument(JSON.stringify({ ...valid, ...change }), years, today),
      { message: "alert_import" },
    );
  }
  assert.throws(() => parseDocument("{invalid", years, today), {
    message: "alert_import",
  });
  assert.throws(() => parseDocument(" ".repeat(65537), years, today), {
    message: "alert_file_size",
  });
});

test("draft storage is versioned, validated and safe when storage is blocked", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key),
    setItem: (key, value) => values.set(key, value),
  };
  const pattern = new Pattern(createCalendar(2024, today));
  pattern.set(pattern.calendar.activeIndices[0], 4);
  assert.equal(saveDraft(storage, new Map([[2024, pattern]]), 2024), true);
  assert.equal(
    loadDraft(storage, years, today).patterns[0].cells["2024-01-01"],
    4,
  );
  assert.equal(saveDraft(null, new Map(), 2024), false);
  assert.equal(
    loadDraft(
      {
        getItem() {
          throw new Error("blocked");
        },
      },
      years,
    ),
    null,
  );
  values.set(
    "contribution-painter:draft:v1",
    JSON.stringify({
      format: "contribution-painter",
      version: 1,
      patterns: [{ ...serializePattern(pattern), year: 1900 }],
    }),
  );
  assert.equal(loadDraft(storage, years, today), null);
});
