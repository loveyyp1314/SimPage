const appsEditor = document.getElementById("apps-editor");
const bookmarksEditor = document.getElementById("bookmarks-editor");
const addButtons = document.querySelectorAll(".add-button");
const saveButton = document.getElementById("save-button");
const reloadButton = document.getElementById("reload-button");
const statusBar = document.getElementById("status-bar");

const state = {
  apps: [],
  bookmarks: [],
};

let isDirty = false;

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

function createBlankItem() {
  return {
    id: "",
    name: "",
    url: "",
    description: "",
    icon: "",
  };
}

function createField(labelText, type, name, value, placeholder = "") {
  const wrapper = document.createElement("label");
  wrapper.className = "field";

  const label = document.createElement("span");
  label.textContent = labelText;
  wrapper.appendChild(label);

  let input;
  if (type === "textarea") {
    input = document.createElement("textarea");
    input.rows = 3;
  } else {
    input = document.createElement("input");
    input.type = type;
  }
  input.name = name;
  input.value = value || "";
  if (placeholder) {
    input.placeholder = placeholder;
  }
  input.addEventListener("input", () => {
    markDirty();
    setStatus("有未保存的修改。", "neutral");
  });

  wrapper.appendChild(input);
  return wrapper;
}

function buildEditCard(type, item, index) {
  const card = document.createElement("article");
  card.className = "edit-card";
  card.dataset.id = item.id || "";

  const header = document.createElement("div");
  header.className = "edit-card-header";

  const title = document.createElement("h3");
  title.textContent = `${type === "apps" ? "应用" : "书签"} ${index + 1}`;
  header.appendChild(title);

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-button";
  deleteButton.textContent = "删除";
  deleteButton.addEventListener("click", () => {
    handleDelete(type, card);
  });
  header.appendChild(deleteButton);

  card.appendChild(header);

  const nameField = createField("名称", "text", "name", item.name, "例如：Figma");
  const nameInput = nameField.querySelector("input");
  if (nameInput) {
    nameInput.required = true;
    nameInput.autocomplete = "off";
  }
  card.appendChild(nameField);

  const urlField = createField("链接", "url", "url", item.url, "https://example.com");
  const urlInput = urlField.querySelector("input");
  if (urlInput) {
    urlInput.required = true;
    urlInput.autocomplete = "off";
    urlInput.inputMode = "url";
  }
  card.appendChild(urlField);

  card.appendChild(
    createField(
      "描述",
      "textarea",
      "description",
      item.description,
      "简要说明该条目的用途"
    )
  );
  const iconField = createField(
    "图标（支持 Emoji 或图片 URL）",
    "text",
    "icon",
    item.icon,
    "例如：🎯 或 https://..."
  );
  const iconInput = iconField.querySelector("input");
  if (iconInput) {
    iconInput.autocomplete = "off";
  }
  card.appendChild(iconField);


  return card;
}

function handleDelete(type, card) {
  const container = type === "apps" ? appsEditor : bookmarksEditor;
  if (!container) return;
  const index = Array.from(container.children).indexOf(card);
  if (index === -1) return;
  state[type].splice(index, 1);
  render();
  markDirty();
  setStatus("条目已删除，记得保存修改。", "neutral");
}

function renderList(type, container, items) {
  if (!container) return;
  container.innerHTML = "";

  if (!items.length) {
    const hint = document.createElement("p");
    hint.className = "empty-hint";
    hint.textContent = type === "apps" ? "暂无应用，点击上方按钮添加。" : "暂无书签，点击上方按钮添加。";
    container.appendChild(hint);
    return;
  }

  items.forEach((item, index) => {
    const card = buildEditCard(type, item, index);
    container.appendChild(card);
  });
}

function render() {
  renderList("apps", appsEditor, state.apps);
  renderList("bookmarks", bookmarksEditor, state.bookmarks);
}

function collectItems(container) {
  if (!container) return [];
  const cards = Array.from(container.querySelectorAll(".edit-card"));
  return cards.map((card) => {
    const getValue = (selector) => {
      const field = card.querySelector(selector);
      return field ? field.value.trim() : "";
    };

    return {
      id: card.dataset.id || undefined,
      name: getValue('input[name="name"]'),
      url: getValue('input[name="url"]'),
      description: getValue('textarea[name="description"]'),
      icon: getValue('input[name="icon"]'),
    };
  });
}

async function loadData(showStatus = true) {
  try {
    const response = await fetch("/api/data");
    if (!response.ok) {
      throw new Error("加载数据失败");
    }
    const data = await response.json();
    state.apps = Array.isArray(data.apps) ? data.apps : [];
    state.bookmarks = Array.isArray(data.bookmarks) ? data.bookmarks : [];
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

  const apps = collectItems(appsEditor);
  const bookmarks = collectItems(bookmarksEditor);

  const invalid = [...apps, ...bookmarks].filter((item) => !item.name || !item.url);
  if (invalid.length) {
    setStatus("请填写每条数据的名称和链接。", "error");
    return;
  }

  saveButton.disabled = true;
  setStatus("正在保存修改...", "neutral");

  try {
    const response = await fetch("/api/data", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ apps, bookmarks }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "保存失败");
    }

    const payload = await response.json();
    if (!payload || !payload.success) {
      throw new Error(payload?.message || "保存失败");
    }

    state.apps = payload.data.apps;
    state.bookmarks = payload.data.bookmarks;
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
      state[target].push(createBlankItem());
      render();
      markDirty();
      setStatus("已添加新的条目，请填写信息。", "neutral");
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
