/**
 * İki OpenRouter modelini aynı faturalarla karşılaştırır.
 * Çalıştır:
 *   npx ts-node --compiler-options '{"module":"commonjs","esModuleInterop":true}' \
 *     scripts/compare-models.ts <model1> <model2>
 */
import * as fs from 'fs';
import * as path from 'path';
import { system_propmt } from '../lib/system-propmt';
import { normalizePageItems } from '../lib/normalize';
import { findCulpritLine } from '../lib/reconcile';
import { findSuspiciousCells, totalsMismatch } from '../lib/suspicion';

// .env.local'den anahtarı oku
const envPath = path.join(__dirname, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
const API_KEY = /^OPENROUTER_API_KEY=(.*)$/m.exec(env)?.[1]?.trim().replace(/^["']|["']$/g, '');
if (!API_KEY) { console.error('OPENROUTER_API_KEY bulunamadı'); process.exit(1); }

const MODELS = process.argv.slice(2);
if (MODELS.length === 0) { console.error('Model adı ver'); process.exit(1); }

const HOME = process.env.HOME!;
const INVOICES: Record<string, string[]> = {
    'Akar GmbH':      [`${HOME}/Downloads/a1.png`, `${HOME}/Downloads/a2.png`],
    'Sofra Kosovare': [`${HOME}/Downloads/s1.png`, `${HOME}/Downloads/s2.png`],
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** 429 ve bozuk JSON durumlarında geri çekilerek tekrar dener. */
async function analyzePageWithRetry(model: string, file: string, tries = 4) {
    let lastErr: any;
    for (let i = 0; i < tries; i++) {
        try {
            return await analyzePage(model, file);
        } catch (err: any) {
            lastErr = err;
            const retryable = /HTTP 429|HTTP 5\d\d|JSON çıkarılamadı/.test(err.message);
            if (!retryable || i === tries - 1) throw err;
            await sleep(4000 * (i + 1));
        }
    }
    throw lastErr;
}

async function analyzePage(model: string, file: string) {
    const b64 = fs.readFileSync(file).toString('base64');
    const started = Date.now();
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            max_tokens: 32000,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: system_propmt },
                { role: 'user', content: [
                    { type: 'text', text: 'Bu görseldeki faturayı analiz et ve talimatlara uygun şekilde JSON olarak ver.' },
                    { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } },
                ]},
            ],
        }),
    });
    const ms = Date.now() - started;
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const json: any = await res.json();
    const content = json.choices?.[0]?.message?.content ?? '';
    const match = /\{[\s\S]*\}/.exec(content);
    if (!match) throw new Error('JSON çıkarılamadı');
    return { parsed: JSON.parse(match[0]), ms, usage: json.usage };
}

const money = (n: number) => new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

(async () => {
    for (const model of MODELS) {
        console.log('\n' + '='.repeat(72));
        console.log(`MODEL: ${model}`);
        console.log('='.repeat(72));

        for (const [name, files] of Object.entries(INVOICES)) {
            try {
                const results = [];
                let totalMs = 0, totalTokens = 0;
                for (const f of files) {
                    const r = await analyzePageWithRetry(model, f);
                    results.push(r.parsed);
                    totalMs += r.ms;
                    totalTokens += r.usage?.total_tokens ?? 0;
                }

                const pages = results.map((r: any, i: number) => ({
                    page: i + 1,
                    items: normalizePageItems(r.invoice_data || []),
                }));
                const summary = [...results].reverse().find((r: any) => r.invoice_summary)?.invoice_summary ?? null;
                const meta = results.find((r: any) => r.invoice_meta)?.invoice_meta ?? {};

                const lineCount = pages.reduce((s, p) => s + p.items.length, 0);
                const totals = totalsMismatch(pages, summary?.total_net);
                const suspicious = findSuspiciousCells(pages);
                const culprit = findCulpritLine(pages, summary?.total_net);
                const suspRows = new Set(suspicious.map(c => `${c.page}:${c.row}`)).size;

                console.log(`\n── ${name} ──`);
                console.log(`  fatura no      : ${meta.Rechnungsnummer ?? '—'}   firma: ${meta.Firma ?? '—'}`);
                console.log(`  satır sayısı   : ${lineCount}`);
                console.log(`  satır toplamı  : ${money(totals.lineTotal)} €`);
                console.log(`  faturanın neti : ${totals.stated !== null ? money(totals.stated) + ' €' : '— (özet okunamadı)'}`);
                console.log(`  UYUŞMA         : ${totals.stated === null ? '?' : totals.mismatched ? `HAYIR (fark ${money(Math.abs(totals.difference))} €)` : 'EVET ✓'}`);
                console.log(`  şüpheli satır  : ${suspRows} / ${lineCount}   (şüpheli hücre: ${suspicious.length})`);
                if (culprit) console.log(`  suçlu satır    : ${culprit.product} → ${money(culprit.currentNetto)} yerine ${money(culprit.suggestedNetto)}`);
                console.log(`  süre / token   : ${(totalMs / 1000).toFixed(1)} sn · ${totalTokens} token`);
                console.log(`  ilk 3 satır    :`);
                pages[0].items.slice(0, 3).forEach((it: any) =>
                    console.log(`     ${String(it.ArtikelBez).slice(0, 26).padEnd(26)} koli:${String(it.Kolli).padStart(3)} içerik:${String(it.Inhalt).padStart(3)} adet:${String(it.Menge).padStart(4)} fiyat:${String(it.Preis).padStart(7)} net:${String(it.Netto).padStart(8)}`)
                );
            } catch (err: any) {
                console.log(`\n── ${name} ──`);
                console.log(`  HATA: ${err.message}`);
            }
        }
    }
})();
