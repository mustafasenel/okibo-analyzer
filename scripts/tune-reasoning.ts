// Aynı sayfayı farklı reasoning ayarlarıyla çalıştırıp maliyet/doğruluk dengesini ölçer.
import * as fs from 'fs';
import * as path from 'path';
import { system_propmt } from '../lib/system-propmt';
import { normalizePageItems } from '../lib/normalize';

const env = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const API_KEY = /^OPENROUTER_API_KEY=(.*)$/m.exec(env)?.[1]?.trim().replace(/^["']|["']$/g, '')!;

const MODEL = process.argv[2];
const FILE = process.argv[3];

const VARIANTS: { name: string; reasoning?: any }[] = [
    { name: 'varsayılan (ayar yok)' },
    { name: 'effort: low',            reasoning: { effort: 'low' } },
    { name: 'effort: medium',         reasoning: { effort: 'medium' } },
    { name: 'reasoning max 2000 tk',  reasoning: { max_tokens: 2000 } },
];

async function run(reasoning: any) {
    const b64 = fs.readFileSync(FILE).toString('base64');
    const body: any = {
        model: MODEL,
        max_tokens: 32000,
        response_format: { type: 'json_object' },
        messages: [
            { role: 'system', content: system_propmt },
            { role: 'user', content: [
                { type: 'text', text: 'Bu görseldeki faturayı analiz et ve talimatlara uygun şekilde JSON olarak ver.' },
                { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } },
            ]},
        ],
    };
    if (reasoning) body.reasoning = reasoning;

    const t0 = Date.now();
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const ms = Date.now() - t0;
    if (!res.ok) return { error: `HTTP ${res.status}: ${(await res.text()).slice(0, 120)}`, ms };

    const j: any = await res.json();
    const c = j.choices?.[0];
    const content: string = c?.message?.content ?? '';
    let items: any[] = [];
    let valid = false;
    try {
        const parsed = JSON.parse(/\{[\s\S]*\}/.exec(content)?.[0] ?? '');
        items = normalizePageItems(parsed.invoice_data || []);
        valid = true;
    } catch { /* geçersiz */ }

    const lineSum = items.reduce((s, it) => s + Number(it.originalNetto ?? 0), 0);
    return {
        ms,
        finish: c?.finish_reason,
        completion: j.usage?.completion_tokens,
        total: j.usage?.total_tokens,
        valid,
        lines: items.length,
        lineSum: Math.round(lineSum * 100) / 100,
    };
}

(async () => {
    console.log(`Model: ${MODEL}\nSayfa: ${path.basename(FILE)}\n`);
    console.log('ayar'.padEnd(24), 'süre'.padStart(7), 'compl.tk'.padStart(9), 'JSON'.padStart(6), 'satır'.padStart(6), 'satır toplamı'.padStart(14));
    console.log('-'.repeat(72));
    for (const v of VARIANTS) {
        const r: any = await run(v.reasoning);
        if (r.error) {
            console.log(v.name.padEnd(24), String((r.ms/1000).toFixed(1)+'s').padStart(7), '  —', ' HATA:', r.error);
        } else {
            console.log(
                v.name.padEnd(24),
                String((r.ms/1000).toFixed(1)+'s').padStart(7),
                String(r.completion).padStart(9),
                (r.valid ? '✓' : '✗').padStart(6),
                String(r.lines).padStart(6),
                String(r.lineSum).padStart(14),
                r.finish === 'length' ? ' (KESİLDİ)' : ''
            );
        }
    }
})();
