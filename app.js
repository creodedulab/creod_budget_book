const STORAGE_KEY = "my-allowance-ledger-v1";

const categories = {
  income: ["용돈", "선물", "심부름", "저축 출금", "기타"],
  expense: ["간식", "교통", "문구", "친구", "취미", "저축", "기타"],
};

const chartColors = ["#3267a8", "#1f8a5b", "#f0b642", "#c44d42", "#7458a8", "#2f8f8b", "#d66f32"];

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
const viewTabs = document.querySelectorAll(".view-tab");
const ledgerView = document.querySelector("#ledgerView");
const analysisView = document.querySelector("#analysisView");
const analysisPeriodType = document.querySelector("#analysisPeriodType");
const analysisPeriodValue = document.querySelector("#analysisPeriodValue");
const analysisPeriodLabel = document.querySelector("#analysisPeriodLabel");
const analysisIncomeTotal = document.querySelector("#analysisIncomeTotal");
const analysisExpenseTotal = document.querySelector("#analysisExpenseTotal");
const incomeDonut = document.querySelector("#incomeDonut");
const expenseDonut = document.querySelector("#expenseDonut");
const incomeDonutCenter = document.querySelector("#incomeDonutCenter");
const expenseDonutCenter = document.querySelector("#expenseDonutCenter");
const incomeLegend = document.querySelector("#incomeLegend");
const expenseLegend = document.querySelector("#expenseLegend");
const incomeChartCount = document.querySelector("#incomeChartCount");
const expenseChartCount = document.querySelector("#expenseChartCount");

function loadEntries() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
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

