// ===== CONFIGURACAO =====
const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbyhRBu5iknA-Oa1zTiJjn75ekLQh4BA1B8xxio0AzSMFWGTVEtaZrYX4Mc_v_Bylzs/exec';

// ===== DADOS INICIAIS (vazio - dados vem do Google Sheets) =====
const defaultData = [];

// ===== CORES =====
const COLORS = {
    primary: '#232f3e',
    orange: '#c87f0a',
    green: '#1e7a46',
    yellow: '#b8860b',
    red: '#a93226',
    blue: '#1a5276',
    purple: '#6c3483',
    teal: '#117a65',
    nodeColors: ['#1a5276', '#1e7a46', '#b8860b', '#6c3483', '#a93226', '#117a65', '#7d6608', '#2c3e50']
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

    // Renderizar graficos
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
                datalabels: { display: false }
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
                datalabels: { display: false }
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
                datalabels: { display: false }
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
                datalabels: { display: false }
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
            let barColor = '';
            if (rate === 100) barColor = '#27ae60';
            else if (rate >= 50) barColor = '#f39c12';
            else barColor = '#e74c3c';
            const textColor = rate === 0 ? 'color:#e74c3c; font-weight:800;' : '';
            return `
                <tr>
                    <td><strong>${node}</strong></td>
                    <td>${data.total}</td>
                    <td>${data.pending}</td>
                    <td>${data.done}</td>
                    <td>
                        <div class="progress-bar-container">
                            <div class="progress-bar-fill" style="width:${rate}%; background:${barColor};"></div>
                            <span class="progress-bar-text" style="${textColor}">${rate}%</span>
                        </div>
                    </td>
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
