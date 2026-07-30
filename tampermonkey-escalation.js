// ==UserScript==
// @name         EDSP Escalation - Enviar para Planilha
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Extrai dados do ticket T.Corp e envia para Google Sheets + Resolve o ticket
// @match        https://t.corp.amazon.com/*
// @grant        GM_xmlhttpRequest
// @connect      script.google.com
// ==/UserScript==

(function() {
    'use strict';

    // ===== CONFIGURACAO =====
    // Cole aqui a URL do seu Google Apps Script (aba Escalations)
    const SHEETS_URL = 'COLE_SUA_URL_AQUI';

    // Espera a pagina carregar
    function waitForElement(selector, callback, maxWait = 10000) {
        const start = Date.now();
        const check = () => {
            const el = document.querySelector(selector);
            if (el) {
                callback(el);
            } else if (Date.now() - start < maxWait) {
                setTimeout(check, 500);
            }
        };
        check();
    }

    // Verifica se estamos numa pagina de ticket
    if (!window.location.pathname.match(/\/[A-Z0-9]+$/)) return;

    // Espera o conteudo do ticket carregar
    waitForElement('[data-testid="ticket-description"]', function() {
        addButton();
    });

    // Fallback: adiciona botao apos 3 segundos
    setTimeout(addButton, 3000);

    let buttonAdded = false;

    function addButton() {
        if (buttonAdded) return;
        buttonAdded = true;

        // Cria o botao
        const btn = document.createElement('button');
        btn.textContent = '📋 Enviar para Planilha + Resolver';
        btn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 99999;
            padding: 12px 20px;
            background: #ff9900;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: all 0.2s;
        `;
        btn.onmouseover = () => btn.style.background = '#e68a00';
        btn.onmouseout = () => btn.style.background = '#ff9900';
        btn.onclick = processTicket;
        document.body.appendChild(btn);
    }

    function extractTicketData() {
        const data = {};

        // Ticket ID - pegar da URL ou do elemento
        const urlMatch = window.location.pathname.match(/\/([A-Z0-9-]+)$/);
        data.ticket_id = urlMatch ? urlMatch[1] : '';

        // Pegar todo o texto do corpo do ticket
        const bodyEl = document.querySelector('[data-testid="ticket-description"]') ||
                       document.querySelector('.ticket-description') ||
                       document.querySelector('[class*="description"]') ||
                       document.querySelector('article') ||
                       document.querySelector('.content-area');

        const bodyText = bodyEl ? bodyEl.innerText : document.body.innerText;

        // Extrair campos numerados do corpo
        // 6. Numero de rastreamento relacionado: TBR...
        const tbrMatch = bodyText.match(/6\.\s*N[uú]mero de rastreamento.*?:\s*([A-Z0-9]+)/i);
        data.tbr = tbrMatch ? tbrMatch[1] : '';

        // 7. Id do motorista: A22P...
        const motoristaMatch = bodyText.match(/7\.\s*Id do motorista.*?:\s*([A-Z0-9]+)/i);
        data.id_motorista = motoristaMatch ? motoristaMatch[1] : '';

        // 8. codigo da estacao de entrega: SRP9
        const nodeMatch = bodyText.match(/8\.\s*.*c[oó]digo da esta[cç][aã]o.*?:\s*([A-Z0-9]+)/i);
        data.node = nodeMatch ? nodeMatch[1] : '';

        // 9. Data do evento
        const dataMatch = bodyText.match(/9\.\s*Data do evento.*?:\s*(.+)/i);
        data.data_evento = dataMatch ? dataMatch[1].trim() : '';

        // 10. Hora do evento
        const horaMatch = bodyText.match(/10\.\s*Hora do evento.*?:\s*(.+)/i);
        data.hora_evento = horaMatch ? horaMatch[1].trim() : '';

        // 11. Tipo de feedback
        const tipoMatch = bodyText.match(/11\.\s*Tipo de feedback.*?:\s*(.+)/i);
        data.problem_type = tipoMatch ? tipoMatch[1].trim() : '';

        // 12. Detalhes do feedback
        const detalhesMatch = bodyText.match(/12\.\s*Detalhes do feedback.*?:\s*(.+)/i);
        data.obs = detalhesMatch ? detalhesMatch[1].trim() : '';

        // Severity - do painel lateral
        const sevEl = Array.from(document.querySelectorAll('span, div, dd')).find(el =>
            el.previousElementSibling && el.previousElementSibling.textContent.includes('Severity') ||
            el.parentElement && el.parentElement.textContent.match(/Severity:\s*\d/)
        );
        const sevMatch = document.body.innerText.match(/Severity:\s*(\d)/);
        data.severity = sevMatch ? sevMatch[1] : '';

        // Week atual
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
        data.week = Math.ceil((days + startOfYear.getDay() + 1) / 7);

        // Regional
        data.regional = 'SP';

        // CTA - pegar login do campo 1 se existir
        const ctaMatch = bodyText.match(/1\.\s*Seu login.*?:\s*(.+)/i);
        data.cta = ctaMatch ? ctaMatch[1].trim() : '';

        return data;
    }

    function sendToSheets(data) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: SHEETS_URL,
                data: JSON.stringify({ action: 'addEscalation', data: data }),
                headers: { 'Content-Type': 'text/plain' },
                onload: function(response) {
                    try {
                        const result = JSON.parse(response.responseText);
                        if (result.success) resolve(result);
                        else reject(result.error);
                    } catch(e) {
                        reject('Erro ao processar resposta');
                    }
                },
                onerror: function() {
                    reject('Erro de conexao');
                }
            });
        });
    }

    function resolveTicket() {
        // Procura o botao/dropdown de status e muda para Resolved
        const statusBtn = document.querySelector('[data-testid="status-dropdown"]') ||
                          document.querySelector('button[aria-label*="Status"]') ||
                          Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Assigned') || b.textContent.includes('Status'));

        if (statusBtn) {
            statusBtn.click();
            setTimeout(() => {
                const resolvedOption = Array.from(document.querySelectorAll('li, option, [role="option"], [data-value]')).find(el =>
                    el.textContent.trim() === 'Resolved'
                );
                if (resolvedOption) {
                    resolvedOption.click();
                    return true;
                }
            }, 1000);
        }
        return false;
    }

    async function processTicket() {
        const btn = document.querySelector('button[style*="position: fixed"]');
        btn.textContent = '⏳ Processando...';
        btn.style.background = '#666';

        try {
            // 1. Extrair dados
            const data = extractTicketData();

            // Mostra preview dos dados extraidos
            const preview = `
Ticket: ${data.ticket_id}
Node: ${data.node}
Motorista: ${data.id_motorista}
TBR: ${data.tbr}
Data: ${data.data_evento}
Problem: ${data.problem_type}
            `.trim();

            if (!confirm('Dados extraidos:\n\n' + preview + '\n\nEnviar para planilha e resolver ticket?')) {
                btn.textContent = '📋 Enviar para Planilha + Resolver';
                btn.style.background = '#ff9900';
                return;
            }

            // 2. Enviar para Sheets
            await sendToSheets(data);

            // 3. Resolver ticket
            resolveTicket();

            btn.textContent = '✅ Enviado!';
            btn.style.background = '#27ae60';

            setTimeout(() => {
                btn.textContent = '📋 Enviar para Planilha + Resolver';
                btn.style.background = '#ff9900';
            }, 3000);

        } catch (err) {
            btn.textContent = '❌ Erro: ' + err;
            btn.style.background = '#e74c3c';
            setTimeout(() => {
                btn.textContent = '📋 Enviar para Planilha + Resolver';
                btn.style.background = '#ff9900';
            }, 3000);
        }
    }

})();
