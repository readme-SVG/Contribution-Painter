(function(global){
  const locales = {};

  function registerLocale(code, messages){
    if(!code || typeof code !== 'string') throw new Error('Locale code must be a string');
    if(!messages || typeof messages !== 'object' || Array.isArray(messages)){
      throw new Error(`Locale ${code} must provide a messages object`);
    }
    locales[code] = Object.freeze({ ...messages });
  }

  function validateLocales(defaultCode){
    const base = locales[defaultCode];
    if(!base) throw new Error(`Default locale not registered: ${defaultCode}`);

    const baseKeys = Object.keys(base).sort();
    const baseSet = new Set(baseKeys);

    for(const [code, messages] of Object.entries(locales)){
      const keys = Object.keys(messages).sort();
      const keySet = new Set(keys);

      const missing = baseKeys.filter(k => !keySet.has(k));
      const extra = keys.filter(k => !baseSet.has(k));

      if(missing.length || extra.length){
        const parts = [];
        if(missing.length) parts.push(`missing: ${missing.join(', ')}`);
        if(extra.length) parts.push(`extra: ${extra.join(', ')}`);
        throw new Error(`Locale key mismatch for ${code} (${parts.join(' | ')})`);
      }
    }

    return baseKeys;
  }

  function createI18n(defaultCode = 'en-US'){
    validateLocales(defaultCode);

    // Snapshot the locale list once — it is fixed after all files register.
    const available = Object.freeze(Object.keys(locales));
    let activeCode = defaultCode;

    return {
      get locale(){ return activeCode; },
      get availableLocales(){ return available; },
      setLocale(code){
        activeCode = locales[code] ? code : defaultCode;
      },
      t(key){
        const active = locales[activeCode] || locales[defaultCode] || {};
        return active[key] ?? key;
      }
    };
  }

  global.I18N = { registerLocale, createI18n };
})(window);
