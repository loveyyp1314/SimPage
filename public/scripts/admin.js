const appsEditor = document.getElementById("apps-editor");
const bookmarksEditor = document.getElementById("bookmarks-editor");
const addButtons = document.querySelectorAll(".add-button");
const saveButton = document.getElementById("save-button");
const reloadButton = document.getElementById("reload-button");
const statusBar = document.getElementById("status-bar");
const modal = document.getElementById("editor-modal");
const modalForm = document.getElementById("editor-form");
const modalTitle = document.getElementById("editor-modal-title");
const modalError = document.getElementById("editor-error");
const modalNameInput = document.getElementById("editor-name");
const modalUrlInput = document.getElementById("editor-url");
const modalDescriptionInput = document.getElementById("editor-description");
const modalIconInput = document.getElementById("editor-icon");
const modalCategoryField = document.getElementById("editor-category-field");
const modalCategoryInput = document.getElementById("editor-category");
const modalCancelButton = document.getElementById("editor-cancel-button");
const modalCloseButton = document.getElementById("editor-close-button");
const modalOverlay = document.getElementById("editor-modal-overlay");
const siteNameInput = document.getElementById("site-name");
const siteLogoInput = document.getElementById("site-logo");
const siteGreetingInput = document.getElementById("site-greeting");
const categorySuggestions = document.getElementById("category-suggestions");
const authOverlay = document.getElementById("auth-overlay");
const loginForm = document.getElementById("login-form");
const loginPasswordInput = document.getElementById("login-password");
const loginError = document.getElementById("login-error");
const logoutButton = document.getElementById("logout-button");

const typeLabels = {
  apps: "应用",
  bookmarks: "书签",
};

const STORAGE_KEY = "modern-navigation-admin-token";
const DATA_ENDPOINT = "/api/admin/data";
const LOGIN_ENDPOINT = "/api/login";

const defaultSettings = {
  siteName: siteNameInput && siteNameInput.value.trim() ? siteNameInput.value.trim() : "导航中心",
  siteLogo: siteLogoInput && siteLogoInput.value.trim() ? siteLogoInput.value.trim() : "",
  greeting: siteGreetingInput && siteGreetingInput.value.trim() ? siteGreetingInput.value.trim() : "",
};

const state = {
  apps: [],
  bookmarks: [],
  settings: {
    siteName: defaultSettings.siteName,
    siteLogo: defaultSettings.siteLogo,
    greeting: defaultSettings.greeting,
  },
};

let authToken = "";
let isDirty = false;
let modalContext = null;

function setStatus(message, variant = "neutral") {
  if (!statusBar) return;
  statusBar.textContent = message;
  if (variant === "neutral") {
    statusBar.removeAttribute("data-variant");
  } else {
    statusBar.dataset.variant = variant;
  }
}

function markDirty() {
  if (!isDirty) {
    isDirty = true;
    if (saveButton) {
      saveButton.disabled = false;
    }
  }
}

function resetDirty() {
  isDirty = false;
  if (saveButton) {
    saveButton.disabled = true;
  }
}

function createBlankItem(type) {
  return {
    id: "",
    name: "",
    url: "",
    description: "",
    icon: "",
    ...(type === "bookmarks" ? { category: "" } : {}),
  };
}

function normaliseIncoming(collection, type) {
  if (!Array.isArray(collection)) return [];
  return collection.map((item) => ({
    id: typeof item.id === "string" ? item.id : "",
    name: typeof item.name === "string" ? item.name : "",
    url: typeof item.url === "string" ? item.url : "",
    description: typeof item.description === "string" ? item.description : "",
    icon: typeof item.icon === "string" ? item.icon : "",
    ...(type === "bookmarks"
      ? { category: typeof item.category === "string" ? item.category : "" }
      : {}),
  }));
}

function normaliseSettingsIncoming(input) {
  const prepared = {
    siteName: defaultSettings.siteName,
    siteLogo: defaultSettings.siteLogo,
    greeting: defaultSettings.greeting,
  };

  if (!input || typeof input !== "object") {
    return prepared;
  }

  if (typeof input.siteName === "string" && input.siteName.trim()) {
    prepared.siteName = input.siteName.trim();
  }
  if (typeof input.siteLogo === "string") {
    prepared.siteLogo = input.siteLogo.trim();
  }
  if (typeof input.greeting === "string") {
    prepared.greeting = input.greeting.trim();
  }

  return prepared;
}

