const incomeDescriptionInput = document.getElementById("income-description");
const incomeAmountInput = document.getElementById("income-amount");
const expenseDescriptionInput = document.getElementById("expense-description");
const expenseCategorySelect = document.getElementById("expense-category");
const expenseAmountInput = document.getElementById("expense-amount");
const addIncomeBtn = document.getElementById("add-income");
const addExpenseBtn = document.getElementById("add-expense");
const clearAllBtn = document.getElementById("clear-all");
const transactionBody = document.getElementById("transaction-body");
const notification = document.getElementById("notification");
const totalIncomeEl = document.getElementById("total-income");
const totalExpensesEl = document.getElementById("total-expenses");
const balanceEl = document.getElementById("balance");

// Defensive DOM guards (in case script runs in an unexpected context)
if (!transactionBody) {
  console.error("Missing required DOM element: #transaction-body");
}

// Load transactions from localStorage defensively to avoid crashing on invalid JSON
let transactions = [];
try {
  const raw = localStorage.getItem("expenseTransactions");
  transactions = raw ? JSON.parse(raw) : [];
} catch (err) {
  console.error("Failed to parse saved transactions:", err);
  // Clear the corrupt value to avoid repeated errors
  localStorage.removeItem("expenseTransactions");
  transactions = [];
}

// Keep track of notification timeout so repeated notifications don't overlap
let notificationTimeout = null;

document.addEventListener("DOMContentLoaded", () => {
  if (incomeDescriptionInput) incomeDescriptionInput.focus();
  loadTransactions();
  updateSummary();
});

// Attach event listeners defensively
if (addIncomeBtn) addIncomeBtn.addEventListener("click", addIncome);
if (addExpenseBtn) addExpenseBtn.addEventListener("click", addExpense);
if (clearAllBtn) clearAllBtn.addEventListener("click", clearAll);

// Keyboard accessibility: Enter to submit on amount inputs, and Enter/Delete on rows
if (incomeAmountInput) {
  incomeAmountInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addIncome();
  });
}
if (incomeDescriptionInput) {
  incomeDescriptionInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      // Move focus to amount field for quicker entry
      if (incomeAmountInput) incomeAmountInput.focus();
    }
  });
}

if (expenseAmountInput) {
  expenseAmountInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addExpense();
  });
}
if (expenseDescriptionInput) {
  expenseDescriptionInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      if (expenseCategorySelect) expenseCategorySelect.focus();
    }
  });
}

function addIncome() {
  const description = incomeDescriptionInput.value.trim();
  const amountValue = parseFloat(incomeAmountInput.value);

  if (!description || isNaN(amountValue) || amountValue <= 0) {
    showNotification("Enter a valid income description and amount.", true);
    return;
  }

  addTransaction({
    description,
    amount: amountValue,
    category: "Income",
    type: "Income",
  });

  showNotification("Income added successfully!");
  incomeDescriptionInput.value = "";
  incomeAmountInput.value = "";
  incomeDescriptionInput.focus();
}

function addExpense() {
  const description = expenseDescriptionInput.value.trim();
  const category = expenseCategorySelect.value;
  const amountValue = parseFloat(expenseAmountInput.value);

  if (!description || !category || isNaN(amountValue) || amountValue <= 0) {
    showNotification("Provide valid expense details.", true);
    return;
  }

  addTransaction({
    description,
    amount: amountValue,
    category,
    type: "Expense",
  });

  showNotification("Expense added successfully!");
  expenseDescriptionInput.value = "";
  expenseCategorySelect.selectedIndex = 0;
  expenseAmountInput.value = "";
  expenseDescriptionInput.focus();
}

function addTransaction({ description, amount, category, type }) {
  const transaction = {
    id: Date.now(),
    description,
    amount,
    category,
    type,
  };

  transactions.push(transaction);
  saveTransactions();
  displayTransaction(transaction);
  updateSummary();
}

