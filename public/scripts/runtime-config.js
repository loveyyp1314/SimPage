const CONFIG_SCRIPT_ID = "simpage-config";
let cachedConfig = null;
let staticMode = false;

function mergeConfigs(base, override) {
  const result = { ...base };
  for (const [key, value] of Object.entries(override || {})) {
    result[key] = value;
  }
  return result;
}

function parseJsonSafe(raw) {
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch (_error) {
    console.warn("SimPage: 无法解析 runtime config JSON，已忽略。", _error);
  }
  return null;
}

function readConfigFromScript() {
  if (typeof document === "undefined") {
    return {};
  }
  const script = document.getElementById(CONFIG_SCRIPT_ID);
  if (!script) {
    return {};
  }
  const config = {};
  if (script.dataset && typeof script.dataset.apiBaseUrl === "string") {
    config.apiBaseUrl = script.dataset.apiBaseUrl;
  }
  if (script.dataset && typeof script.dataset.staticMode !== "undefined") {
    const value = script.dataset.staticMode;
    if (value === "true" || value === "1") {
      config.staticMode = true;
    } else if (value === "false" || value === "0") {
      config.staticMode = false;
    }
  }
  const parsed = parseJsonSafe(script.textContent || script.innerText || "");
  if (parsed) {
    return mergeConfigs(config, parsed);
  }
  return config;
}

function normaliseConfig(raw) {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const result = {};
  if (typeof raw.apiBaseUrl === "string") {
    result.apiBaseUrl = raw.apiBaseUrl.trim();
  }
  if (typeof raw.staticMode === "boolean") {
    result.staticMode = raw.staticMode;
  }
  return result;
}

export function getClientConfig() {
  if (cachedConfig) {
    return { ...cachedConfig };
  }

  let config = {};
  if (typeof window !== "undefined" && window.SIMPAGE_CONFIG && typeof window.SIMPAGE_CONFIG === "object") {
    config = mergeConfigs(config, window.SIMPAGE_CONFIG);
  }
  config = mergeConfigs(config, readConfigFromScript());

  cachedConfig = normaliseConfig(config);
  if (typeof cachedConfig.staticMode === "boolean") {
    staticMode = cachedConfig.staticMode;
  }
  return { ...cachedConfig };
}

export function getApiBaseUrl() {
  const config = getClientConfig();
  const raw = typeof config.apiBaseUrl === "string" ? config.apiBaseUrl.trim() : "";
  if (!raw) {
    return "";
  }
  if (/^https?:\/\//i.test(raw)) {
    return raw.replace(/\/+$|\s+$/g, "");
  }
  if (raw.startsWith("//")) {
    return `https:${raw}`.replace(/\/+$|\s+$/g, "");
  }
  // Treat other values as absolute path base or relative path
  return raw.replace(/\/+$|\s+$/g, "");
}

export function resolveApiUrl(path) {
  if (typeof path !== "string" || !path) {
    return path;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const base = getApiBaseUrl();
  if (!base) {
    return path;
  }
  const normalisedBase = base.replace(/\/+$|\s+$/g, "");
  const normalisedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalisedBase}${normalisedPath}`;
}

export function setStaticMode(enabled) {
  staticMode = Boolean(enabled);
}

export function isStaticMode() {
  return staticMode;
}

export function ensureConfigInitialised() {
  getClientConfig();
}

// 初始化配置，确保脚本加载即解析
ensureConfigInitialised();
