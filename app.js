const makeId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const initialActivity = [
  { id: makeId(), name: 'Weekly allowance', amount: 100, category: 'Income', icon: '＋', type: 'income', date: new Date().toISOString() },
  { id: makeId(), name: 'Movie night', amount: 20, category: 'Fun', icon: '🎬', type: 'expense', date: new Date().toISOString() }
];
const defaultGoal = { name: 'A new pair of headphones', target: 100, saved: 45 };
const $ = (selector) => document.querySelector(selector);
const money = (value) => `$${Number(value).toFixed(2)}`;
const today = () => new Date().toISOString();

function load(key, fallback) { try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; } }
function normalizeActivity(item) {
  if (!item || typeof item.name !== 'string' || !Number.isFinite(Number(item.amount)) || Number(item.amount) < 0) return null;
  const type = item.type || (item.income ? 'income' : 'expense');
  return { id: item.id || makeId(), name: item.name, amount: Number(item.amount), category: String(item.category || 'Other'), icon: String(item.icon || '🛍️'), type, date: item.date && !Number.isNaN(new Date(item.date).getTime()) ? item.date : today() };
}
let activity = load('pocketplan-activity', initialActivity).map(normalizeActivity).filter(Boolean);
let goal = load('pocketplan-goal', defaultGoal);
if (!isValidGoal(goal)) goal = { ...defaultGoal };
let undoActivity = null;

function isValidActivity(item) { return item && typeof item.name === 'string' && Number.isFinite(Number(item.amount)) && Number(item.amount) >= 0 && typeof item.category === 'string' && (item.type === 'income' || item.type === 'expense'); }
function isValidGoal(value) { return value && typeof value.name === 'string' && Number.isFinite(Number(value.target)) && Number(value.target) > 0 && Number.isFinite(Number(value.saved)) && Number(value.saved) >= 0; }
function save() { try { localStorage.setItem('pocketplan-activity', JSON.stringify(activity)); localStorage.setItem('pocketplan-goal', JSON.stringify(goal)); } catch { showToast('Your changes could not be saved in this browser.'); } }
function dateBounds(period) { const end = new Date(); end.setHours(23, 59, 59, 999); const start = new Date(end); if (period === 'week') { const day = start.getDay(); start.setDate(start.getDate() - (day === 0 ? 6 : day - 1)); } if (period === 'month') start.setDate(1); if (period === 'custom') { const customStart = $('#periodStart').value ? new Date(`${$('#periodStart').value}T00:00:00`) : new Date(end); const customEnd = $('#periodEnd').value ? new Date(`${$('#periodEnd').value}T23:59:59`) : new Date(end); return { start: customStart, end: customEnd }; } start.setHours(0, 0, 0, 0); return { start, end }; }
function inSelectedPeriod(item) { if ($('#periodSelect').value === 'all') return true; const { start, end } = dateBounds($('#periodSelect').value); const date = new Date(item.date); return date >= start && date <= end; }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[character])); }
function showToast(message, undo = false) { const toast = $('#toast'); toast.innerHTML = `${escapeHtml(message)}${undo ? ' <button id="undoButton" class="toast-undo" type="button">Undo</button>' : ''}`; toast.classList.add('visible'); if (undo) $('#undoButton').addEventListener('click', () => { activity = undoActivity; undoActivity = null; render(); toast.classList.remove('visible'); }); setTimeout(() => toast.classList.remove('visible'), 5000); }

function render() {
  const visibleActivity = activity.filter(inSelectedPeriod);
  const income = visibleActivity.filter(item => item.type === 'income').reduce((sum, item) => sum + Number(item.amount), 0);
  const spent = visibleActivity.filter(item => item.type === 'expense').reduce((sum, item) => sum + Number(item.amount), 0);
  const available = income - spent;
  const remainingPercent = income ? Math.max(0, Math.min(100, available / income * 100)) : 0;
  const goalPercent = Math.max(0, Math.min(100, goal.saved / goal.target * 100));
  $('#availableAmount').textContent = money(Math.max(0, available));
  $('#spentLabel').textContent = `${money(spent)} spent`;
  $('#budgetLabel').textContent = `of ${money(income)}`;
  $('#availableProgress').style.width = `${remainingPercent}%`;
  $('.progress-track[aria-label="Available budget remaining"]').setAttribute('aria-valuenow', remainingPercent.toFixed(0));
  $('#statusDot').textContent = available < 0 ? 'Over budget' : 'On track';
  $('#statusDot').classList.toggle('warning', available < 0);
  $('#goalAmount').textContent = money(goal.saved);
  $('#goalTarget').textContent = `of ${money(goal.target)}`;
  $('#goalName').textContent = goal.name;
  $('#goalProgress').style.width = `${goalPercent}%`;
  $('.progress-track[aria-label="Savings goal progress"]').setAttribute('aria-valuenow', goalPercent.toFixed(0));
  const sorted = visibleActivity.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  $('#activityList').innerHTML = sorted.map(item => `<div class="activity-item"><span class="activity-icon" aria-hidden="true">${escapeHtml(item.icon)}</span><div class="activity-detail"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.category)} · ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(item.date))}</span></div><span class="activity-price ${item.type === 'income' ? 'income' : ''}">${item.type === 'income' ? '+' : '-'}${money(item.amount)}</span></div>`).join('');
  $('#emptyState').style.display = sorted.length ? 'none' : 'block';
  save();
}

