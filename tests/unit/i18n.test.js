import test from "node:test";
import assert from "node:assert/strict";
import english from "../../js/i18n/en-US.js";
import { createI18n, detectLocale, LOCALES } from "../../js/i18n/index.js";

test("all dictionaries have identical keys, string values and interpolation contracts", async () => {
  for (const [code, load] of Object.entries(LOCALES)) {
    const messages = (await load()).default;
    assert.deepEqual(
      Object.keys(messages).sort(),
      Object.keys(english).sort(),
      code,
    );
    for (const [key, value] of Object.entries(messages)) {
      assert.equal(typeof value, "string", `${code}.${key}`);
      assert.deepEqual(
        [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort(),
        [...english[key].matchAll(/\{(\w+)\}/g)]
          .map((match) => match[1])
          .sort(),
        `${code}.${key}`,
      );
      assert.ok(!/<[a-z]/i.test(value), `${code}.${key} must be plain text`);
    }
  }
});

test("locale detection, interpolation and missing-key fallback are predictable", async () => {
  assert.equal(detectLocale(["uk-UA", "en-US"]), "uk-UA");
  assert.equal(detectLocale(["fr-CA"]), "fr-FR");
  assert.equal(detectLocale(["xx-XX"]), "en-US");
  const i18n = createI18n();
  await i18n.setLocale("uk-UA");
  assert.equal(
    i18n.t("cell_label", { date: "2024-01-01", level: 2 }),
    "2024-01-01, інтенсивність 2",
  );
  assert.equal(i18n.t("missing_key"), "missing_key");
  await i18n.setLocale("invalid");
  assert.equal(i18n.locale, "en-US");
});
