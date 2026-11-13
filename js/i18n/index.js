import english from "./en-US.js";

export const DEFAULT_LOCALE = "en-US";
export const LOCALES = Object.freeze({
  "en-US": () => Promise.resolve({ default: english }),
  "ru-RU": () => import("./ru-RU.js"),
  "uk-UA": () => import("./uk-UA.js"),
  "kk-KZ": () => import("./kk-KZ.js"),
  "cs-CZ": () => import("./cs-CZ.js"),
  "nl-NL": () => import("./nl-NL.js"),
  "sv-SE": () => import("./sv-SE.js"),
  "de-DE": () => import("./de-DE.js"),
  "pl-PL": () => import("./pl-PL.js"),
  "fr-FR": () => import("./fr-FR.js"),
  "zh-CN": () => import("./zh-CN.js"),
  "ja-JP": () => import("./ja-JP.js"),
});

export function detectLocale(
  languages = navigator.languages || [navigator.language],
) {
  for (const language of languages) {
    if (LOCALES[language]) return language;
    const match = Object.keys(LOCALES).find(
      (code) => code.split("-")[0] === language.split("-")[0],
    );
    if (match) return match;
  }
  return DEFAULT_LOCALE;
}

export function createI18n() {
  let locale = DEFAULT_LOCALE;
  let messages = english;
  let revision = 0;
  const loaded = new Map([[DEFAULT_LOCALE, english]]);

  return {
    get locale() {
      return locale;
    },
    async setLocale(code) {
      const requested = ++revision;
      const loader = LOCALES[code] || LOCALES[DEFAULT_LOCALE];
      const dictionary = loaded.get(code) || (await loader()).default;
      if (requested !== revision) return;
      loaded.set(code, dictionary);
      messages = dictionary;
      locale = LOCALES[code] ? code : DEFAULT_LOCALE;
    },
    t(key, values = {}) {
      const template = messages[key] ?? english[key] ?? key;
      return template.replace(
        /\{(\w+)\}/g,
        (match, name) => values[name] ?? match,
      );
    },
  };
}
