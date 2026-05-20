// localStorage에 저장할 때 사용할 이름입니다.
const STORAGE_KEY = "student-allowance-book-records";

// 수입과 지출에서 사용할 카테고리 목록입니다.
const CATEGORY_OPTIONS = {
  income: ["용돈", "선물", "심부름", "저축 출금", "기타"],
  expense: ["간식", "교통", "문구", "친구", "취미", "저축", "기타"],
};

// 도넛 그래프에 사용할 색상입니다.
const CHART_COLORS = ["#4a90e2", "#54b689", "#ffd66b", "#ef6f6c", "#a78bfa", "#38bdf8", "#fb923c"];

// 화면에서 자주 사용할 HTML 요소를 미리 찾아둡니다.
const recordForm = document.querySelector("#recordForm");
const dateInput = document.querySelector("#dateInput");
const typeInput = document.querySelector("#typeInput");
const categoryInput = document.querySelector("#categoryInput");
const titleInput = document.querySelector("#titleInput");
const amountInput = document.querySelector("#amountInput");
const memoInput = document.querySelector("#memoInput");
const recordList = document.querySelector("#recordList");
const recordCount = document.querySelector("#recordCount");
const emptyMessage = document.querySelector("#emptyMessage");
const totalIncome = document.querySelector("#totalIncome");
const totalExpense = document.querySelector("#totalExpense");
const currentBalance = document.querySelector("#currentBalance");
const resetButton = document.querySelector("#resetButton");
const filterButtons = document.querySelectorAll(".filter-button");
const periodTypeInput = document.querySelector("#periodTypeInput");
const periodValueInput = document.querySelector("#periodValueInput");
const exportMonthInput = document.querySelector("#exportMonthInput");
const excelButton = document.querySelector("#excelButton");
const googleSheetButton = document.querySelector("#googleSheetButton");
const incomeDonut = document.querySelector("#incomeDonut");
const expenseDonut = document.querySelector("#expenseDonut");
const incomeDonutText = document.querySelector("#incomeDonutText");
const expenseDonutText = document.querySelector("#expenseDonutText");
const incomeLegend = document.querySelector("#incomeLegend");
const expenseLegend = document.querySelector("#expenseLegend");
const incomeChartTotal = document.querySelector("#incomeChartTotal");
const expenseChartTotal = document.querySelector("#expenseChartTotal");

// records 배열에는 사용자가 입력한 모든 기록이 들어갑니다.
let records = loadRecords();

// 현재 선택된 필터입니다. 처음에는 전체 보기로 시작합니다.
let currentFilter = "all";

function getToday() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getThisMonth() {
  return getToday().slice(0, 7);
}

function getThisYear() {
  return getToday().slice(0, 4);
}

function formatMoney(number) {
  return `${Number(number).toLocaleString("ko-KR")}원`;
}