function applySettingsToInputs(settings) {
  if (siteNameInput) siteNameInput.value = settings.siteName || "";
  if (siteLogoInput) siteLogoInput.value = settings.siteLogo || "";
  if (siteGreetingInput) siteGreetingInput.value = settings.greeting || "";
}

function handleSettingsChange(field, value) {
  if (!state.settings) return;
  state.settings[field] = value;
  markDirty();
  setStatus("站点信息已更新，记得保存。", "neutral");
}

function render() {
  renderList("apps", appsEditor, state.apps);
  renderList("bookmarks", bookmarksEditor, state.bookmarks);
  updateCategorySuggestions();
}

function renderList(type, container, items) {
  if (!container) return;
  container.innerHTML = "";

  if (!items.length) {
    const hint = document.createElement("p");
    hint.className = "empty-hint";
    hint.textContent =
      type === "apps" ? "暂无应用，点击上方按钮添加。" : "暂无书签，点击上方按钮添加。";
    container.appendChild(hint);
    return;
  }

  items.forEach((item, index) => {
    container.appendChild(buildSummaryCard(type, item, index));
  });
}

function updateCategorySuggestions() {
  if (!categorySuggestions) return;
  categorySuggestions.innerHTML = "";
  const categories = new Set();
  state.bookmarks.forEach((item) => {
    const label = typeof item.category === "string" ? item.category.trim() : "";
    if (label) {
      categories.add(label);
    }
  });
  Array.from(categories)
    .sort((a, b) => a.localeCompare(b, "zh-CN"))
    .forEach((label) => {
      const option = document.createElement("option");
      option.value = label;
      categorySuggestions.appendChild(option);
    });
}

function buildSummaryCard(type, item, index) {
  const card = document.createElement("article");
  card.className = "edit-card summary-card";
  card.tabIndex = 0;

  const main = document.createElement("div");
  main.className = "summary-card-main";

  const iconWrapper = document.createElement("span");
  iconWrapper.className = "summary-card-icon";
  const iconContent = String(item.icon || "").trim();
  if (iconContent.startsWith("http://") || iconContent.startsWith("https://") || iconContent.startsWith("data:")) {
    const img = document.createElement("img");
    img.src = iconContent;
    img.alt = `${item.name || ""} 图标`;
    iconWrapper.appendChild(img);
  } else if (iconContent) {
    iconWrapper.textContent = iconContent.slice(0, 4);
  } else {
    iconWrapper.textContent = deriveFallbackIcon(item.name);
  }

  const textWrapper = document.createElement("div");
  textWrapper.className = "summary-card-text";

  const titleRow = document.createElement("div");
  titleRow.className = "summary-card-title";

  const title = document.createElement("h3");
  title.textContent = item.name || `${typeLabels[type]} ${index + 1}`;
  titleRow.appendChild(title);

  if (type === "bookmarks" && item.category) {
    const badge = document.createElement("span");
    badge.className = "category-badge";
    badge.textContent = item.category;
    titleRow.appendChild(badge);
  }

  textWrapper.appendChild(titleRow);

  if (item.description) {
    const description = document.createElement("p");
    description.className = "summary-card-description";
    description.textContent = item.description;
    textWrapper.appendChild(description);
  }

  if (item.url) {
    const url = document.createElement("p");
    url.className = "summary-card-meta";
    url.textContent = item.url;
    textWrapper.appendChild(url);
  }

  main.appendChild(iconWrapper);
  main.appendChild(textWrapper);
  card.appendChild(main);

  const actions = document.createElement("div");
  actions.className = "summary-card-actions";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "secondary-button";
  editButton.textContent = "编辑";
  editButton.addEventListener("click", (event) => {
    event.stopPropagation();
    openEditor(type, index);
  });

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-button";
  deleteButton.textContent = "删除";
  deleteButton.addEventListener("click", (event) => {
    event.stopPropagation();
    handleDelete(type, index);
  });

  actions.appendChild(editButton);
  actions.appendChild(deleteButton);
  card.appendChild(actions);

  card.addEventListener("click", () => {
    openEditor(type, index);
  });

  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openEditor(type, index);
    }
  });

  return card;
}

