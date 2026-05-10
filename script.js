/* ═══════════════════════════════════════════════════════════
   PortfolioAI — GSAP Animation Engine + Logic
   ═══════════════════════════════════════════════════════════ */
const API = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' ? 'http://127.0.0.1:8000' : '';
let barChart = null;
let doughnutChart = null;

/* ── Number formatting ─────────────────────────────────── */
function fmtRupee(v) {
  return '₹' + Math.round(v).toLocaleString('en-IN');
}



/* ═══════════════════════════════════════════════════════════
   Hero Entrance Animation
   ═══════════════════════════════════════════════════════════ */
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

const heroTl = gsap.timeline({ defaults: { ease: 'power4.out' } });

heroTl
  .to('.hero-title .word', {
    opacity: 1,
    y: 0,
    duration: 1.2,
    stagger: 0.15,
  })
  .to('#hero-line', {
    width: '120px',
    duration: 0.8,
  }, '-=0.6')
  .to('#hero-subtitle', {
    opacity: 1,
    y: 0,
    duration: 0.8,
  }, '-=0.4')
  .to('.text-reveal', {
    opacity: 1,
    y: 0,
    duration: 0.8,
  }, '-=0.3');

/* ═══════════════════════════════════════════════════════════
   Scroll-Triggered Section Reveals
   ═══════════════════════════════════════════════════════════ */
gsap.utils.toArray('.section-reveal').forEach((el) => {
  gsap.to(el, {
    opacity: 1,
    y: 0,
    duration: 0.7,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: el,
      start: 'top 95%',
      toggleActions: 'play none none none',
    },
  });
});

/* ═══════════════════════════════════════════════════════════
   Heading Scrub — numbers slide in from left on scroll
   ═══════════════════════════════════════════════════════════ */
gsap.utils.toArray('.heading-num').forEach(num => {
  gsap.from(num, {
    x: -40,
    opacity: 0,
    scrollTrigger: {
      trigger: num,
      start: 'top 95%',
      end: 'top 75%',
      scrub: 0.5,
    },
  });
});

/* ═══════════════════════════════════════════════════════════
   Marquee — speed up on scroll
   ═══════════════════════════════════════════════════════════ */
const marqueeTrack = document.querySelector('.marquee-track');
if (marqueeTrack) {
  ScrollTrigger.create({
    trigger: '.marquee-strip',
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: (self) => {
      const speed = 20 - (self.progress * 14); // 20s → 6s
      marqueeTrack.style.animationDuration = speed + 's';
    },
  });
}

/* ═══════════════════════════════════════════════════════════
   Hero Parallax — subtitle drifts up on scroll
   ═══════════════════════════════════════════════════════════ */
gsap.to('#hero-subtitle', {
  y: -60,
  opacity: 0.3,
  scrollTrigger: {
    trigger: '.hero-header',
    start: 'top top',
    end: 'bottom top',
    scrub: true,
  },
});

/* ═══════════════════════════════════════════════════════════
   Hero Line — grows wider on scroll
   ═══════════════════════════════════════════════════════════ */
gsap.to('#hero-line', {
  width: '100%',
  scrollTrigger: {
    trigger: '.hero-header',
    start: 'center center',
    end: 'bottom top',
    scrub: 1,
  },
});

/* ═══════════════════════════════════════════════════════════
   Magnetic Button Effect
   ═══════════════════════════════════════════════════════════ */
document.querySelectorAll('.magnetic').forEach(btn => {
  btn.addEventListener('mousemove', (e) => {
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    gsap.to(btn, { x: x * 0.3, y: y * 0.3, duration: 0.3, ease: 'power2.out' });
  });
  btn.addEventListener('mouseleave', () => {
    gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
  });
});

/* ═══════════════════════════════════════════════════════════
   Investment Rows
   ═══════════════════════════════════════════════════════════ */
let rowId = 0;