function parseAmount(value) {
  return Number(String(value).replace(/[^\d]/g, ""));
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
  const income = sumByType(monthEntries, "income");
  const expense = sumByType(monthEntries, "expense");

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
  const rows = categoryRows(expenses);
  const max = rows[0]?.total || 0;

  categoryBars.innerHTML = "";
  topCategory.textContent = rows.length ? `${rows[0].category}에 가장 많이 썼어요` : "아직 기록이 없어요";

  if (!rows.length) {
    categoryBars.append(emptyTemplate.content.cloneNode(true));
    return;
  }

  rows.forEach((row) => {
    const item = document.createElement("div");
    item.className = "bar-row";
    item.innerHTML = `
      <span class="bar-label">${escapeHtml(row.category)}</span>
      <div class="bar-track" aria-hidden="true">
        <div class="bar-fill" style="width: ${(row.total / max) * 100}%"></div>
      </div>
      <span class="bar-amount">${money(row.total)}</span>
    `;
    categoryBars.append(item);
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

function renderAnalysis() {
  const selectedEntries = entries.filter((entry) => isEntryInAnalysisPeriod(entry));
  const incomeEntries = selectedEntries.filter((entry) => entry.type === "income");
  const expenseEntries = selectedEntries.filter((entry) => entry.type === "expense");
  const incomeTotal = sumByType(selectedEntries, "income");
  const expenseTotal = sumByType(selectedEntries, "expense");

  analysisPeriodLabel.textContent = formatAnalysisPeriodLabel();
  analysisIncomeTotal.textContent = money(incomeTotal);
  analysisExpenseTotal.textContent = money(expenseTotal);
  incomeChartCount.textContent = `${incomeEntries.length}개의 기록`;
  expenseChartCount.textContent = `${expenseEntries.length}개의 기록`;
  renderDonutChart(incomeDonut, incomeDonutCenter, incomeLegend, categoryRows(incomeEntries), incomeTotal);
  renderDonutChart(expenseDonut, expenseDonutCenter, expenseLegend, categoryRows(expenseEntries), expenseTotal);
}

function renderDonutChart(donut, center, legend, rows, total) {
  center.textContent = money(total);
  legend.innerHTML = "";

  if (!rows.length || total <= 0) {
    donut.className = "donut empty";
    donut.style.background = "";
    legend.append(emptyTemplate.content.cloneNode(true));
    return;
  }

  let start = 0;
  const slices = rows.map((row, index) => {
    const end = start + (row.total / total) * 100;
    const color = chartColors[index % chartColors.length];
    const slice = `${color} ${start}% ${end}%`;
    start = end;
    return slice;
  });

  donut.className = "donut";
  donut.style.background = `conic-gradient(${slices.join(", ")})`;

  rows.forEach((row, index) => {
    const percent = Math.round((row.total / total) * 1000) / 10;
    const item = document.createElement("div");
    item.className = "legend-item";
    item.innerHTML = `
      <span class="legend-color" style="background:${chartColors[index % chartColors.length]}"></span>
      <strong>${escapeHtml(row.category)}</strong>
      <span>${percent}%</span>
      <span>${money(row.total)}</span>
    `;
    legend.append(item);
  });
}

function sumByType(source, type) {
  return source.filter((entry) => entry.type === type).reduce((sum, entry) => sum + entry.amount, 0);
}

function categoryRows(source) {
  const totals = source.reduce((acc, entry) => {
    acc[entry.category] = (acc[entry.category] || 0) + entry.amount;
    return acc;
  }, {});

  return Object.entries(totals)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

function isEntryInAnalysisPeriod(entry) {
  const period = analysisPeriodType.value;
  const value = analysisPeriodValue.value;
  if (!value) return false;

  if (period === "day") return entry.date === value;
  if (period === "month") return entry.date.startsWith(value);
  return entry.date.startsWith(value);
}

function updateAnalysisInput() {
  const period = analysisPeriodType.value;
  const now = new Date();

  if (period === "day") {
    analysisPeriodValue.type = "date";
    analysisPeriodValue.value = localDateString(now);
  } else if (period === "month") {
    analysisPeriodValue.type = "month";
    analysisPeriodValue.value = monthKey(now);
  } else {
    analysisPeriodValue.type = "number";
    analysisPeriodValue.min = "2000";
    analysisPeriodValue.max = "2100";
    analysisPeriodValue.step = "1";
    analysisPeriodValue.value = String(now.getFullYear());
  }
}

function formatAnalysisPeriodLabel() {
  const period = analysisPeriodType.value;
  const value = analysisPeriodValue.value;
  if (!value) return "-";

  if (period === "day") {
    return new Date(`${value}T00:00:00`).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  }

  if (period === "month") {
    return new Date(`${value}-01T00:00:00`).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
    });
  }

  return `${value}년`;
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
  renderAnalysis();
}

function resetForm() {
  form.reset();
  entryId.value = "";
  setDefaultDate();
  updateCategoryOptions();
  cancelEdit.hidden = true;
  form.querySelector(".primary-button").textContent = "기록하기";
}

function switchView(view) {
  const isAnalysis = view === "analysis";
  ledgerView.classList.toggle("hidden", isAnalysis);
  analysisView.classList.toggle("hidden", !isAnalysis);
  viewTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === view));
  if (isAnalysis) renderAnalysis();
}

form.addEventListener("change", (event) => {
  if (event.target.name === "type") updateCategoryOptions();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const amount = parseAmount(amountInput.value);
  if (!amount) {
    amountInput.focus();
    return;
  }

  const record = {
    id: entryId.value || crypto.randomUUID(),
    type: data.get("type"),
    date: dateInput.value,
    title: titleInput.value.trim(),
    amount,
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
    switchView("ledger");
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
  const confirmed = confirm("이 컴퓨터의 브라우저에 저장된 모든 용돈기입장 데이터를 삭제할까요?");
  if (!confirmed) return;

  entries = [];
  localStorage.removeItem(STORAGE_KEY);
  resetForm();
  render();
});

viewTabs.forEach((tab) => {
  tab.addEventListener("click", () => switchView(tab.dataset.view));
});

analysisPeriodType.addEventListener("change", () => {
  updateAnalysisInput();
  renderAnalysis();
});
analysisPeriodValue.addEventListener("input", renderAnalysis);
cancelEdit.addEventListener("click", resetForm);
searchInput.addEventListener("input", renderEntries);
filterType.addEventListener("change", renderEntries);

setDefaultDate();
updateCategoryOptions();
updateAnalysisInput();
render();
