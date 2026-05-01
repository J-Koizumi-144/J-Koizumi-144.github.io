const form = document.querySelector("#searchForm");
const input = document.querySelector("#authorInput");
const statusText = document.querySelector("#statusText");
const categoryList = document.querySelector("#categoryList");
const categoryCount = document.querySelector("#categoryCount");
const paperList = document.querySelector("#paperList");
const paperHeading = document.querySelector("#paperHeading");
const paperCount = document.querySelector("#paperCount");
const loadMoreButton = document.querySelector("#loadMoreButton");
const canvas = document.querySelector("#categoryCanvas");
const ctx = canvas.getContext("2d");

const pageSize = 200;
const configuredEndpoint = window.ARXIV_API_ENDPOINT?.trim() || "";
const isLocalHost = ["localhost", "127.0.0.1", ""].includes(window.location.hostname);
const arxivApiEndpoint = configuredEndpoint || (isLocalHost ? "/api/arxiv" : "");
let currentAuthor = "";
let nextStart = 0;
let totalResults = 0;
let papers = [];
let selectedCategory = "";
let loading = false;

function textFrom(parent, localName) {
  const node = Array.from(parent.getElementsByTagName("*")).find((item) => item.localName === localName);
  return node?.textContent?.replace(/\s+/g, " ").trim() || "";
}

function parseArxiv(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  const error = doc.querySelector("parsererror");

  if (error) {
    throw new Error("arXivから返されたデータを読めませんでした。");
  }

  const entries = Array.from(doc.getElementsByTagNameNS("*", "entry"));
  const total = Number(textFrom(doc, "totalResults")) || entries.length;

  return {
    total,
    papers: entries.map((entry) => {
      const categories = Array.from(entry.getElementsByTagNameNS("*", "category"))
        .map((category) => category.getAttribute("term"))
        .filter(Boolean);
      const primary = Array.from(entry.getElementsByTagName("*")).find(
        (node) => node.localName === "primary_category"
      );
      const id = textFrom(entry, "id");
      const authors = Array.from(entry.getElementsByTagNameNS("*", "author"))
        .map((author) => textFrom(author, "name"))
        .filter(Boolean);

      return {
        id,
        title: textFrom(entry, "title"),
        published: textFrom(entry, "published"),
        updated: textFrom(entry, "updated"),
        summary: textFrom(entry, "summary"),
        authors,
        categories,
        primaryCategory: primary?.getAttribute("term") || categories[0] || ""
      };
    })
  };
}

function mergePapers(existing, incoming) {
  const seen = new Set(existing.map((paper) => paper.id));
  const merged = [...existing];

  for (const paper of incoming) {
    if (!seen.has(paper.id)) {
      merged.push(paper);
      seen.add(paper.id);
    }
  }

  return merged;
}

function categoryStats() {
  const map = new Map();

  for (const paper of papers) {
    for (const category of paper.categories) {
      map.set(category, (map.get(category) || 0) + 1);
    }
  }

  return Array.from(map.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
}

function resizeCanvas() {
  const scale = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(rect.width * scale));
  canvas.height = Math.max(1, Math.round(rect.height * scale));
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

function drawCategoryMap(stats) {
  resizeCanvas();
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);

  if (!stats.length) {
    ctx.fillStyle = "#7b8580";
    ctx.font = "700 14px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No categories", rect.width / 2, rect.height / 2);
    return;
  }

  const top = stats.slice(0, 18);
  const max = Math.max(...top.map((item) => item.count));
  const centerY = rect.height / 2;
  const startX = 36;
  const endX = rect.width - 36;
  const step = top.length === 1 ? 0 : (endX - startX) / (top.length - 1);

  ctx.strokeStyle = "#d6ded8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  top.forEach((_, index) => {
    const x = startX + step * index;
    const y = centerY + Math.sin(index * 0.9) * 30;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  top.forEach((item, index) => {
    const x = startX + step * index;
    const y = centerY + Math.sin(index * 0.9) * 30;
    const radius = 7 + (item.count / max) * 18;
    const active = item.category === selectedCategory;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = active ? "#a54733" : index % 3 === 0 ? "#0d6b62" : index % 3 === 1 ? "#356b9f" : "#ba8a18";
    ctx.fill();
    ctx.lineWidth = active ? 4 : 2;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();

    ctx.fillStyle = "#17201b";
    ctx.font = "800 11px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(item.category, x, Math.min(rect.height - 14, y + radius + 18));
  });
}