function addInvestmentRow(data = {}) {
  const id = rowId++;
  const tbody = document.getElementById('inv-tbody');
  const tr = document.createElement('tr');
  tr.id = `row-${id}`;
  tr.innerHTML = `
    <td><input class="tufte-input" placeholder="Tech Stocks" value="${data.name || ''}" style="width:100%"/></td>
    <td><input class="tufte-input" type="number" min="1" placeholder="2800" value="${data.cost || ''}" style="width:80px" /></td>
    <td><input class="tufte-input" type="number" min="1" placeholder="3400" value="${data.expected_return || ''}" style="width:80px" /></td>
    <td>
      <select class="tufte-input" style="font-size:1.2rem;">
        <option value="low"    ${(data.risk_level||'medium')==='low'?'selected':''}>Low</option>
        <option value="medium" ${(data.risk_level||'medium')==='medium'?'selected':''}>Med</option>
        <option value="high"   ${(data.risk_level||'medium')==='high'?'selected':''}>High</option>
      </select>
    </td>
    <td><input class="tufte-input" placeholder="Sector" value="${data.sector || ''}" style="width:100px" /></td>
    <td><button class="btn-del" onclick="removeRow(${id})" title="Remove">&times;</button></td>
  `;
  tbody.appendChild(tr);
  gsap.from(tr, { opacity: 0, x: -20, duration: 0.4, ease: 'power2.out' });
}

function removeRow(id) {
  const row = document.getElementById(`row-${id}`);
  if (row) {
    gsap.to(row, { opacity: 0, x: 30, duration: 0.3, ease: 'power2.in', onComplete: () => row.remove() });
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

/* ═══════════════════════════════════════════════════════════
   Solve
   ═══════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════
   Render Results
   ═══════════════════════════════════════════════════════════ */
function renderResults(data) {
  const panel = document.getElementById('results-panel');

  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    // Reveal all results sections with scroll triggers
    gsap.utils.toArray('#results-panel .section-reveal').forEach((el, i) => {
      gsap.to(el, {
        opacity: 1, y: 0, duration: 0.8,
        delay: i * 0.08,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 90%',
          toggleActions: 'play none none none',
        },
      });
    });
    ScrollTrigger.refresh();
  }

  // KPIs
  gsapCounter('kpi-return', data.total_return, fmtRupee);
  gsapCounter('kpi-invested', data.total_cost, fmtRupee);
  gsapCounter('kpi-roi', data.roi_percent, v => `${v.toFixed(1)}%`);
  gsapCounter('kpi-remaining', data.remaining_budget, fmtRupee);

  // Tags
  const tagsEl = document.getElementById('selected-tags');
  tagsEl.innerHTML = '';
  data.selected_names.forEach((name, i) => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = name;
    tagsEl.appendChild(tag);
    gsap.from(tag, { opacity: 0, scale: 0.5, y: 10, duration: 0.5, delay: 0.3 + i * 0.1, ease: 'back.out(1.7)' });
  });

  // Charts
  renderBarChart(data);
  renderDoughnutChart(data);
  renderDpTable(data);
  renderEnhancedAllocation(data);

  // Chart canvas scale-up reveal on scroll
  document.querySelectorAll('#results-panel canvas').forEach(canvas => {
    gsap.fromTo(canvas,
      { scale: 0.8, opacity: 0 },
      {
        scale: 1, opacity: 1, duration: 1, ease: 'power2.out',
        scrollTrigger: {
          trigger: canvas,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      }
    );
  });

  // DP table row stagger on scroll
  gsap.utils.toArray('#dp-table tbody tr').forEach((tr, i) => {
    gsap.from(tr, {
      opacity: 0, x: -25, duration: 0.4,
      delay: i * 0.04,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '#dp-table',
        start: 'top 80%',
        toggleActions: 'play none none none',
      },
    });
  });

  ScrollTrigger.refresh();

  // Update marquee with selected stock names
  updateMarquee(data.selected_names);

  // Show modal first
  openModal(data);

  // Scroll to results after brief delay
  gsap.to(window, { scrollTo: { y: '#results-panel', offsetY: 20 }, duration: 1.2, delay: 0.3, ease: 'power2.inOut' });
}

/* ═══════════════════════════════════════════════════════════
   Dynamic Marquee — shows selected stocks
   ═══════════════════════════════════════════════════════════ */
function updateMarquee(names) {
  const track = document.querySelector('.marquee-track');
  if (!track || !names.length) return;

  // Build: "SELECTED — Name1 — Name2 — Name3 — ..." repeated twice for seamless loop
  const items = names.map(n => n.toUpperCase());
  const segment = ['SELECTED PORTFOLIO', '—', ...items.flatMap(n => [n, '—'])];
  const doubled = [...segment, ...segment]; // repeat for seamless CSS loop

  track.innerHTML = doubled.map(t => `<span>${t}</span>`).join('');

  // Restart animation
  track.style.animation = 'none';
  track.offsetHeight; // force reflow
  track.style.animation = '';
}

