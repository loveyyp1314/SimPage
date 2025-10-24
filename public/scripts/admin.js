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

const typeLabels = {
  apps: "应用",
  bookmarks: "书签",
};

const state = {
  apps: [],
  bookmarks: [],
};

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

function render() {
  renderList("apps", appsEditor, state.apps);
  renderList("bookmarks", bookmarksEditor, state.bookmarks);
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
  setStatus(`${typeLabels[type]}已${isNew ? "添加" : "更新"}，记得保存。`, "neutral");
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

async function loadData(showStatus = true) {
  try {
    const response = await fetch("/api/data");
    if (!response.ok) {
      throw new Error("加载数据失败");
    }
    const data = await response.json();
    state.apps = normaliseIncoming(data.apps, "apps");
    state.bookmarks = normaliseIncoming(data.bookmarks, "bookmarks");
    render();
    resetDirty();
    if (showStatus) {
      setStatus("数据已加载。", "neutral");
    }
  } catch (error) {
    console.error(error);
    setStatus(error.message || "无法加载数据", "error");
  }
}

async function saveChanges() {
  if (!saveButton) return;

  saveButton.disabled = true;
  setStatus("正在保存修改...", "neutral");

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
  };

  try {
    const response = await fetch("/api/data", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "保存失败");
    }

    const result = await response.json();
    if (!result || !result.success) {
      throw new Error(result?.message || "保存失败");
    }

    state.apps = normaliseIncoming(result.data.apps, "apps");
    state.bookmarks = normaliseIncoming(result.data.bookmarks, "bookmarks");
    render();
    resetDirty();
    setStatus("保存成功！", "success");
  } catch (error) {
    console.error("保存失败", error);
    setStatus(error.message || "保存失败，请稍后再试。", "error");
    saveButton.disabled = false;
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
      await loadData(false);
      setStatus("已恢复为最新数据。", "neutral");
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
}

function initialise() {
  bindEvents();
  loadData();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialise);
} else {
  initialise();
}
