/* ── Config ────────────────────────────────────────────── */
const API = 'http://127.0.0.1:8000';
let barChart = null;
let doughnutChart = null;

/* ── Initial Animations ────────────────────────────────── */
gsap.to(".gsap-hero", { opacity: 1, y: 0, duration: 1, stagger: 0.2, ease: "power3.out" });
gsap.to(".gsap-fade", { opacity: 1, y: 0, duration: 1, stagger: 0.1, delay: 0.5, ease: "power2.out" });

/* ── Investment rows ────────────────────────────────────── */
let rowId = 0;

function addInvestmentRow(data = {}) {
  const id = rowId++;
  const tbody = document.getElementById('inv-tbody');
  const tr = document.createElement('tr');
  tr.id = `row-${id}`;
  tr.innerHTML = `
    <td><input class="tufte-input" placeholder="Tech Stocks" value="${data.name || ''}" style="width:100%"/></td>
    <td><input class="tufte-input" type="number" min="1" placeholder="30" value="${data.cost || ''}" style="width:60px" /></td>
    <td><input class="tufte-input" type="number" min="1" placeholder="45" value="${data.expected_return || ''}" style="width:60px" /></td>
    <td>
      <select class="tufte-input" style="font-size:1.2rem;">
        <option value="low"    ${(data.risk_level||'medium')==='low'?'selected':''}>Low</option>
        <option value="medium" ${(data.risk_level||'medium')==='medium'?'selected':''}>Med</option>
        <option value="high"   ${(data.risk_level||'medium')==='high'?'selected':''}>High</option>
      </select>
    </td>
    <td><input class="tufte-input" placeholder="Sector" value="${data.sector || ''}" style="width:100px" /></td>
    <td><button class="btn-del" onclick="removeRow(${id})" title="Remove">×</button></td>
  `;
  tbody.appendChild(tr);
  gsap.from(tr, { opacity: 0, x: -10, duration: 0.3 });
}

function removeRow(id) {
  const row = document.getElementById(`row-${id}`);
  if (row) {
    gsap.to(row, { opacity: 0, x: 10, duration: 0.3, onComplete: () => row.remove() });
  }
}

function getInvestments() {
  const rows = document.querySelectorAll('#inv-tbody tr');
  const investments = [];
  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    const select = row.querySelector('select');
    const name   = inputs[0].value.trim();
    const cost   = parseInt(inputs[1].value);
    const ret    = parseInt(inputs[2].value);
    const risk   = select ? select.value : 'medium';
    const sector = inputs[3] ? inputs[3].value.trim() : 'general';
    if (name && cost > 0 && ret > 0) {
      investments.push({ name, cost, expected_return: ret, risk_level: risk, sector: sector || 'general' });
    }
  });
  return investments;
}

