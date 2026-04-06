function safeText(v) {
  return typeof v === "string" ? v : "";
}

function hasRequiredEnv(requiredKeys, env) {
  if (!Array.isArray(requiredKeys) || requiredKeys.length === 0) return true;
  for (const key of requiredKeys) {
    const v = env?.[key];
    if (typeof v !== "string" || !v.trim()) {
      return false;
    }
  }
  return true;
}

function assertRequiredEnv(env, requiredKeys, providerName) {
  if (!Array.isArray(requiredKeys) || requiredKeys.length === 0) return;
  const missing = requiredKeys.filter((key) => {
    const v = env?.[key];
    return typeof v !== "string" || !v.trim();
  });
  if (missing.length > 0) {
    throw buildProviderError(
      providerName,
      "未配置必填环境变量",
      missing.join(", ")
    );
  }
}

function buildProviderError(providerName, message, detail) {
  const base = safeText(providerName).trim() || "Provider";
  const msg = safeText(message).trim() || "未知错误";
  const extra = truncateDetail(detail);
  return new Error(`${base} ${msg}${extra ? `: ${extra}` : ""}`);
}

function toProviderError(providerName, error, fallbackMessage = "请求失败") {
  if (error instanceof Error) {
    const text = error.message || fallbackMessage;
    return buildProviderError(providerName, text);
  }
  return buildProviderError(providerName, fallbackMessage, String(error ?? ""));
}

function truncateDetail(detail, maxLen = 280) {
  const text = safeText(detail).trim();
  if (!text) return "";
  return text.length > maxLen ? text.slice(0, maxLen) : text;
}

function assertRequiredString(name, value, providerName) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${providerName}：${name} 不能为空`);
  }
}

async function readResponseTextSafe(response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function parseJsonTextSafe(text) {
  const raw = safeText(text);
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function buildUrl(baseUrl, params) {
  const base = safeText(baseUrl).trim();
  if (!base) return "";
  const entries = Object.entries(params || {}).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (entries.length === 0) return base;
  const query = new URLSearchParams(entries).toString();
  return `${base}${base.includes("?") ? "&" : "?"}${query}`;
}

function normalizeSourceLang(sourceLang, autoValue = "auto") {
  return sourceLang === "auto" ? autoValue : sourceLang;
}

function buildPlainTranslationPrompt(sourceLang, targetLang) {
  return `You are a translation engine. Translate the given text from "${sourceLang}" to "${targetLang}". Return translated text only, no explanation.`;
}

function mapLanguage(
  code,
  languageMap,
  { providerName = "Provider", fieldName = "语言", allowAuto = true } = {}
) {
  const value = safeText(code).trim();
  if (!value) {
    throw buildProviderError(providerName, `${fieldName} 不能为空`);
  }
  if (allowAuto && value === "auto") return "auto";
  if (!languageMap || typeof languageMap !== "object") return value;
  const mapped = languageMap[value];
  if (mapped === undefined || mapped === null || mapped === "") {
    throw buildProviderError(providerName, `${fieldName} 不支持`, value);
  }
  return mapped;
}

function assertTranslatedText(value, providerName, rawData) {
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  const detail =
    rawData === undefined ? "" : truncateDetail(JSON.stringify(rawData), 220);
  throw buildProviderError(providerName, "响应结构异常", detail);
}

async function fetchJsonOrThrow(url, options, providerName) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const detail = truncateDetail(await readResponseTextSafe(response));
    throw new Error(
      `${providerName} HTTP ${response.status}${detail ? `: ${detail}` : ""}`
    );
  }
  const data = await parseJsonSafe(response);
  if (!data || typeof data !== "object") {
    throw new Error(`${providerName} 响应结构异常`);
  }
  return data;
}

async function fetchAnyJsonOrThrow(url, options, providerName) {
  const response = await fetch(url, options);
  const text = await readResponseTextSafe(response);
  if (!response.ok) {
    const detail = truncateDetail(text);
    throw new Error(
      `${providerName} HTTP ${response.status}${detail ? `: ${detail}` : ""}`
    );
  }
  const data = parseJsonTextSafe(text);
  if (data === null) {
    throw new Error(`${providerName} 响应非 JSON`);
  }
  return data;
}

async function fetchTextOrThrow(url, options, providerName) {
  const response = await fetch(url, options);
  const text = await readResponseTextSafe(response);
  if (!response.ok) {
    const detail = truncateDetail(text);
    throw new Error(
      `${providerName} HTTP ${response.status}${detail ? `: ${detail}` : ""}`
    );
  }
  return text;
}

function withTimeout(promise, ms, providerName = "Provider", message = "请求超时") {
  const timeout = Number(ms);
  if (!Number.isFinite(timeout) || timeout <= 0) {
    return Promise.resolve(promise);
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(buildProviderError(providerName, message, `${timeout}ms`));
    }, timeout);
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

async function withRetry(
  task,
  {
    retries = 0,
    delayMs = 0,
    shouldRetry = () => true,
    providerName = "Provider",
  } = {}
) {
  const fn = typeof task === "function" ? task : null;
  if (!fn) {
    throw buildProviderError(providerName, "withRetry 入参必须是函数");
  }
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= retries || !shouldRetry(error, attempt)) {
        break;
      }
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw toProviderError(providerName, lastError, "重试后仍失败");
}

module.exports = {
  hasRequiredEnv,
  assertRequiredEnv,
  assertRequiredString,
  truncateDetail,
  parseJsonSafe,
  parseJsonTextSafe,
  buildUrl,
  normalizeSourceLang,
  buildPlainTranslationPrompt,
  mapLanguage,
  assertTranslatedText,
  buildProviderError,
  toProviderError,
  fetchJsonOrThrow,
  fetchAnyJsonOrThrow,
  fetchTextOrThrow,
  withTimeout,
  withRetry,
};
