// ===== CONFIGURACAO =====
const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbw46is0HgQt4DZBVg2Az6v66NlYJ9uzbnDsBDixXDZgqiKydAI--zyjrWdlHOKqcxc/exec';

// ===== DADOS INICIAIS (vazio - dados vem do Google Sheets) =====
const defaultData = [];

// ===== CORES =====
const COLORS = {
    primary: '#232f3e',
    orange: '#ff9900',
    green: '#27ae60',
    yellow: '#f39c12',
    red: '#e74c3c',
    blue: '#3498db',
    purple: '#9b59b6',
    teal: '#1abc9c',
    nodeColors: ['#ff9900', '#3498db', '#27ae60', '#9b59b6', '#e74c3c', '#1abc9c', '#f39c12', '#2c3e50']
};

// ===== INICIALIZACAO =====
let auditorias = [];

document.addEventListener('DOMContentLoaded', () => {
    init();
});

async function init() {
    const useSheets = SHEETS_API_URL !== 'COLE_SUA_URL_AQUI' && SHEETS_API_URL.startsWith('https://');

    if (useSheets) {
        try {
            const response = await fetch(SHEETS_API_URL);
            const data = await response.json();
            auditorias = data.map(row => ({
                id: Number(row.id),
                node: String(row.node || ''),
                programa: String(row.programa || ''),
                item: Number(row.item),
                descricao: String(row.descricao || ''),
                status: String(row.status || ''),
                comentarios: String(row.comentarios || '')
            }));
        } catch (error) {
            console.error('Erro ao carregar do Sheets:', error);
            loadFromLocal();
        }
    } else {
        loadFromLocal();
    }

    renderCounters();
    renderCharts();
    renderSummaryTable();
    updateLastUpdate();
}

function loadFromLocal() {
    const saved = localStorage.getItem('auditorias-edsp');
    if (saved) {
        auditorias = JSON.parse(saved);
    } else {
        auditorias = [...defaultData];
    }
}

function updateLastUpdate() {
    const now = new Date();
    const formatted = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('last-update').textContent = formatted;
}

// ===== CONTADORES =====
function renderCounters() {
    const total = auditorias.length;
    const pending = auditorias.filter(a => a.status === 'Pendente').length;
    const done = auditorias.filter(a => a.status === 'Concluido' || a.status === 'Concluído').length;
    const rate = total > 0 ? Math.round((done / total) * 100) : 0;

    document.getElementById('total-count').textContent = total;
    document.getElementById('pending-count').textContent = pending;
    document.getElementById('done-count').textContent = done;
    document.getElementById('rate-count').textContent = rate + '%';
}

// ===== GRAFICOS =====
function renderCharts() {
    renderStatusChart();
    renderNodesChart();
    renderStatusByNodeChart();
    renderRankingChart();
}

// Grafico 1: Pizza - Status Geral
function renderStatusChart() {
    const pending = auditorias.filter(a => a.status === 'Pendente').length;
    const done = auditorias.filter(a => a.status === 'Concluido' || a.status === 'Concluído').length;

    const ctx = document.getElementById('chart-status').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Concluídos', 'Pendentes'],
            datasets: [{
                data: [done, pending],
                backgroundColor: [COLORS.green, COLORS.yellow],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { size: 13 }, padding: 20 }
                }
            }
        }
    });
}

// Grafico 2: Barras - Total de itens por estacao
function renderNodesChart() {
    const nodeData = getNodeSummary();
    const nodes = Object.keys(nodeData);
    const totals = nodes.map(n => nodeData[n].total);

    const ctx = document.getElementById('chart-nodes').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: nodes,
            datasets: [{
                label: 'Total de Itens',
                data: totals,
                backgroundColor: COLORS.nodeColors.slice(0, nodes.length),
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

// Grafico 3: Barras empilhadas - Pendentes vs Concluidos por estacao
function renderStatusByNodeChart() {
    const nodeData = getNodeSummary();
    const nodes = Object.keys(nodeData);
    const pendentes = nodes.map(n => nodeData[n].pending);
    const concluidos = nodes.map(n => nodeData[n].done);

    const ctx = document.getElementById('chart-status-node').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: nodes,
            datasets: [
                {
                    label: 'Concluídos',
                    data: concluidos,
                    backgroundColor: COLORS.green,
                    borderRadius: 4
                },
                {
                    label: 'Pendentes',
                    data: pendentes,
                    backgroundColor: COLORS.yellow,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { size: 12 } }
                }
            },
            scales: {
                x: { stacked: true },
                y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    });
}

// Grafico 4: Barras horizontais - Ranking
function renderRankingChart() {
    const nodeData = getNodeSummary();
    const sorted = Object.entries(nodeData).sort((a, b) => b[1].total - a[1].total);
    const nodes = sorted.map(s => s[0]);
    const totals = sorted.map(s => s[1].total);

    const ctx = document.getElementById('chart-ranking').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: nodes,
            datasets: [{
                label: 'Nao Conformidades',
                data: totals,
                backgroundColor: COLORS.nodeColors.slice(0, nodes.length),
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    });
}

// ===== TABELA RESUMO =====
function renderSummaryTable() {
    const nodeData = getNodeSummary();
    const tbody = document.getElementById('summary-tbody');

    const rows = Object.entries(nodeData)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([node, data]) => {
            const rate = data.total > 0 ? Math.round((data.done / data.total) * 100) : 0;
            const rateClass = rate === 100 ? 'status-concluido' : rate >= 50 ? 'status-pendente' : 'status-badge';
            return `
                <tr>
                    <td><strong>${node}</strong></td>
                    <td>${data.total}</td>
                    <td>${data.pending}</td>
                    <td>${data.done}</td>
                    <td><span class="status-badge ${rateClass}">${rate}%</span></td>
                </tr>
            `;
        }).join('');

    tbody.innerHTML = rows;
}

// ===== UTILITARIOS =====
function getNodeSummary() {
    const summary = {};
    auditorias.forEach(a => {
        if (!summary[a.node]) {
            summary[a.node] = { total: 0, pending: 0, done: 0 };
        }
        summary[a.node].total++;
        if (a.status === 'Pendente') summary[a.node].pending++;
        if (a.status === 'Concluido' || a.status === 'Concluído') summary[a.node].done++;
    });
    return summary;
}
