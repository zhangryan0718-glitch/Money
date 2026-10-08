const startingBudget = 100;
const startingGoal = 45;
const initialActivity = [
  { name: 'Weekly allowance', amount: 100, category: 'Income', icon: '＋', income: true },
  { name: 'Movie night', amount: 20, category: 'Fun', icon: '🎬' }
];

let activity = JSON.parse(localStorage.getItem('pocketplan-activity') || 'null') || initialActivity;
const $ = (selector) => document.querySelector(selector);
const money = (value) => `$${Number(value).toFixed(2)}`;

function render() {
  const income = activity.filter(item => item.income).reduce((sum, item) => sum + item.amount, 0);
  const spent = activity.filter(item => !item.income).reduce((sum, item) => sum + item.amount, 0);
  const available = Math.max(0, income - spent);
  $('#availableAmount').textContent = money(available);
  $('#spentLabel').textContent = `${money(spent)} spent`;
  $('#budgetLabel').textContent = `of ${money(income)}`;
  $('#availableProgress').style.width = `${income ? Math.min(100, available / income * 100) : 0}%`;
  $('#goalProgress').style.width = `${startingGoal}%`;
  $('#goalAmount').textContent = `$${startingGoal}`;
  $('#activityList').innerHTML = activity.slice().reverse().map(item => `
    <div class="activity-item">
      <span class="activity-icon">${item.icon}</span>
      <div class="activity-detail"><strong>${escapeHtml(item.name)}</strong><span>${item.category} · Today</span></div>
      <span class="activity-price" style="color:${item.income ? '#65a875' : 'inherit'}">${item.income ? '+' : '-'}${money(item.amount)}</span>
    </div>`).join('');
  $('#emptyState').style.display = activity.length ? 'none' : 'block';
  localStorage.setItem('pocketplan-activity', JSON.stringify(activity));
}

function escapeHtml(value) { return value.replace(/[&<>'"]/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[character])); }
function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('visible'); setTimeout(() => toast.classList.remove('visible'), 2600); }

$('#todayLabel').textContent = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date());
$('#addExpenseButton').addEventListener('click', () => { $('#expenseForm').reset(); $('#expenseDialog').showModal(); $('#expenseName').focus(); });
$('#expenseForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.target);
  const name = data.get('name').trim();
  const amount = Number(data.get('amount'));
  if (!name || !amount || amount < 0) return;
  activity.push({ name, amount, category: data.get('category'), icon: ({ Fun:'🎨', Food:'🍎', School:'📚', Other:'🛍️' })[data.get('category')] });
  $('#expenseDialog').close(); render(); showToast(`${money(amount)} added — nice job keeping track!`);
});
$('#clearActivityButton').addEventListener('click', () => { activity = []; render(); showToast('Activity cleared'); });
$('#profileButton').addEventListener('click', () => showToast('Ryan’s plan is looking good!'));
render();