/* ═══════════════════════════════════════════════════════════
   GSAP Counter
   ═══════════════════════════════════════════════════════════ */
function gsapCounter(id, target, format) {
  const obj = { val: 0 };
  const el = document.getElementById(id);
  if (!el) return;
  gsap.to(obj, {
    val: target,
    duration: 2,
    ease: 'power2.out',
    onUpdate: () => { el.textContent = format(obj.val); }
  });
}

/* ═══════════════════════════════════════════════════════════
   Charts
   ═══════════════════════════════════════════════════════════ */
function renderBarChart(data) {
  const ctx = document.getElementById('bar-chart').getContext('2d');
  if (barChart) barChart.destroy();

  const labels  = data.investments.map(i => i.name);
  const costs   = data.investments.map(i => i.cost);
  const returns = data.investments.map(i => i.expected_return);
  const selectedSet = new Set(data.selected_names);

  Chart.defaults.font.family = "'DM Mono', monospace";
  Chart.defaults.color = '#d4d4cc'; // Light text for dark background

  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Cost (₹)',
          data: costs,
          backgroundColor: data.investments.map(i =>
            selectedSet.has(i.name) ? 'rgba(120,120,120,0.8)' : 'rgba(200,200,200,0.15)'),
          borderColor: 'rgba(150,150,150,1)',
          borderWidth: 1,
        },
        {
          label: 'Return (₹)',
          data: returns,
          backgroundColor: data.investments.map(i =>
            selectedSet.has(i.name) ? 'rgba(42, 126, 75, 0.8)' : 'rgba(42, 126, 75, 0.3)'),
          borderColor: 'rgba(42, 126, 75, 1)',
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { font: { size: 12 } } } },
      scales: {
        x: { grid: { color: 'rgba(255, 255, 255, 0.1)' } },
        y: { grid: { color: 'rgba(255, 255, 255, 0.1)' } }
      }
    },
  });
}

function renderDoughnutChart(data) {
  const ctx = document.getElementById('doughnut-chart').getContext('2d');
  if (doughnutChart) doughnutChart.destroy();

  const selected = data.investments.filter(i => i.selected);
  if (!selected.length) return;

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
      plugins: { legend: { position: 'bottom' } },
      elements: { arc: { borderColor: '#0d0d0d' } } // Match dark background
    },
  });
}

/* ═══════════════════════════════════════════════════════════
   DP Table
   ═══════════════════════════════════════════════════════════ */
function renderDpTable(data) {
  const table = document.getElementById('dp-table');
  const dp = data.dp_table;
  const labels = data.dp_labels || [];
  const maxVal = data.total_return;
  table.innerHTML = '';

  if (!dp || !dp.length) return;

  const head = document.createElement('thead');
  const headTr = document.createElement('tr');
  headTr.innerHTML = `<th>Item \\ W</th>` + dp[0].map((_, i) => {
    const label = labels[i] !== undefined ? labels[i] : i;
    return `<th>${label}</th>`;
  }).join('');
  head.appendChild(headTr);
  table.appendChild(head);

  const body = document.createElement('tbody');
  dp.forEach((row, i) => {
    const tr = document.createElement('tr');
    const name = i === 0 ? '—' : (data.investments[i - 1]?.name || `Item ${i}`);
    tr.innerHTML = `<th title="${name}">${name.length > 15 ? name.slice(0, 15) + '…' : name}</th>`;
    for (let w = 0; w < row.length; w++) {
      const td = document.createElement('td');
      td.textContent = row[w];
      if (row[w] > 0 && row[w] === maxVal) td.classList.add('dp-highlight');
      tr.appendChild(td);
    }
    body.appendChild(tr);
  });
  table.appendChild(body);
}

/* ═══════════════════════════════════════════════════════════
   Enhanced Allocation (in-page)
   ═══════════════════════════════════════════════════════════ */