function deriveFallbackIcon(name) {
  if (!name) return "★";
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "★";
}

function openEditor(type, index) {
  const isNew = typeof index !== "number";
  const reference = isNew ? createBlankItem(type) : state[type][index];
  if (!reference) return;

  modalContext = { type, index, isNew };

  if (modalTitle) {
    modalTitle.textContent = isNew ? `添加${typeLabels[type]}` : `编辑${typeLabels[type]}`;
  }

  if (modalNameInput) modalNameInput.value = reference.name || "";
  if (modalUrlInput) modalUrlInput.value = reference.url || "";
  if (modalDescriptionInput) modalDescriptionInput.value = reference.description || "";
  if (modalIconInput) modalIconInput.value = reference.icon || "";

  if (type === "bookmarks") {
    if (modalCategoryField) modalCategoryField.hidden = false;
    if (modalCategoryInput) modalCategoryInput.value = reference.category || "";
  } else if (modalCategoryField) {
    modalCategoryField.hidden = true;
    if (modalCategoryInput) modalCategoryInput.value = "";
  }

  if (modalError) {
    modalError.textContent = "";
  }

  showModal();
}

function showModal() {
  if (!modal) return;
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  if (modalNameInput) {
    modalNameInput.focus();
    modalNameInput.select();
  }
}

function closeEditor() {
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  if (modalError) {
    modalError.textContent = "";
  }
  modalContext = null;
}

function setModalError(message) {
  if (!modalError) return;
  modalError.textContent = message;
}

function collectPayloadFromModal() {
  if (!modalContext) return null;

  const type = modalContext.type;
  const name = modalNameInput ? modalNameInput.value.trim() : "";
  const url = modalUrlInput ? modalUrlInput.value.trim() : "";
  const description = modalDescriptionInput ? modalDescriptionInput.value.trim() : "";
  const icon = modalIconInput ? modalIconInput.value.trim() : "";
  const category = modalCategoryInput ? modalCategoryInput.value.trim() : "";

  if (!name) {
    setModalError("请填写名称。");
    if (modalNameInput) modalNameInput.focus();
    return null;
  }

  if (!url) {
    setModalError("请填写链接地址。");
    if (modalUrlInput) modalUrlInput.focus();
    return null;
  }

  const existingId =
    !modalContext.isNew && typeof modalContext.index === "number"
      ? state[type][modalContext.index]?.id || ""
      : "";

  const payload = {
    id: existingId,
    name,
    url,
    description,
    icon,
  };

  if (type === "bookmarks") {
    payload.category = category;
  }

  return payload;
}

function applyModalChanges(event) {
  event.preventDefault();
  if (!modalContext) return;

  const payload = collectPayloadFromModal();
  if (!payload) return;

  const { type, index, isNew } = modalContext;

  if (isNew) {
    state[type].push(payload);
  } else if (typeof index === "number") {
    state[type][index] = { ...state[type][index], ...payload };
  }

  render();
  markDirty();
  setStatus(`${typeLabels[type]}已${modalContext.isNew ? "添加" : "更新"}，记得保存。`, "neutral");
  closeEditor();
}

function handleDelete(type, index) {
  if (!Array.isArray(state[type])) return;
  const confirmed = window.confirm(`确定要删除该${typeLabels[type]}吗？`);
  if (!confirmed) return;
  state[type].splice(index, 1);
  render();
  markDirty();
  setStatus(`${typeLabels[type]}已删除，记得保存修改。`, "neutral");
}

function buildSettingsPayload(settings) {
  return {
    siteName: (settings.siteName || "").trim(),
    siteLogo: (settings.siteLogo || "").trim(),
    greeting: (settings.greeting || "").trim(),
  };
}

function updateStateFromResponse(data) {
  state.apps = normaliseIncoming(data?.apps, "apps");
  state.bookmarks = normaliseIncoming(data?.bookmarks, "bookmarks");
  state.settings = normaliseSettingsIncoming(data?.settings);
  applySettingsToInputs(state.settings);
  render();
  resetDirty();
}

