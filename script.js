const storageKey = 'devstatus-state-v1';
const defaultState = {
  monitors: [
    { id: crypto.randomUUID(), name: 'Portafolio', url: 'https://bolillo-dev-portfolio.yazzid-st.chatgpt.site', type: 'Website', status: 'unknown', latency: null, uptime: 100, history: [58, 65, 62, 71, 68, 64, 70, 66, 73, 69] },
    { id: crypto.randomUUID(), name: 'GitHub API', url: 'https://api.github.com', type: 'API', status: 'unknown', latency: null, uptime: 100, history: [45, 48, 42, 51, 47, 44, 53, 48, 46, 49] },
  ],
  events: [],
};

let state;
try { state = JSON.parse(localStorage.getItem(storageKey)) || defaultState; } catch { state = defaultState; }

const $ = (selector) => document.querySelector(selector);
const monitorList = $('#monitor-list');
const eventList = $('#event-list');
const dialog = $('#monitor-dialog');
const toast = $('#toast');

const persist = () => localStorage.setItem(storageKey, JSON.stringify(state));
const escapeHtml = (value) => value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const showToast = (message) => { toast.textContent = message; toast.classList.add('show'); window.setTimeout(() => toast.classList.remove('show'), 1700); };

const sparklinePoints = (history) => {
  const values = history.length ? history : [50, 50];
  const min = Math.min(...values) - 8;
  const max = Math.max(...values) + 8;
  return values.map((value, index) => `${(index / Math.max(1, values.length - 1)) * 180},${38 - ((value - min) / Math.max(1, max - min)) * 34}`).join(' ');
};

const render = () => {
  monitorList.replaceChildren(...state.monitors.map((monitor) => {
    const article = document.createElement('article');
    article.className = 'monitor-card';
    const statusLabel = monitor.status === 'up' ? 'Operativo' : monitor.status === 'down' ? 'Sin respuesta' : monitor.status === 'checking' ? 'Revisando…' : 'Pendiente';
    const statusClass = monitor.status === 'down' ? 'down' : monitor.status === 'checking' || monitor.status === 'unknown' ? 'checking' : '';
    article.innerHTML = `
      <div class="monitor-name"><span class="service-icon">${monitor.type === 'API' ? 'API' : monitor.type === 'Radio stream' ? 'FM' : 'WEB'}</span><div><strong>${escapeHtml(monitor.name)}</strong><a href="${escapeHtml(monitor.url)}" target="_blank" rel="noreferrer">${escapeHtml(monitor.url)}</a></div></div>
      <div class="metric"><small>ESTADO</small><span class="status ${statusClass}">${statusLabel}</span></div>
      <div class="metric"><small>RESPUESTA</small><strong>${monitor.latency === null ? '—' : `${monitor.latency} ms`}</strong></div>
      <svg class="sparkline ${monitor.status === 'down' ? 'down' : ''}" viewBox="0 0 180 42" preserveAspectRatio="none" aria-label="Historial de respuesta"><polyline points="${sparklinePoints(monitor.history)}" /></svg>
      <button class="delete-monitor" data-delete="${monitor.id}" aria-label="Eliminar ${escapeHtml(monitor.name)}">×</button>`;
    return article;
  }));

  const up = state.monitors.filter((monitor) => monitor.status === 'up').length;
  const down = state.monitors.filter((monitor) => monitor.status === 'down').length;
  const checked = up + down;
  const averageLatency = state.monitors.filter((monitor) => monitor.latency !== null).reduce((sum, monitor) => sum + monitor.latency, 0) / Math.max(1, checked);
  const averageUptime = state.monitors.reduce((sum, monitor) => sum + monitor.uptime, 0) / Math.max(1, state.monitors.length);
  $('#overall-label').textContent = down ? `${down} servicio${down > 1 ? 's' : ''} con problemas` : checked ? 'Todo operativo' : 'Pendiente de revisión';
  $('#overall-count').textContent = `${up} / ${state.monitors.length}`;
  $('.summary-icon').classList.toggle('down', Boolean(down));
  $('.summary-icon').textContent = down ? '!' : '✓';
  $('#uptime-value').textContent = `${averageUptime.toFixed(2)}%`;
  $('#response-value').textContent = checked ? `${Math.round(averageLatency)} ms` : '—';
  $('#monitor-count').textContent = `${state.monitors.length} endpoint${state.monitors.length === 1 ? '' : 's'}`;
  $('#empty-state').hidden = state.monitors.length > 0;

  eventList.replaceChildren(...state.events.slice(0, 12).map((event) => {
    const article = document.createElement('article');
    article.className = 'event';
    article.innerHTML = `<i class="${event.status === 'down' ? 'down' : ''}"></i><div><strong>${escapeHtml(event.name)} ${event.status === 'down' ? 'dejó de responder' : 'respondió correctamente'}</strong><span>${event.latency ? `${event.latency} ms · ` : ''}${escapeHtml(event.url)}</span></div><time>${new Date(event.at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</time>`;
    return article;
  }));
  if (!state.events.length) eventList.innerHTML = '<article class="event"><i></i><div><strong>Sin eventos todavía</strong><span>Ejecuta una revisión para comenzar el historial.</span></div><time>—</time></article>';
};

const ping = async (monitor) => {
  monitor.status = 'checking';
  render();
  const started = performance.now();
  let status = 'up';
  try {
    await fetch(monitor.url, { mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(10000) });
  } catch (error) {
    status = 'down';
  }
  const latency = Math.max(1, Math.round(performance.now() - started));
  monitor.status = status;
  monitor.latency = latency;
  monitor.history = [...(monitor.history || []), Math.min(latency, 500)].slice(-18);
  const totalChecks = monitor.totalChecks || 0;
  const successfulChecks = monitor.successfulChecks || 0;
  monitor.totalChecks = totalChecks + 1;
  monitor.successfulChecks = successfulChecks + (status === 'up' ? 1 : 0);
  monitor.uptime = (monitor.successfulChecks / monitor.totalChecks) * 100;
  state.events.unshift({ id: crypto.randomUUID(), name: monitor.name, url: monitor.url, status, latency, at: new Date().toISOString() });
};

const checkAll = async () => {
  if (!state.monitors.length) return showToast('Primero añade un monitor');
  $('#check-all').disabled = true;
  await Promise.all(state.monitors.map(ping));
  $('#last-check').textContent = `Revisado ${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`;
  $('#check-all').disabled = false;
  persist();
  render();
  showToast('Revisión terminada');
};

const openDialog = () => dialog.showModal();
$('#open-add').addEventListener('click', openDialog);
$('#empty-add').addEventListener('click', openDialog);
$('#close-dialog').addEventListener('click', () => dialog.close());
$('#check-all').addEventListener('click', checkAll);

$('#monitor-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const monitor = { id: crypto.randomUUID(), name: $('#name-input').value.trim(), url: $('#url-input').value.trim(), type: $('#type-input').value, status: 'unknown', latency: null, uptime: 100, history: [] };
  state.monitors.push(monitor);
  persist();
  render();
  dialog.close();
  event.target.reset();
  await ping(monitor);
  persist();
  render();
});

monitorList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-delete]');
  if (!button) return;
  state.monitors = state.monitors.filter((monitor) => monitor.id !== button.dataset.delete);
  persist();
  render();
  showToast('Monitor eliminado');
});

$('#clear-events').addEventListener('click', () => { state.events = []; persist(); render(); showToast('Historial limpio'); });
render();
