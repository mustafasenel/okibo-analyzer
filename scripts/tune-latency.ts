// Reasoning ayarlarının SÜRE değişkenliğini ölçer (aynı sayfa, tekrarlı).
import * as fs from 'fs';
import * as path from 'path';
import { system_propmt } from '../lib/system-propmt';
import { normalizePageItems } from '../lib/normalize';

const env = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const API_KEY = /^OPENROUTER_API_KEY=(.*)$/m.exec(env)?.[1]?.trim().replace(/^["']|["']$/g, '')!;
const FILE = `${process.env.HOME}/Downloads/a1.png`;
const REPEATS = 2;

const VARIANTS: { name: string; model: string; reasoning?: any }[] = [
    { name: 'GLM · effort low',        model: 'z-ai/glm-5.3-flash', reasoning: { effort: 'low' } },
    { name: 'GLM · reasoning max 1024',model: 'z-ai/glm-5.3-flash', reasoning: { max_tokens: 1024 } },
    { name: 'GLM · reasoning max 400', model: 'z-ai/glm-5.3-flash', reasoning: { max_tokens: 400 } },
    { name: 'Qwen VL (reasoning yok)', model: 'qwen/qwen3-vl-8b-instruct' },
];

async function once(v: typeof VARIANTS[number]) {
    const b64 = fs.readFileSync(FILE).toString('base64');
    const body: any = {
        model: v.model,
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
    if (v.reasoning) body.reasoning = v.reasoning;

    const t0 = Date.now();
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const ms = Date.now() - t0;
    if (!res.ok) return { ms, err: `HTTP ${res.status}` };
    const j: any = await res.json();
    const content = j.choices?.[0]?.message?.content ?? '';
    let lines = -1;
    try { lines = normalizePageItems(JSON.parse(/\{[\s\S]*\}/.exec(content)![0]).invoice_data || []).length; } catch {}
    return { ms, completion: j.usage?.completion_tokens, lines, finish: j.choices?.[0]?.finish_reason };
}

(async () => {
    console.log('ayar'.padEnd(26), 'süreler'.padEnd(22), 'compl.tk'.padStart(10), 'satır'.padStart(7));
    console.log('-'.repeat(70));
    for (const v of VARIANTS) {
        const runs: any[] = [];
        for (let i = 0; i < REPEATS; i++) runs.push(await once(v));
        const times = runs.map(r => (r.ms / 1000).toFixed(1) + 's').join(' / ');
        const tk = runs.map(r => r.completion ?? '-').join(' / ');
        const ln = runs.map(r => (r.err ? r.err : r.lines)).join(' / ');
        console.log(v.name.padEnd(26), times.padEnd(22), String(tk).padStart(10), String(ln).padStart(7));
    }
})();