function renderEnhancedAllocation(data) {
  const table = document.getElementById('enhanced-table');
  table.innerHTML = '';

  const alloc = data.enhanced_allocation || [];
  if (!alloc.length) return;

  gsapCounter('enh-cost', data.enhanced_total_cost, fmtRupee);
  gsapCounter('enh-return', data.enhanced_total_return, fmtRupee);
  gsapCounter('enh-remaining', data.enhanced_remaining, fmtRupee);

  const head = document.createElement('thead');
  head.innerHTML = `<tr><th>Investment</th><th>Unit Cost</th><th>Unit Return</th><th>Units</th><th>Total Cost</th><th>Total Return</th></tr>`;
  table.appendChild(head);

  const body = document.createElement('tbody');
  alloc.forEach((item, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.name}</td>
      <td>${fmtRupee(item.unit_cost)}</td>
      <td>${fmtRupee(item.unit_return)}</td>
      <td><strong>${item.units}</strong></td>
      <td>${fmtRupee(item.total_cost)}</td>
      <td>${fmtRupee(item.total_return)}</td>
    `;
    body.appendChild(tr);
    gsap.from(tr, { opacity: 0, x: -20, duration: 0.4, delay: i * 0.05, ease: 'power2.out' });
  });
  table.appendChild(body);
}

/* ═══════════════════════════════════════════════════════════
   Modal — Enhanced Portfolio Popup
   ═══════════════════════════════════════════════════════════ */
function openModal(data) {
  const alloc = data.enhanced_allocation || [];
  if (!alloc.length) return;

  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById('modal');

  // Populate modal KPIs
  document.getElementById('modal-cost').textContent = fmtRupee(data.enhanced_total_cost);
  document.getElementById('modal-return').textContent = fmtRupee(data.enhanced_total_return);
  document.getElementById('modal-remaining').textContent = fmtRupee(data.enhanced_remaining);

  // Populate modal table
  const table = document.getElementById('modal-table');
  table.innerHTML = '';
  const head = document.createElement('thead');
  head.innerHTML = `<tr><th>Investment</th><th>Unit Cost</th><th>Units</th><th>Total Cost</th><th>Total Return</th></tr>`;
  table.appendChild(head);

  const body = document.createElement('tbody');
  alloc.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.name}</td>
      <td>${fmtRupee(item.unit_cost)}</td>
      <td><strong style="color:#2a7e4b;font-size:1.3em">${item.units}</strong></td>
      <td>${fmtRupee(item.total_cost)}</td>
      <td>${fmtRupee(item.total_return)}</td>
    `;
    body.appendChild(tr);
  });
  table.appendChild(body);

  // Animate in
  overlay.classList.add('active');
  const tl = gsap.timeline();
  tl.to(overlay, { opacity: 1, duration: 0.4, ease: 'power2.out' })
    .to(modal, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'power3.out' }, '-=0.2');

  // Stagger KPI cards
  gsap.from('.modal-kpi', { opacity: 0, y: 20, duration: 0.5, stagger: 0.1, delay: 0.5, ease: 'power2.out' });

  // Stagger table rows
  gsap.from('#modal-table tbody tr', { opacity: 0, x: -15, duration: 0.4, stagger: 0.06, delay: 0.7, ease: 'power2.out' });

  // Counter animations in modal
  const costObj = { val: 0 };
  gsap.to(costObj, {
    val: data.enhanced_total_cost, duration: 2, delay: 0.5, ease: 'power2.out',
    onUpdate: () => { document.getElementById('modal-cost').textContent = fmtRupee(costObj.val); }
  });
  const retObj = { val: 0 };
  gsap.to(retObj, {
    val: data.enhanced_total_return, duration: 2, delay: 0.5, ease: 'power2.out',
    onUpdate: () => { document.getElementById('modal-return').textContent = fmtRupee(retObj.val); }
  });
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById('modal');

  const tl = gsap.timeline({
    onComplete: () => {
      overlay.classList.remove('active');
      gsap.set(modal, { opacity: 0, y: 40, scale: 0.95 });
      gsap.set(overlay, { opacity: 0 });
    }
  });
  tl.to(modal, { opacity: 0, y: -30, scale: 0.95, duration: 0.35, ease: 'power2.in' })
    .to(overlay, { opacity: 0, duration: 0.3 }, '-=0.15');
}

// Close modal on overlay click (not modal itself)
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});

// Close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

/* ═══════════════════════════════════════════════════════════
   Presets
   ═══════════════════════════════════════════════════════════ */
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
  } catch (_) {}
}

function applyPreset(preset) {
  document.getElementById('budget').value = preset.budget;
  document.getElementById('inv-tbody').innerHTML = '';
  rowId = 0;
  preset.investments.forEach(inv => addInvestmentRow(inv));
}

/* ═══════════════════════════════════════════════════════════
   Toast
   ═══════════════════════════════════════════════════════════ */
(function createToastContainer() {
  const c = document.createElement('div');
  c.className = 'toast-container';
  c.id = 'toast-container';
  document.body.appendChild(c);
})();