function renderCategories() {
  const stats = categoryStats();
  categoryCount.textContent = String(stats.length);
  drawCategoryMap(stats);

  if (!stats.length) {
    categoryList.className = "category-list empty-state";
    categoryList.textContent = papers.length ? "カテゴリが見つかりません" : "No data";
    return;
  }

  const max = stats[0].count;
  categoryList.className = "category-list";
  categoryList.replaceChildren(
    ...stats.map((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `category-button${item.category === selectedCategory ? " active" : ""}`;
      button.style.setProperty("--bar-width", `${Math.max(8, Math.round((item.count / max) * 100))}%`);
      button.innerHTML = `
        <span class="category-code"></span>
        <span class="category-bar" aria-hidden="true"><span></span></span>
        <span class="category-total"></span>
      `;
      button.querySelector(".category-code").textContent = item.category;
      button.querySelector(".category-total").textContent = `${item.count}`;
      button.addEventListener("click", () => {
        selectedCategory = item.category;
        render();
      });
      return button;
    })
  );
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
}

function renderPapers() {
  const filtered = selectedCategory
    ? papers.filter((paper) => paper.categories.includes(selectedCategory))
    : papers;

  paperHeading.textContent = selectedCategory || "Papers";
  paperCount.textContent = String(filtered.length);

  if (!filtered.length) {
    paperList.className = "paper-list empty-state";
    paperList.textContent = papers.length ? "カテゴリを選択してください" : "No papers selected";
    return;
  }

  paperList.className = "paper-list";
  paperList.replaceChildren(
    ...filtered.map((paper) => {
      const item = document.createElement("article");
      item.className = "paper";

      const link = document.createElement("a");
      link.className = "paper-title";
      link.href = paper.id;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = paper.title || paper.id;

      const meta = document.createElement("div");
      meta.className = "paper-meta";

      const date = document.createElement("span");
      date.textContent = formatDate(paper.published) || "No date";
      meta.append(date);

      const primary = document.createElement("span");
      primary.className = "tag";
      primary.textContent = paper.primaryCategory;
      meta.append(primary);

      for (const category of paper.categories.filter((category) => category !== paper.primaryCategory)) {
        const tag = document.createElement("span");
        tag.className = "tag";
        tag.textContent = category;
        meta.append(tag);
      }

      item.append(link, meta);
      return item;
    })
  );
}

function updateStatus() {
  if (loading) {
    statusText.textContent = `"${currentAuthor}" を検索中`;
    return;
  }

  if (!arxivApiEndpoint) {
    statusText.textContent = "config.js に arXiv APIプロキシのURLを設定してください";
    return;
  }

  if (!currentAuthor) {
    statusText.textContent = "著者名を入力して Enter";
    return;
  }

  if (!papers.length) {
    statusText.textContent = `"${currentAuthor}" の論文は見つかりませんでした`;
    return;
  }

  const loaded = `${papers.length.toLocaleString()} / ${totalResults.toLocaleString()}`;
  statusText.textContent = `"${currentAuthor}" の論文 ${loaded} 件を表示中`;
}

function updateLoadMore() {
  loadMoreButton.classList.toggle("hidden", loading || !totalResults || papers.length >= totalResults);
}

function render() {
  renderCategories();
  renderPapers();
  updateStatus();
  updateLoadMore();
}

async function fetchPage(author, start) {
  if (!arxivApiEndpoint) {
    throw new Error("arXiv APIプロキシのURLが未設定です。config.js を編集してください。");
  }

  const url = new URL(arxivApiEndpoint, window.location.href);
  url.searchParams.set("author", author);
  url.searchParams.set("start", String(start));
  url.searchParams.set("max_results", String(pageSize));

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`arXiv検索に失敗しました (${response.status})`);
  }

  return parseArxiv(await response.text());
}

async function loadAuthor(author, append = false) {
  if (loading) return;

  loading = true;
  currentAuthor = author;
  selectedCategory = append ? selectedCategory : "";
  if (!append) {
    papers = [];
    nextStart = 0;
    totalResults = 0;
  }
  render();

  try {
    const result = await fetchPage(author, nextStart);
    totalResults = result.total;
    papers = mergePapers(papers, result.papers);
    nextStart = papers.length;
    selectedCategory = selectedCategory || categoryStats()[0]?.category || "";
  } catch (error) {
    statusText.textContent = error instanceof Error ? error.message : "検索に失敗しました";
  } finally {
    loading = false;
    render();
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const author = input.value.trim();
  if (author) loadAuthor(author);
});

loadMoreButton.addEventListener("click", () => {
  if (currentAuthor) loadAuthor(currentAuthor, true);
});

window.addEventListener("resize", () => {
  drawCategoryMap(categoryStats());
});

render();
