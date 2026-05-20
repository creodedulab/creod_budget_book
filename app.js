// localStorage에 저장할 때 사용할 이름입니다.
// 나중에 앱 이름이 바뀌면 이 이름도 함께 바꿀 수 있습니다.
const STORAGE_KEY = "student-allowance-book-records";

// 화면에서 자주 사용할 HTML 요소를 미리 찾아둡니다.
const recordForm = document.querySelector("#recordForm");
const dateInput = document.querySelector("#dateInput");
const typeInput = document.querySelector("#typeInput");
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

// records 배열에는 사용자가 입력한 모든 기록이 들어갑니다.
// 앱이 시작될 때 localStorage에서 저장된 기록을 불러옵니다.
let records = loadRecords();

// 현재 선택된 필터입니다. 처음에는 전체 보기로 시작합니다.
let currentFilter = "all";

// 오늘 날짜를 YYYY-MM-DD 형태로 만들어주는 함수입니다.
function getToday() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 숫자를 1,000원처럼 천 단위 콤마가 있는 금액으로 바꿉니다.
function formatMoney(number) {
  return `${Number(number).toLocaleString("ko-KR")}원`;
}

// localStorage에서 기록을 꺼내오는 함수입니다.
function loadRecords() {
  const savedData = localStorage.getItem(STORAGE_KEY);

  // 저장된 데이터가 없으면 빈 배열로 시작합니다.
  if (!savedData) {
    return [];
  }

  // 저장된 문자열을 JavaScript 배열로 바꿉니다.
  try {
    return JSON.parse(savedData);
  } catch {
    return [];
  }
}

// records 배열을 localStorage에 저장하는 함수입니다.
function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// 수입, 지출, 잔액을 계산하고 화면에 보여주는 함수입니다.
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

// 현재 필터에 맞는 기록만 골라내는 함수입니다.
function getFilteredRecords() {
  if (currentFilter === "all") {
    return records;
  }

  return records.filter((record) => record.type === currentFilter);
}

// 기록 목록 표를 다시 그리는 함수입니다.
function renderRecords() {
  const filteredRecords = getFilteredRecords();

  // 기존 표 내용을 비우고 다시 채웁니다.
  recordList.innerHTML = "";
  recordCount.textContent = `${filteredRecords.length}개`;
  emptyMessage.style.display = filteredRecords.length === 0 ? "block" : "none";

  filteredRecords.forEach((record) => {
    const tr = document.createElement("tr");

    const typeText = record.type === "income" ? "수입" : "지출";
    const typeClass = record.type === "income" ? "type-income" : "type-expense";
    const amountClass = record.type === "income" ? "amount-income" : "amount-expense";

    tr.innerHTML = `
      <td>${record.date}</td>
      <td><span class="type-badge ${typeClass}">${typeText}</span></td>
      <td>${record.title}</td>
      <td class="${amountClass}">${formatMoney(record.amount)}</td>
      <td>${record.memo || "-"}</td>
      <td>
        <button class="delete-button" type="button" data-id="${record.id}">삭제</button>
      </td>
    `;

    recordList.appendChild(tr);
  });
}

// 화면 전체를 최신 상태로 바꾸는 함수입니다.
function render() {
  updateSummary();
  renderRecords();
}

// 등록 버튼을 눌렀을 때 실행됩니다.
recordForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const amount = Number(amountInput.value);

  // 항목명이나 금액이 비어 있으면 등록하지 않습니다.
  if (!title || !amountInput.value) {
    alert("항목명과 금액을 입력해 주세요.");
    return;
  }

  // 금액은 0원보다 큰 숫자만 입력할 수 있습니다.
  if (amount <= 0) {
    alert("금액은 0원보다 큰 숫자로 입력해 주세요.");
    return;
  }

  const newRecord = {
    id: Date.now(), // 삭제할 때 구분하기 위한 고유 번호입니다.
    date: dateInput.value || getToday(), // 날짜가 비어 있으면 오늘 날짜를 넣습니다.
    type: typeInput.value,
    title,
    amount,
    memo: memoInput.value.trim(),
  };

  records.push(newRecord);
  saveRecords();
  render();

  // 등록 후 입력창을 비웁니다.
  recordForm.reset();
  dateInput.value = getToday();
});

// 삭제 버튼은 표 안에서 만들어지므로, 표 전체에 클릭 이벤트를 걸어둡니다.
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

// 필터 버튼을 누르면 전체/수입/지출 중 하나만 보여줍니다.
filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;

    filterButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");

    renderRecords();
  });
});

// 전체 기록 초기화 버튼입니다.
resetButton.addEventListener("click", () => {
  const ok = confirm("정말 모든 기록을 삭제할까요?");

  if (!ok) {
    return;
  }

  records = [];
  saveRecords();
  render();
});

// 앱이 처음 열릴 때 날짜를 오늘로 넣고, 저장된 기록을 화면에 보여줍니다.
dateInput.value = getToday();
render();
