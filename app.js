const STORAGE_KEY = "my-allowance-ledger-v1";

const categories = {
  income: ["용돈", "선물", "심부름", "저축 출금", "기타"],
  expense: ["간식", "교통", "문구", "친구", "취미", "저축", "기타"],
};

const initialEntries = [
  {
    id: crypto.randomUUID(),
    type: "income",
    date: localDateString(new Date()),
    title: "이번 달 용돈",
    amount: 50000,
    category: "용돈",
    note: "시작 금액",
  },
];

let entries = loadEntries();
let viewedMonth = new Date();

const form = document.querySelector("#entryForm");
const entryId = document.querySelector("#entryId");
const dateInput = document.querySelector("#dateInput");
const titleInput = document.querySelector("#titleInput");
const amountInput = document.querySelector("#amountInput");
const categoryInput = document.querySelector("#categoryInput");
const noteInput = document.querySelector("#noteInput");
const currentMonth = document.querySelector("#currentMonth");
const balanceAmount = document.querySelector("#balanceAmount");
const incomeAmount = document.querySelector("#incomeAmount");
const expenseAmount = document.querySelector("#expenseAmount");
const entriesEl = document.querySelector("#entries");
const entryCount = document.querySelector("#entryCount");
const searchInput = document.querySelector("#searchInput");
const filterType = document.querySelector("#filterType");
const categoryBars = document.querySelector("#categoryBars");
const topCategory = document.querySelector("#topCategory");
const emptyTemplate = document.querySelector("#emptyTemplate");
const cancelEdit = document.querySelector("#cancelEdit");

function loadEntries() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return initialEntries;

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : initialEntries;
  } catch {
    return initialEntries;
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function money(value) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value);
}

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthKey(date) {
  return localDateString(date).slice(0, 7);
}

function setDefaultDate() {
  dateInput.value = localDateString(new Date());
}

function updateCategoryOptions() {
  const type = new FormData(form).get("type");
  categoryInput.innerHTML = categories[type]
    .map((category) => `<option value="${category}">${category}</option>`)
    .join("");
}

function monthlyEntries() {
  const key = monthKey(viewedMonth);
  return entries.filter((entry) => entry.date.startsWith(key));
}

function filteredEntries() {
  const query = searchInput.value.trim().toLowerCase();
  const type = filterType.value;

  return monthlyEntries()
    .filter((entry) => type === "all" || entry.type === type)
    .filter((entry) => {
      const text = `${entry.title} ${entry.category} ${entry.note}`.toLowerCase();
      return text.includes(query);
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

function renderSummary() {
  const monthEntries = monthlyEntries();
  const income = monthEntries
    .filter((entry) => entry.type === "income")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const expense = monthEntries
    .filter((entry) => entry.type === "expense")
    .reduce((sum, entry) => sum + entry.amount, 0);

  currentMonth.textContent = viewedMonth.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
  });
  incomeAmount.textContent = money(income);
  expenseAmount.textContent = money(expense);
  balanceAmount.textContent = money(income - expense);
}

function renderCategoryBars() {
  const expenses = monthlyEntries().filter((entry) => entry.type === "expense");
  const totals = expenses.reduce((acc, entry) => {
    acc[entry.category] = (acc[entry.category] || 0) + entry.amount;
    return acc;
  }, {});
  const rows = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const max = rows[0]?.[1] || 0;

  categoryBars.innerHTML = "";
  topCategory.textContent = rows.length ? `${rows[0][0]}에 가장 많이 썼어요` : "아직 기록이 없어요";

  if (!rows.length) {
    categoryBars.append(emptyTemplate.content.cloneNode(true));
    return;
  }

  rows.forEach(([category, total]) => {
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `
      <span class="bar-label">${category}</span>
      <div class="bar-track" aria-hidden="true">
        <div class="bar-fill" style="width: ${(total / max) * 100}%"></div>
      </div>
      <span class="bar-amount">${money(total)}</span>
    `;
    categoryBars.append(row);
  });
}

function renderEntries() {
  const visibleEntries = filteredEntries();
  entriesEl.innerHTML = "";
  entryCount.textContent = `${visibleEntries.length}개의 기록`;

  if (!visibleEntries.length) {
    entriesEl.append(emptyTemplate.content.cloneNode(true));
    return;
  }

  visibleEntries.forEach((entry) => {
    const item = document.createElement("article");
    item.className = "entry-item";
    item.innerHTML = `
      <time class="entry-date" datetime="${entry.date}">${formatShortDate(entry.date)}</time>
      <div class="entry-main">
        <strong>${escapeHtml(entry.title)}</strong>
        <span>${escapeHtml(entry.category)}${entry.note ? ` · ${escapeHtml(entry.note)}` : ""}</span>
      </div>
      <strong class="entry-amount ${entry.type}">
        ${entry.type === "income" ? "+" : "-"}${money(entry.amount)}
      </strong>
      <div class="row-actions">
        <button type="button" data-action="edit" data-id="${entry.id}" aria-label="수정">수정</button>
        <button type="button" data-action="delete" data-id="${entry.id}" aria-label="삭제">삭제</button>
      </div>
    `;
    entriesEl.append(item);
  });
}

function formatShortDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[char];
  });
}

function render() {
  renderSummary();
  renderCategoryBars();
  renderEntries();
}

function resetForm() {
  form.reset();
  entryId.value = "";
  setDefaultDate();
  updateCategoryOptions();
  cancelEdit.hidden = true;
  form.querySelector(".primary-button").textContent = "기록하기";
}

form.addEventListener("change", (event) => {
  if (event.target.name === "type") updateCategoryOptions();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const record = {
    id: entryId.value || crypto.randomUUID(),
    type: data.get("type"),
    date: dateInput.value,
    title: titleInput.value.trim(),
    amount: Number(amountInput.value),
    category: categoryInput.value,
    note: noteInput.value.trim(),
  };

  if (entryId.value) {
    entries = entries.map((entry) => (entry.id === record.id ? record : entry));
  } else {
    entries = [record, ...entries];
  }

  viewedMonth = new Date(`${record.date}T00:00:00`);
  saveEntries();
  resetForm();
  render();
});

entriesEl.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;
  const record = entries.find((entry) => entry.id === id);
  if (!record) return;

  if (action === "delete") {
    entries = entries.filter((entry) => entry.id !== id);
    saveEntries();
    render();
  }

  if (action === "edit") {
    entryId.value = record.id;
    form.elements.type.value = record.type;
    updateCategoryOptions();
    dateInput.value = record.date;
    titleInput.value = record.title;
    amountInput.value = record.amount;
    categoryInput.value = record.category;
    noteInput.value = record.note;
    cancelEdit.hidden = false;
    form.querySelector(".primary-button").textContent = "수정하기";
    titleInput.focus();
  }
});

document.querySelector("#prevMonth").addEventListener("click", () => {
  viewedMonth = new Date(viewedMonth.getFullYear(), viewedMonth.getMonth() - 1, 1);
  render();
});

document.querySelector("#nextMonth").addEventListener("click", () => {
  viewedMonth = new Date(viewedMonth.getFullYear(), viewedMonth.getMonth() + 1, 1);
  render();
});

document.querySelector("#clearAll").addEventListener("click", () => {
  if (!entries.length) return;
  const confirmed = confirm("모든 기록을 삭제할까요?");
  if (!confirmed) return;

  entries = [];
  saveEntries();
  resetForm();
  render();
});

cancelEdit.addEventListener("click", resetForm);
searchInput.addEventListener("input", renderEntries);
filterType.addEventListener("change", renderEntries);

setDefaultDate();
updateCategoryOptions();
render();
