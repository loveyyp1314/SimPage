function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitiseUrl(value) {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  try {
    const url = new URL(trimmed, window.location.origin);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.href;
    }
  } catch (_error) {
    // ignore invalid URL
  }
  return "";
}

function renderInline(text) {
  let result = escapeHtml(text);

  result = result.replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`);
  result = result.replace(/(\*\*|__)([^*_]+?)\1/g, (_, __, content) => `<strong>${content}</strong>`);
  result = result.replace(/(~{2})([^~]+?)\1/g, (_, __, content) => `<del>${content}</del>`);
  result = result.replace(/(\*|_)([^*_]+?)\1/g, (_, __, content) => `<em>${content}</em>`);
  result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
    const safeUrl = sanitiseUrl(url);
    if (!safeUrl) {
      return alt;
    }
    const safeAlt = escapeHtml(alt);
    return `<img src="${safeUrl}" alt="${safeAlt}" loading="lazy" />`;
  });
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, url) => {
    const safeUrl = sanitiseUrl(url);
    if (!safeUrl) {
      return label;
    }
    return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });

  return result;
}

export function renderMarkdown(source) {
  const raw = typeof source === "string" ? source : "";
  const normalised = raw.replace(/\r\n?/g, "\n");
  const lines = normalised.split("\n");
  let html = "";
  let currentList = null;

  const closeList = () => {
    if (currentList) {
      html += `</${currentList}>`;
      currentList = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      closeList();
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      closeList();
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      html += `<h${level}>${renderInline(content)}</h${level}>`;
      continue;
    }

    const blockquoteMatch = line.match(/^\s*>\s?(.*)$/);
    if (blockquoteMatch) {
      closeList();
      html += `<blockquote>${renderInline(blockquoteMatch[1])}</blockquote>`;
      continue;
    }

    const unorderedMatch = line.match(/^\s*[-*+]\s+(.*)$/);
    if (unorderedMatch) {
      if (currentList !== "ul") {
        closeList();
        currentList = "ul";
        html += "<ul>";
      }
      html += `<li>${renderInline(unorderedMatch[1])}</li>`;
      continue;
    }

    const orderedMatch = line.match(/^\s*\d+\.\s+(.*)$/);
    if (orderedMatch) {
      if (currentList !== "ol") {
        closeList();
        currentList = "ol";
        html += "<ol>";
      }
      html += `<li>${renderInline(orderedMatch[1])}</li>`;
      continue;
    }

    closeList();
    html += `<p>${renderInline(trimmed)}</p>`;
  }

  closeList();
  return html;
}