function displayTransaction(transaction) {
  const row = document.createElement("tr");
  row.dataset.id = transaction.id;
  row.innerHTML = `
    <td>${transaction.description}</td>
    <td>${transaction.category}</td>
    <td>₹${transaction.amount.toFixed(2)}</td>
    <td class="${transaction.type === "Income" ? "positive" : "negative"}">${
    transaction.type
  }</td>
    <td>
      <button class="action-btn" aria-label="Delete transaction">
        <i class="fa-solid fa-trash"></i>
      </button>
    </td>
  `;

  const deleteBtn = row.querySelector("button");
  deleteBtn.addEventListener("click", () => deleteTransaction(transaction.id));

  // Guard in case the tbody is missing
  if (transactionBody) {
    // Make the row keyboard-focusable and add keyboard handlers
    row.tabIndex = 0;
    row.addEventListener("keydown", (e) => {
      // Enter focuses the delete button; Delete key removes the transaction
      if (e.key === "Enter") {
        e.preventDefault();
        deleteBtn.focus();
      } else if (e.key === "Delete") {
        e.preventDefault();
        // Confirm then delete
        const confirmed = confirm("Delete this transaction?");
        if (confirmed) deleteTransaction(transaction.id);
      }
    });

    transactionBody.appendChild(row);
    // For accessibility: announce and focus the new row briefly
  row.setAttribute("aria-label", `${transaction.type} ${transaction.description} ${transaction.category} ₹${transaction.amount.toFixed(2)}`);
    // Optionally move focus to the new row for screen readers to pick up
    row.focus();
  }
}

function loadTransactions() {
  if (transactionBody) transactionBody.innerHTML = "";
  transactions.forEach((txn) => displayTransaction(txn));
}

function deleteTransaction(id) {
  transactions = transactions.filter((txn) => txn.id !== id);
  saveTransactions();
  if (transactionBody) transactionBody.innerHTML = "";
  loadTransactions();
  updateSummary();
  showNotification("Transaction deleted.");
}

function updateSummary() {
  const totalIncome = transactions
    .filter((txn) => txn.type === "Income")
    .reduce((sum, txn) => sum + txn.amount, 0);

  const totalExpenses = transactions
    .filter((txn) => txn.type === "Expense")
    .reduce((sum, txn) => sum + txn.amount, 0);

  const balance = totalIncome - totalExpenses;

  if (totalIncomeEl) totalIncomeEl.textContent = `₹${totalIncome.toFixed(2)}`;
  if (totalExpensesEl) totalExpensesEl.textContent = `₹${totalExpenses.toFixed(2)}`;
  if (balanceEl) {
    balanceEl.textContent = `₹${balance.toFixed(2)}`;

    balanceEl.classList.remove("positive", "negative", "neutral");
    if (balance > 0) {
      balanceEl.classList.add("positive");
    } else if (balance < 0) {
      balanceEl.classList.add("negative");
    } else {
      balanceEl.classList.add("neutral");
    }
  }
}

function clearAll() {
  const confirmed = confirm("Clear all transactions?");
  if (!confirmed) return;

  transactions = [];
  saveTransactions();
  if (transactionBody) transactionBody.innerHTML = "";
  updateSummary();
  showNotification("All transactions cleared.");
}

function showNotification(message, isError = false) {
  if (!notification) return;
  notification.textContent = message;
  notification.classList.remove("hidden", "show");
  notification.style.background = isError
    ? "linear-gradient(120deg, rgba(255, 83, 112, 0.9), rgba(255, 83, 112, 0.7))"
    : "linear-gradient(120deg, rgba(0, 217, 163, 0.9), rgba(0, 217, 163, 0.7))";

  requestAnimationFrame(() => {
    notification.classList.add("show");
  });

  if (notificationTimeout) clearTimeout(notificationTimeout);
  notificationTimeout = setTimeout(() => {
    notification.classList.remove("show");
    notification.classList.add("hidden");
    notificationTimeout = null;
  }, 2000);
}

function saveTransactions() {
  localStorage.setItem("expenseTransactions", JSON.stringify(transactions));
}

