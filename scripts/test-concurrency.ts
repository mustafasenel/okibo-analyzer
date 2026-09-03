// Eşzamanlılık ölçümü: aynı sayfa kümesi farklı paralellik seviyeleriyle okunur.
import * as fs from 'fs';
import * as path from 'path';
import { system_propmt } from '../lib/system-propmt';

const env = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const KEY = /^OPENROUTER_API_KEY=(.*)$/m.exec(env)![1].trim().replace(/^["']|["']$/g, '');
const SP = process.argv[2];
const PAGES = 6;

async function one(i: number) {
    const b64 = fs.readFileSync(`${SP}/ysev-${(i % 2) + 1}.jpg`).toString('base64');
    const t0 = Date.now();
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'z-ai/glm-5.3-flash', max_tokens: 32000, reasoning: { effort: 'low' },
            response_format: { type: 'json_object' },
            messages: [{ role: 'system', content: system_propmt }, { role: 'user', content: [
                { type: 'text', text: 'Bu görseldeki faturayı analiz et ve talimatlara uygun şekilde JSON olarak ver.' },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}` } }]}],
        }),
    });
    return { ms: Date.now() - t0, status: res.status, ok: res.ok };
}

async function runWith(limit: number) {
    const queue = Array.from({ length: PAGES }, (_, i) => i);
    const results: any[] = [];
    const t0 = Date.now();
    const worker = async () => {
        while (queue.length) {
            const i = queue.shift();
            if (i === undefined) return;
            results.push(await one(i));
        }
    };
    await Promise.all(Array.from({ length: limit }, worker));
    const total = (Date.now() - t0) / 1000;
    const fails = results.filter(r => !r.ok);
    const rate = results.filter(r => r.status === 429).length;
    const avg = results.reduce((s, r) => s + r.ms, 0) / results.length / 1000;
    console.log(
        `eşzamanlı ${String(limit).padStart(2)}  →  toplam ${total.toFixed(1).padStart(5)}s` +
        `   sayfa başı ort ${avg.toFixed(1)}s   hata ${fails.length}  (429: ${rate})`
    );
}

(async () => {
    console.log(`${PAGES} sayfa, aynı model, aynı ayarlar\n`);
    for (const n of [1, 2, 5]) { await runWith(n); await new Promise(r => setTimeout(r, 4000)); }
})();