function showToast(message, type = 'error') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'success' ? 'toast-success' : ''}`;
  toast.textContent = message;
  container.appendChild(toast);
  gsap.to(toast, { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' });
  gsap.to(toast, { opacity: 0, x: 20, duration: 0.3, delay: 5, onComplete: () => toast.remove() });
}

/* ═══════════════════════════════════════════════════════════
   Live Data
   ═══════════════════════════════════════════════════════════ */
let categoriesData = {};

async function loadCategories() {
  try {
    const res = await fetch(`${API}/api/v1/categories`);
    if (!res.ok) return;
    const data = await res.json();
    categoriesData = data.categories || {};
    const select = document.getElementById('category-select');
    Object.keys(categoriesData).forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
  } catch (_) {}
}

async function fetchLiveData() {
  const selectedCategory = document.getElementById('category-select').value;
  const customTickers = document.getElementById('custom-tickers').value.trim();
  const btn = document.getElementById('fetch-btn');
  const label = document.getElementById('fetch-btn-label');
  const spinner = document.getElementById('fetch-spinner');
  const statusEl = document.getElementById('fetch-status');

  let url = '', source = '';

  if (customTickers) {
    url = `${API}/api/v1/fetch-investments?tickers=${encodeURIComponent(customTickers)}`;
    source = 'Yahoo Finance (custom)';
  } else if (selectedCategory && categoriesData[selectedCategory]) {
    const cat = categoriesData[selectedCategory];
    if (cat.type === 'mf') {
      url = `${API}/api/v1/fetch-mf?scheme_codes=${encodeURIComponent(cat.scheme_codes.join(','))}`;
      source = 'MFAPI.in';
    } else {
      url = `${API}/api/v1/fetch-investments?tickers=${encodeURIComponent(cat.tickers.join(','))}`;
      source = 'Yahoo Finance';
    }
  } else {
    showToast('Please select a category or enter custom tickers.');
    return;
  }

  label.textContent = 'Fetching...';
  spinner.style.display = 'inline-block';
  btn.style.opacity = '0.7';
  btn.disabled = true;
  statusEl.textContent = 'Connecting to data source...';

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    const data = await res.json();
    const investments = data.investments || [];
    if (!investments.length) {
      showToast('No investment data returned.');
      statusEl.textContent = 'No data returned.';
      return;
    }
    investments.forEach(inv => addInvestmentRow(inv));
    statusEl.textContent = `✓ ${investments.length} investments loaded from ${source} at ${new Date().toLocaleTimeString()}`;
    showToast(`${investments.length} investments loaded.`, 'success');
  } catch (e) {
    showToast(`Fetch failed: ${e.message}`);
    statusEl.textContent = `✗ ${e.message}`;
  } finally {
    label.textContent = 'Fetch Live Data';
    spinner.style.display = 'none';
    btn.style.opacity = '1';
    btn.disabled = false;
  }
}

/* ═══════════════════════════════════════════════════════════
   Background Animation: NexVest DP Matrix Flow
   ═══════════════════════════════════════════════════════════ */
function initMatrixFlow() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  let w, h;
  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  const cols = Math.floor(window.innerWidth / 25) + 2;
  const rows = Math.floor(window.innerHeight / 25) + 2;
  const size = 25;
  const grid = [];

  for (let c = 0; c < cols; c++) {
    grid[c] = [];
    for (let r = 0; r < rows; r++) {
      grid[c][r] = {
        val: Math.random() > 0.8 ? 1 : 0,
        char: Math.random() > 0.5 ? '1' : '0'
      };
    }
  }

  // Floating nodes for data network
  const nodes = [];
  const numNodes = window.innerWidth < 768 ? 20 : 60;
  for (let i = 0; i < numNodes; i++) {
    nodes.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      r: Math.random() * 2 + 1
    });
  }

  let frame = 0;
  function animate() {
    ctx.clearRect(0, 0, w, h);
    frame++;

    // 1. Draw organic background waves
    const waveColors = ['rgba(42, 126, 75, 0.04)', 'rgba(184, 134, 11, 0.03)', 'rgba(42, 126, 75, 0.06)'];
    waveColors.forEach((color, i) => {
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let y = h; y >= -50; y -= 20) {
        const xBase = w * 0.1 + (y / h) * w * 0.15;
        const xOffset = Math.sin(y * 0.003 + frame * 0.015 + i) * 80;
        const xOffset2 = Math.cos(y * 0.007 - frame * 0.01 + i) * 40;
        ctx.lineTo(xBase + xOffset + xOffset2, y);
      }
      ctx.lineTo(0, -50);
      ctx.lineTo(0, h);
      ctx.fillStyle = color;
      ctx.fill();
    });

    // 2. Draw falling 0/1 Matrix grid
    ctx.font = '12px "DM Mono", monospace';
    
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const cell = grid[c][r];
        
        if (Math.random() > 0.995) {
          cell.char = Math.random() > 0.5 ? '1' : '0';
          cell.val = 1; 
        }
        
        cell.val += (0 - cell.val) * 0.03;
        
        const x = c * size;
        const y = ((r * size) + (frame * 0.6)) % (rows * size) - size;
        
        // Calculate fade based on distance from center (fade out in the middle where content is)
        let xFade = 1;
        if (w >= 768) {
          const centerDist = Math.abs((x / w) - 0.5) * 2; 
          xFade = (centerDist - 0.4) * 2.5; // Show only on edges (left/right margins)
          if (xFade < 0) xFade = 0;
          if (xFade > 1) xFade = 1;
        } else {
          xFade = 0.4; // Subtle everywhere on mobile
        }
        
        if (xFade > 0) {
          const finalAlpha = (cell.val * 0.5 + 0.05) * xFade;
          
          if (c % 5 === 0) {
            ctx.fillStyle = `rgba(42, 126, 75, ${finalAlpha * 0.5})`;
            ctx.fillRect(x + 5, y + 5, size - 10, size - 10);
            ctx.strokeStyle = `rgba(42, 126, 75, ${finalAlpha})`;
            ctx.strokeRect(x + 5, y + 5, size - 10, size - 10);
          } else {
            ctx.fillStyle = `rgba(42, 126, 75, ${finalAlpha})`;
            ctx.fillText(cell.char, x + 8, y + 16);
          }
        }
      }
    }

    // 3. Draw data constellation network (animates empty space)
    ctx.lineWidth = 0.8;
    for (let i = 0; i < nodes.length; i++) {
      const n1 = nodes[i];
      n1.x += n1.vx;
      n1.y += n1.vy;
      
      // Bounce off edges smoothly
      if (n1.x < 0 || n1.x > w) n1.vx *= -1;
      if (n1.y < 0 || n1.y > h) n1.vy *= -1;

      // Keep out of center if on desktop
      let alphaMultiplier = 1;
      if (w >= 768) {
        const centerDist = Math.abs((n1.x / w) - 0.5) * 2;
        alphaMultiplier = (centerDist - 0.3) * 2;
        if (alphaMultiplier < 0.1) alphaMultiplier = 0.1;
        if (alphaMultiplier > 1) alphaMultiplier = 1;
      } else {
        alphaMultiplier = 0.4; // Mobile opacity
      }

      ctx.beginPath();
      ctx.arc(n1.x, n1.y, n1.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(42, 126, 75, ${0.6 * alphaMultiplier})`;
      ctx.fill();

      for (let j = i + 1; j < nodes.length; j++) {
        const n2 = nodes[j];
        const dist = Math.hypot(n1.x - n2.x, n1.y - n2.y);
        const connectDist = w < 768 ? 80 : 120;
        
        if (dist < connectDist) {
          ctx.beginPath();
          ctx.moveTo(n1.x, n1.y);
          ctx.lineTo(n2.x, n2.y);
          ctx.strokeStyle = `rgba(42, 126, 75, ${0.25 * (1 - dist / connectDist) * alphaMultiplier})`;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(animate);
  }
  
  animate();
}

/* ═══════════════════════════════════════════════════════════
   Init
   ═══════════════════════════════════════════════════════════ */
(function init() {
  initMatrixFlow();
  const defaults = [
    { name: 'Tech Stocks',  cost: 30000, expected_return: 45000, risk_level: 'high',   sector: 'Technology' },
    { name: 'Govt Bonds',   cost: 20000, expected_return: 22000, risk_level: 'low',    sector: 'Bonds'      },
    { name: 'Mutual Fund',  cost: 25000, expected_return: 30000, risk_level: 'medium', sector: 'Equity'     },
    { name: 'Fixed Deposit',cost: 15000, expected_return: 17000, risk_level: 'low',    sector: 'Banking'    },
    { name: 'Real Estate',  cost: 50000, expected_return: 70000, risk_level: 'medium', sector: 'Property'   },
  ];
  defaults.forEach(d => addInvestmentRow(d));
  loadPresets();
  loadCategories();
})();