function buildAuthHeaders(extra = {}) {
  if (!authToken) {
    return { ...extra };
  }
  return {
    ...extra,
    Authorization: `Bearer ${authToken}`,
  };
}

async function loadData(showStatus = true) {
  if (!authToken) return false;
  try {
    const response = await fetch(DATA_ENDPOINT, {
      headers: buildAuthHeaders(),
    });

    if (response.status === 401) {
      handleUnauthorized("登录已过期，请重新登录。");
      return false;
    }

    if (!response.ok) {
      throw new Error("加载数据失败");
    }

    const payload = await response.json();
    const data = payload && typeof payload === "object" && "data" in payload ? payload.data : payload;

    updateStateFromResponse(data);
    hideAuthOverlay();
    if (logoutButton) logoutButton.disabled = false;
    if (showStatus) {
      setStatus("数据已加载。", "neutral");
    }
    return true;
  } catch (error) {
    console.error("加载数据失败", error);
    setStatus(error.message || "无法加载数据", "error");
    return false;
  }
}

async function saveChanges() {
  if (!saveButton) return;
  if (!authToken) {
    setStatus("请登录后再保存。", "error");
    return;
  }

  saveButton.disabled = true;
  setStatus("正在保存修改...", "neutral");

  const payloadSettings = buildSettingsPayload(state.settings);
  if (!payloadSettings.siteName) {
    setStatus("请填写网站名称。", "error");
    saveButton.disabled = false;
    if (siteNameInput) siteNameInput.focus();
    return;
  }

  const payload = {
    apps: state.apps.map((item) => ({
      id: item.id,
      name: item.name,
      url: item.url,
      description: item.description,
      icon: item.icon,
    })),
    bookmarks: state.bookmarks.map((item) => ({
      id: item.id,
      name: item.name,
      url: item.url,
      description: item.description,
      icon: item.icon,
      category: item.category || "",
    })),
    settings: payloadSettings,
  };

  try {
    const response = await fetch(DATA_ENDPOINT, {
      method: "PUT",
      headers: buildAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });

    if (response.status === 401) {
      handleUnauthorized("登录已过期，请重新登录。");
      return;
    }

    if (!response.ok) {
      const message = await extractErrorMessage(response);
      throw new Error(message || "保存失败");
    }

    const result = await response.json();
    const data = result && typeof result === "object" && "data" in result ? result.data : result;

    updateStateFromResponse(data);
    setStatus("保存成功！", "success");
  } catch (error) {
    console.error("保存失败", error);
    setStatus(error.message || "保存失败，请稍后再试。", "error");
    if (saveButton) saveButton.disabled = false;
  }
}

async function extractErrorMessage(response) {
  try {
    const data = await response.json();
    if (data && typeof data === "object" && "message" in data) {
      return data.message;
    }
  } catch (_error) {
    // ignore
  }
  return response.statusText;
}

function loadStoredToken() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) || "";
  } catch (_error) {
    return "";
  }
}

function saveToken(token) {
  try {
    window.localStorage.setItem(STORAGE_KEY, token);
  } catch (_error) {
    // ignore storage errors
  }
}

function clearStoredToken() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (_error) {
    // ignore storage errors
  }
}

function handleUnauthorized(message) {
  clearStoredToken();
  authToken = "";
  state.apps = [];
  state.bookmarks = [];
  state.settings = normaliseSettingsIncoming(null);
  applySettingsToInputs(state.settings);
  render();
  resetDirty();
  showAuthOverlay();
  setStatus(message || "登录状态已失效，请重新登录。", "error");
  if (logoutButton) logoutButton.disabled = true;
}

function handleLogout() {
  if (!authToken) {
    showAuthOverlay();
    setStatus("已退出登录。", "neutral");
    return;
  }
  authToken = "";
  clearStoredToken();
  state.apps = [];
  state.bookmarks = [];
  state.settings = normaliseSettingsIncoming(null);
  applySettingsToInputs(state.settings);
  render();
  resetDirty();
  showAuthOverlay();
  setStatus("已退出登录。", "neutral");
  if (logoutButton) logoutButton.disabled = true;
}