function openDialog(id) { const dialog = $(id); if (typeof dialog.showModal === 'function') dialog.showModal(); else showToast('This browser does not support the budget form.'); }
function readAmount(form, field) { const amount = Number(new FormData(form).get(field)); return Number.isFinite(amount) && amount > 0 ? amount : null; }

$('#todayLabel').textContent = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date());
$('#periodSelect').addEventListener('change', () => { $('#customDates').hidden = $('#periodSelect').value !== 'custom'; render(); });
$('#periodStart').addEventListener('change', render);
$('#periodEnd').addEventListener('change', render);
$('#addIncomeButton').addEventListener('click', () => { $('#incomeForm').reset(); openDialog('#incomeDialog'); $('#incomeSource').focus(); });
$('#addExpenseButton').addEventListener('click', () => { $('#expenseForm').reset(); openDialog('#expenseDialog'); $('#expenseName').focus(); });
$('#incomeForm').addEventListener('submit', (event) => { event.preventDefault(); const data = new FormData(event.target); const source = String(data.get('source') || '').trim(); const amount = readAmount(event.target, 'amount'); if (!source || !amount) { showToast('Enter a source and an amount greater than $0.'); return; } activity.push({ id: makeId(), name: source, amount, category: 'Income', icon: '＋', type: 'income', date: today() }); $('#incomeDialog').close(); render(); showToast(`${money(amount)} added to your budget!`); });
$('#expenseForm').addEventListener('submit', (event) => { event.preventDefault(); const data = new FormData(event.target); const name = String(data.get('name') || '').trim(); const amount = readAmount(event.target, 'amount'); const category = String(data.get('category') || 'Other'); if (!name || !amount) { showToast('Enter a name and an amount greater than $0.'); return; } activity.push({ id: makeId(), name, amount, category, icon: ({ Fun:'🎨', Food:'🍎', School:'📚', Other:'🛍️' })[category] || '🛍️', type: 'expense', date: today() }); $('#expenseDialog').close(); render(); showToast(`${money(amount)} added — nice job keeping track!`); });
$('#addSavingsButton').addEventListener('click', () => { $('#savingsForm').reset(); openDialog('#savingsDialog'); });
$('#savingsForm').addEventListener('submit', (event) => { event.preventDefault(); const amount = readAmount(event.target, 'amount'); if (!amount) { showToast('Enter an amount greater than $0.'); return; } const added = Math.min(amount, Math.max(0, goal.target - goal.saved)); if (!added) { showToast('This goal is already complete!'); return; } goal.saved += added; $('#savingsDialog').close(); render(); showToast(`${money(added)} added to your goal!`); });
$('#editGoalButton').addEventListener('click', () => { $('#goalNameInput').value = goal.name; $('#goalTargetInput').value = goal.target; openDialog('#goalDialog'); });
$('#goalForm').addEventListener('submit', (event) => { event.preventDefault(); const data = new FormData(event.target); const name = String(data.get('name') || '').trim(); const target = Number(data.get('target')); if (!name || !Number.isFinite(target) || target <= 0 || target < goal.saved) { showToast(`Target must be at least ${money(goal.saved)}.`); return; } goal = { ...goal, name, target }; $('#goalDialog').close(); render(); showToast('Goal updated!'); });
$('#clearActivityButton').addEventListener('click', () => { const expenseCount = activity.filter(item => item.type === 'expense').length; if (!expenseCount) { showToast('There is no spending to clear.'); return; } if (!window.confirm('Clear all spending history? Your allowance and savings goal will stay.')) return; undoActivity = activity; activity = activity.filter(item => item.type !== 'expense'); render(); showToast('Spending cleared.', true); });
$('#profileButton').addEventListener('click', () => showToast('Your profile is coming soon.'));
render();