/* ── Solve ──────────────────────────────────────────────── */
async function solve() {
  const investments = getInvestments();
  const budget = parseInt(document.getElementById('budget').value);

  if (!investments.length) return alert('Please add at least one investment.');
  if (!budget || budget <= 0) return alert('Please enter a valid budget.');

  const btn = document.getElementById('solve-btn');
  btn.textContent = 'Computing...';
  btn.style.opacity = '0.7';

  try {
    const res = await fetch(`${API}/api/v1/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ budget, investments }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'API error');
    }

    const data = await res.json();
    renderResults(data);
  } catch (e) {
    alert(`Error: ${e.message}\n\nMake sure your FastAPI server is running:\nuvicorn main:app --reload`);
  } finally {
    btn.textContent = 'Compute Optimal Portfolio';
    btn.style.opacity = '1';
  }
}

/* ── Render results ─────────────────────────────────────── */
function renderResults(data) {
  const panel = document.getElementById('results-panel');
  
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    gsap.to(".gsap-res", { opacity: 1, y: 0, duration: 0.8, stagger: 0.15, ease: "power2.out" });
  }

  // KPIs with GSAP count-up animation
  gsapCounter('kpi-return', data.total_return, v => `₹${Math.round(v)}k`);
  gsapCounter('kpi-invested', data.total_cost, v => `₹${Math.round(v)}k`);
  gsapCounter('kpi-roi', data.roi_percent, v => `${v.toFixed(1)}%`);
  gsapCounter('kpi-remaining', data.remaining_budget, v => `₹${Math.round(v)}k`);

  // Tags
  const tagsEl = document.getElementById('selected-tags');
  tagsEl.innerHTML = '';
  data.selected_names.forEach((name, i) => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = name;
    tagsEl.appendChild(tag);
    gsap.from(tag, { opacity: 0, scale: 0.8, duration: 0.4, delay: 0.5 + i * 0.1 });
  });

  // Charts
  renderBarChart(data);
  renderDoughnutChart(data);
  renderDpTable(data);

  // Scroll to results
  gsap.to(window, { scrollTo: { y: "#results-panel", offsetY: 20 }, duration: 1, ease: "power2.out" });
}

/* ── GSAP Counter ───────────────────────────────────────── */
function gsapCounter(id, target, format) {
  const obj = { val: 0 };
  const el = document.getElementById(id);
  gsap.to(obj, {
    val: target,
    duration: 1.5,
    ease: "power2.out",
    onUpdate: () => {
      el.textContent = format(obj.val);
    }
  });
}

/* ── Bar chart ──────────────────────────────────────────── */
function renderBarChart(data) {
  const ctx = document.getElementById('bar-chart').getContext('2d');
  if (barChart) barChart.destroy();

  const labels  = data.investments.map(i => i.name);
  const costs   = data.investments.map(i => i.cost);
  const returns = data.investments.map(i => i.expected_return);
  const selectedSet = new Set(data.selected_names);

  // Tufte inspired colors
  Chart.defaults.font.family = "'DM Mono', monospace";
  Chart.defaults.color = "#333";

  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Cost (₹k)',
          data: costs,
          backgroundColor: data.investments.map(i =>
            selectedSet.has(i.name) ? 'rgba(50,50,50,0.8)' : 'rgba(200,200,200,0.5)'),
          borderColor: 'rgba(50,50,50,1)',
          borderWidth: 1,
        },
        {
          label: 'Return (₹k)',
          data: returns,
          backgroundColor: data.investments.map(i =>
            selectedSet.has(i.name) ? 'rgba(42, 126, 75, 0.8)' : 'rgba(42, 126, 75, 0.2)'),
          borderColor: 'rgba(42, 126, 75, 1)',
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { font: { size: 12 } } },
      },
    },
  });
}

/* ── Doughnut chart ─────────────────────────────────────── */
function renderDoughnutChart(data) {
  const ctx = document.getElementById('doughnut-chart').getContext('2d');
  if (doughnutChart) doughnutChart.destroy();

  const selected = data.investments.filter(i => i.selected);
  if (!selected.length) return;

  // Classic muted palette
  const colors = ['#2a7e4b','#555555','#b8860b','#4682b4','#cd5c5c','#8fbc8f','#dda0dd'];

  doughnutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: selected.map(i => i.name),
      datasets: [{
        data: selected.map(i => i.cost),
        backgroundColor: selected.map((_, idx) => colors[idx % colors.length]),
        borderWidth: 1,
        borderColor: '#fffff8'
      }],
    },
    options: {
      responsive: true,
      cutout: '60%',
      plugins: {
        legend: { position: 'bottom' },
      },
    },
  });
}

/* ── DP table ───────────────────────────────────────────── */
function renderDpTable(data) {
  const table = document.getElementById('dp-table');
  const dp = data.dp_table;
  const maxCols = dp[0].length; // Dynamic length, no longer constrained to 13
  const maxVal = data.total_return;
  table.innerHTML = '';

  // Header row
  const head = document.createElement('thead');
  const headTr = document.createElement('tr');
  headTr.innerHTML = `<th>Item \\ W</th>` + Array.from({ length: maxCols - 1 }, (_, i) => `<th>${i}</th>`).join('');
  head.appendChild(headTr);
  table.appendChild(head);

  // Body
  const body = document.createElement('tbody');
  dp.forEach((row, i) => {
    const tr = document.createElement('tr');
    const label = i === 0 ? '—' : (data.investments[i - 1]?.name || `Item ${i}`);
    tr.innerHTML = `<th title="${label}">${label.length > 15 ? label.slice(0, 15) + '…' : label}</th>`;
    for (let w = 0; w < maxCols - 1; w++) {
      const td = document.createElement('td');
      td.textContent = row[w];
      if (row[w] > 0 && row[w] === maxVal) td.classList.add('dp-highlight');
      tr.appendChild(td);
    }
    body.appendChild(tr);
  });
  table.appendChild(body);
}

/* ── Presets ────────────────────────────────────────────── */
async function loadPresets() {
  try {
    const res = await fetch(`${API}/api/v1/presets`);
    if (!res.ok) return;
    const data = await res.json();
    const container = document.getElementById('preset-btns');
    data.presets.forEach(preset => {
      const btn = document.createElement('button');
      btn.className = 'preset-btn';
      btn.textContent = preset.label;
      btn.onclick = () => applyPreset(preset);
      container.appendChild(btn);
    });
  } catch (_) {
  }
}

function applyPreset(preset) {
  document.getElementById('budget').value = preset.budget;
  document.getElementById('inv-tbody').innerHTML = '';
  rowId = 0;
  preset.investments.forEach(inv => addInvestmentRow(inv));
}

/* ── Init ───────────────────────────────────────────────── */
(function init() {
  // Seed with default rows
  const defaults = [
    { name: 'Tech Stocks',  cost: 30, expected_return: 45, risk_level: 'high',   sector: 'Technology' },
    { name: 'Govt Bonds',   cost: 20, expected_return: 22, risk_level: 'low',    sector: 'Bonds'      },
    { name: 'Mutual Fund',  cost: 25, expected_return: 30, risk_level: 'medium', sector: 'Equity'     },
    { name: 'Fixed Deposit',cost: 15, expected_return: 17, risk_level: 'low',    sector: 'Banking'    },
    { name: 'Real Estate',  cost: 50, expected_return: 70, risk_level: 'medium', sector: 'Property'   },
  ];
  defaults.forEach(d => addInvestmentRow(d));
  loadPresets();
})();