function showAuthOverlay() {
  if (!authOverlay) return;
  authOverlay.hidden = false;
  setLoginError("");
  if (loginPasswordInput) {
    loginPasswordInput.disabled = false;
    loginPasswordInput.value = "";
    setTimeout(() => {
      loginPasswordInput.focus();
    }, 0);
  }
  if (logoutButton) logoutButton.disabled = true;
}

function hideAuthOverlay() {
  if (!authOverlay) return;
  authOverlay.hidden = true;
  setLoginError("");
  if (loginPasswordInput) {
    loginPasswordInput.value = "";
    loginPasswordInput.disabled = false;
  }
}

function setLoginError(message) {
  if (!loginError) return;
  if (message) {
    loginError.textContent = message;
    loginError.hidden = false;
  } else {
    loginError.textContent = "";
    loginError.hidden = true;
  }
}

async function performLogin(password) {
  const response = await fetch(LOGIN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new Error(message || "登录失败");
  }

  const result = await response.json();
  if (!result || !result.success || !result.token) {
    throw new Error(result?.message || "登录失败");
  }

  authToken = result.token;
  saveToken(authToken);
  const success = await loadData(false);
  if (!success) {
    throw new Error("数据加载失败，请重试。");
  }
  setStatus("登录成功，数据已加载。", "success");
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  if (!loginPasswordInput) return;

  const password = loginPasswordInput.value.trim();
  if (!password) {
    setLoginError("请输入密码。");
    loginPasswordInput.focus();
    return;
  }

  setLoginError("");
  const submitButton = loginForm ? loginForm.querySelector('button[type="submit"]') : null;
  if (submitButton) submitButton.disabled = true;
  loginPasswordInput.disabled = true;

  try {
    await performLogin(password);
    loginPasswordInput.value = "";
  } catch (error) {
    console.error("登录失败", error);
    setLoginError(error.message || "登录失败，请重试。");
    loginPasswordInput.focus();
  } finally {
    if (submitButton) submitButton.disabled = false;
    loginPasswordInput.disabled = false;
  }
}

function bindEvents() {
  addButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.target;
      if (target !== "apps" && target !== "bookmarks") return;
      openEditor(target);
    });
  });

  if (saveButton) {
    saveButton.addEventListener("click", saveChanges);
  }

  if (reloadButton) {
    reloadButton.addEventListener("click", async () => {
      if (isDirty) {
        const confirmed = window.confirm("确定要放弃未保存的修改吗？");
        if (!confirmed) return;
      }
      const restored = await loadData(false);
      if (restored) {
        setStatus("已恢复为最新数据。", "neutral");
      }
    });
  }

  if (siteNameInput) {
    siteNameInput.addEventListener("input", () => {
      handleSettingsChange("siteName", siteNameInput.value);
    });
  }

  if (siteLogoInput) {
    siteLogoInput.addEventListener("input", () => {
      handleSettingsChange("siteLogo", siteLogoInput.value);
    });
  }

  if (siteGreetingInput) {
    siteGreetingInput.addEventListener("input", () => {
      handleSettingsChange("greeting", siteGreetingInput.value);
    });
  }

  if (modalForm) {
    modalForm.addEventListener("submit", applyModalChanges);
  }

  if (modalCancelButton) {
    modalCancelButton.addEventListener("click", (event) => {
      event.preventDefault();
      closeEditor();
    });
  }

  if (modalCloseButton) {
    modalCloseButton.addEventListener("click", () => {
      closeEditor();
    });
  }

  if (modalOverlay) {
    modalOverlay.addEventListener("click", () => {
      closeEditor();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal && !modal.hidden) {
      closeEditor();
    }
  });

  if (loginForm) {
    loginForm.addEventListener("submit", handleLoginSubmit);
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", handleLogout);
  }
}

async function initialise() {
  bindEvents();
  applySettingsToInputs(state.settings);
  render();
  resetDirty();

  const storedToken = loadStoredToken();
  if (storedToken) {
    authToken = storedToken;
    setStatus("正在验证登录状态...", "neutral");
    const success = await loadData(false);
    if (!success) {
      showAuthOverlay();
    } else {
      setStatus("数据已加载。", "neutral");
    }
  } else {
    showAuthOverlay();
    setStatus("请登录后开始编辑。", "neutral");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialise);
} else {
  initialise();
}
