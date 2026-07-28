// ===== CONFIGURACAO =====
const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbzfDNUOBdeR0Oq2NU5FF6hj5veUYgvJqMubXTutPiDdYy55_2fqkgtfc_dZlWzhDIY/exec';

// ===== DADOS INICIAIS (vazio - dados vem do Google Sheets) =====
const defaultData = [];

// ===== CORES =====
const COLORS = {
    primary: '#232f3e',
    orange: '#ff9900',
    green: '#a8d5ba',
    yellow: '#f9e79f',
    red: '#f5b7b1',
    blue: '#aed6f1',
    purple: '#d2b4de',
    teal: '#a3e4d7',
    nodeColors: ['#aed6f1', '#a8d5ba', '#f9e79f', '#d2b4de', '#f5b7b1', '#a3e4d7', '#fadbd8', '#d5dbdb']
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

    // Registrar plugin de datalabels
    Chart.register(ChartDataLabels);

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
    const done = auditorias.filter(a => a.status === 'Concluído' || a.status === 'Concluido').length;
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
    const done = auditorias.filter(a => a.status === 'Concluído' || a.status === 'Concluido').length;

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
                },
                datalabels: {
                    color: '#fff',
                    font: { size: 16, weight: 'bold' },
                    formatter: (value) => value > 0 ? value : ''
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
                legend: { display: false },
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    color: '#232f3e',
                    font: { size: 14, weight: 'bold' },
                    formatter: (value) => value > 0 ? value : ''
                }
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
                },
                datalabels: {
                    color: '#fff',
                    font: { size: 12, weight: 'bold' },
                    formatter: (value) => value > 0 ? value : ''
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
                legend: { display: false },
                datalabels: {
                    anchor: 'end',
                    align: 'right',
                    color: '#232f3e',
                    font: { size: 14, weight: 'bold' },
                    formatter: (value) => value > 0 ? value : ''
                }
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
            let rateClass = '';
            if (rate === 100) rateClass = 'rate-green';
            else if (rate >= 50) rateClass = 'rate-yellow';
            else rateClass = 'rate-red';
            return `
                <tr>
                    <td><strong>${node}</strong></td>
                    <td>${data.total}</td>
                    <td>${data.pending}</td>
                    <td>${data.done}</td>
                    <td><span class="rate-badge ${rateClass}">${rate}%</span></td>
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
        if (a.status === 'Concluído' || a.status === 'Concluido') summary[a.node].done++;
    });
    return summary;
}