function loadRecords() {
  const savedData = localStorage.getItem(STORAGE_KEY);

  if (!savedData) {
    return [];
  }

  try {
    const parsed = JSON.parse(savedData);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// 구분이 바뀌면 카테고리 선택지도 함께 바뀝니다.
function updateCategoryOptions() {
  const selectedType = typeInput.value;
  const options = CATEGORY_OPTIONS[selectedType];

  categoryInput.innerHTML = options.map((category) => `<option value="${category}">${category}</option>`).join("");
}

function updateSummary() {
  let incomeSum = 0;
  let expenseSum = 0;

  records.forEach((record) => {
    if (record.type === "income") {
      incomeSum += record.amount;
    } else {
      expenseSum += record.amount;
    }
  });

  totalIncome.textContent = formatMoney(incomeSum);
  totalExpense.textContent = formatMoney(expenseSum);
  currentBalance.textContent = formatMoney(incomeSum - expenseSum);
}

function getFilteredRecords() {
  if (currentFilter === "all") {
    return records;
  }

  return records.filter((record) => record.type === currentFilter);
}

function renderRecords() {
  const filteredRecords = getFilteredRecords();

  recordList.innerHTML = "";
  recordCount.textContent = `${filteredRecords.length}개`;
  emptyMessage.style.display = filteredRecords.length === 0 ? "block" : "none";

  filteredRecords.forEach((record) => {
    const tr = document.createElement("tr");
    const typeText = record.type === "income" ? "수입" : "지출";
    const typeClass = record.type === "income" ? "type-income" : "type-expense";
    const amountClass = record.type === "income" ? "amount-income" : "amount-expense";

    tr.innerHTML = `
      <td>${escapeHtml(record.date)}</td>
      <td><span class="type-badge ${typeClass}">${typeText}</span></td>
      <td>${escapeHtml(record.category || "기타")}</td>
      <td>${escapeHtml(record.title)}</td>
      <td class="${amountClass}">${formatMoney(record.amount)}</td>
      <td>${escapeHtml(record.memo || "-")}</td>
      <td>
        <button class="delete-button" type="button" data-id="${record.id}">삭제</button>
      </td>
    `;

    recordList.appendChild(tr);
  });
}

// 분석 기간에 맞는 기록만 골라냅니다.
function getRecordsByPeriod() {
  const periodType = periodTypeInput.value;
  const periodValue = periodValueInput.value;

  if (!periodValue) {
    return [];
  }

  return records.filter((record) => {
    if (periodType === "day") {
      return record.date === periodValue;
    }

    if (periodType === "month") {
      return record.date.startsWith(periodValue);
    }

    return record.date.startsWith(periodValue);
  });
}

// 월별 다운로드는 분석 단위가 무엇이든 현재 선택된 월을 기준으로 합니다.
function getMonthlyRecordsForExport() {
  const monthValue = exportMonthInput.value || getThisMonth();
  return records.filter((record) => record.date.startsWith(monthValue));
}

function getCategoryRows(sourceRecords, type) {
  const totals = {};

  sourceRecords
    .filter((record) => record.type === type)
    .forEach((record) => {
      const category = record.category || "기타";
      totals[category] = (totals[category] || 0) + record.amount;
    });

  return Object.entries(totals)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

function renderAnalysis() {
  const periodRecords = getRecordsByPeriod();
  const incomeRows = getCategoryRows(periodRecords, "income");
  const expenseRows = getCategoryRows(periodRecords, "expense");

  renderDonut(incomeDonut, incomeDonutText, incomeLegend, incomeChartTotal, incomeRows);
  renderDonut(expenseDonut, expenseDonutText, expenseLegend, expenseChartTotal, expenseRows);
}

function renderDonut(donut, centerText, legend, totalLabel, rows) {
  const total = rows.reduce((sum, row) => sum + row.total, 0);

  totalLabel.textContent = formatMoney(total);
  centerText.textContent = total > 0 ? "100%" : "0%";
  legend.innerHTML = "";

  if (total === 0) {
    donut.className = "donut empty";
    donut.style.background = "";
    legend.innerHTML = `<p class="mini-empty">선택한 기간의 기록이 없어요.</p>`;
    return;
  }

  let start = 0;
  const slices = rows.map((row, index) => {
    const end = start + (row.total / total) * 100;
    const color = CHART_COLORS[index % CHART_COLORS.length];
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
      <span class="legend-color" style="background:${CHART_COLORS[index % CHART_COLORS.length]}"></span>
      <strong>${escapeHtml(row.category)}</strong>
      <span>${percent}%</span>
      <span>${formatMoney(row.total)}</span>
    `;
    legend.appendChild(item);
  });
}

function render() {
  updateSummary();
  renderRecords();
  renderAnalysis();
}

function updatePeriodInput() {
  const periodType = periodTypeInput.value;

  if (periodType === "day") {
    periodValueInput.type = "date";
    periodValueInput.value = getToday();
    return;
  }

  if (periodType === "month") {
    periodValueInput.type = "month";
    periodValueInput.value = getThisMonth();
    return;
  }

  periodValueInput.type = "number";
  periodValueInput.min = "2000";
  periodValueInput.max = "2100";
  periodValueInput.step = "1";
  periodValueInput.value = getThisYear();
}

function makeExcelTable(recordsForExport) {
  const rows = recordsForExport.map((record) => {
    const typeText = record.type === "income" ? "수입" : "지출";
    return `
      <tr>
        <td>${escapeHtml(record.date)}</td>
        <td>${typeText}</td>
        <td>${escapeHtml(record.category || "기타")}</td>
        <td>${escapeHtml(record.title)}</td>
        <td>${record.amount}</td>
        <td>${escapeHtml(record.memo || "")}</td>
      </tr>
    `;
  });

  return `
    <html>
      <head><meta charset="UTF-8" /></head>
      <body>
        <table border="1">
          <thead>
            <tr>
              <th>날짜</th>
              <th>구분</th>
              <th>카테고리</th>
              <th>항목명</th>
              <th>금액</th>
              <th>메모</th>
            </tr>
          </thead>
          <tbody>${rows.join("")}</tbody>
        </table>
      </body>
    </html>
  `;
}

function downloadMonthlyExcel() {
  const monthlyRecords = getMonthlyRecordsForExport();

  if (monthlyRecords.length === 0) {
    alert("다운로드할 월별 기록이 없어요.");
    return;
  }

  const html = makeExcelTable(monthlyRecords);
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `용돈기입장_${exportMonthInput.value || getThisMonth()}.xls`;
  link.click();

  URL.revokeObjectURL(url);
}

function makeTsv(recordsForExport) {
  const header = ["날짜", "구분", "카테고리", "항목명", "금액", "메모"];
  const rows = recordsForExport.map((record) => [
    record.date,
    record.type === "income" ? "수입" : "지출",
    record.category || "기타",
    record.title,
    record.amount,
    record.memo || "",
  ]);

  return [header, ...rows].map((row) => row.join("\t")).join("\n");
}

async function sendToGoogleSheet() {
  const monthlyRecords = getMonthlyRecordsForExport();

  if (monthlyRecords.length === 0) {
    alert("구글 시트로 보낼 월별 기록이 없어요.");
    return;
  }

  const tsv = makeTsv(monthlyRecords);

  try {
    await navigator.clipboard.writeText(tsv);
    alert("월별 기록을 복사했어요. 새 구글 시트가 열리면 A1 칸에 붙여넣기(Ctrl+V) 해주세요.");
  } catch {
    alert("자동 복사가 막혔어요. 새 구글 시트가 열리면 기록을 직접 붙여넣어 주세요.");
  }

  window.open("https://docs.google.com/spreadsheets/create", "_blank");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[char];
  });
}

recordForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const amount = Number(amountInput.value);

  if (!title || !amountInput.value) {
    alert("항목명과 금액을 입력해 주세요.");
    return;
  }

  if (amount <= 0) {
    alert("금액은 0원보다 큰 숫자로 입력해 주세요.");
    return;
  }

  const newRecord = {
    id: Date.now(),
    date: dateInput.value || getToday(),
    type: typeInput.value,
    category: categoryInput.value || "기타",
    title,
    amount,
    memo: memoInput.value.trim(),
  };

  records.push(newRecord);
  saveRecords();
  render();

  recordForm.reset();
  dateInput.value = getToday();
  updateCategoryOptions();
});

recordList.addEventListener("click", (event) => {
  const deleteButton = event.target.closest(".delete-button");

  if (!deleteButton) {
    return;
  }

  const id = Number(deleteButton.dataset.id);
  records = records.filter((record) => record.id !== id);
  saveRecords();
  render();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;

    filterButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");

    renderRecords();
  });
});

resetButton.addEventListener("click", () => {
  const ok = confirm("정말 모든 기록을 삭제할까요?");

  if (!ok) {
    return;
  }

  records = [];
  saveRecords();
  render();
});

typeInput.addEventListener("change", updateCategoryOptions);
periodTypeInput.addEventListener("change", () => {
  updatePeriodInput();
  renderAnalysis();
});
periodValueInput.addEventListener("input", renderAnalysis);
excelButton.addEventListener("click", downloadMonthlyExcel);
googleSheetButton.addEventListener("click", sendToGoogleSheet);

dateInput.value = getToday();
exportMonthInput.value = getThisMonth();
updateCategoryOptions();
updatePeriodInput();
render();
