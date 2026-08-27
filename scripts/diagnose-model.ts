// Bir modelin bir fatura sayfasındaki ham çıktısını teşhis eder.
import * as fs from 'fs';
import * as path from 'path';
import { system_propmt } from '../lib/system-propmt';

const env = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const API_KEY = /^OPENROUTER_API_KEY=(.*)$/m.exec(env)?.[1]?.trim().replace(/^["']|["']$/g, '')!;

const [model, file, maxTokensArg, noJsonMode, reasoningOff] = process.argv.slice(2);
const maxTokens = Number(maxTokensArg || 10000);

(async () => {
    const b64 = fs.readFileSync(file).toString('base64');
    const body: any = {
        model,
        max_tokens: maxTokens,
        messages: [
            { role: 'system', content: system_propmt },
            { role: 'user', content: [
                { type: 'text', text: 'Bu görseldeki faturayı analiz et ve talimatlara uygun şekilde JSON olarak ver.' },
                { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } },
            ]},
        ],
    };
    if (!noJsonMode) body.response_format = { type: 'json_object' };
    // Reasoning modellerinde düşünme token'ları çıktı bütçesini tüketebiliyor
    if (reasoningOff) body.reasoning = { enabled: false };

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) { console.log('HTTP', res.status, (await res.text()).slice(0, 300)); return; }
    const j: any = await res.json();
    const choice = j.choices?.[0];
    const content: string = choice?.message?.content ?? '';

    console.log(`model         : ${model}`);
    console.log(`json_mode     : ${!noJsonMode}   max_tokens: ${maxTokens}   reasoning_off: ${!!reasoningOff}`);
    console.log(`finish_reason : ${choice?.finish_reason}`);
    console.log(`usage         : prompt ${j.usage?.prompt_tokens} / completion ${j.usage?.completion_tokens} / total ${j.usage?.total_tokens}`);
    console.log(`içerik uzunluk: ${content.length} karakter`);
    let ok = false;
    try { JSON.parse(/\{[\s\S]*\}/.exec(content)?.[0] ?? ''); ok = true; } catch (e: any) { console.log(`JSON hatası   : ${e.message}`); }
    console.log(`JSON geçerli  : ${ok ? 'EVET ✓' : 'HAYIR ✗'}`);
    console.log(`--- son 200 karakter ---\n${content.slice(-200)}`);
})();
