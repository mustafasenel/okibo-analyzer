import { system_propmt } from '@/lib/system-propmt';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Company'ye atanmış model yoksa kullanılacak varsayılan OpenRouter modeli.
const DEFAULT_OPENROUTER_MODEL = 'qwen/qwen3-vl-8b-instruct';

// Çıktı bütçesi. Reasoning modelleri (ör. GLM) düşünme token'larını da bu bütçeden
// harcıyor; 10k ile yoğun faturalarda cevap yazılamadan kesiliyordu
// (finish_reason: length, içerik 0 karakter). Ölçülen: 28 satırlık sayfa ~23k token.
const MAX_OUTPUT_TOKENS = Number(process.env.OPENROUTER_MAX_TOKENS ?? 32000);

// Reasoning modelleri düşünme token'larını da çıktı bütçesinden harcıyor.
// Ölçüm (GLM, 28 satırlık sayfa): varsayılan 25.583 token → effort:low 3.756 token,
// aynı süre, aynı 28 satır. Yani ~%85 daha ucuz, kalite kaybı yok.
const REASONING_EFFORT = process.env.OPENROUTER_REASONING_EFFORT ?? 'low';

// Helper function for exponential backoff
const fetchWithRetry = async (
    url: string, 
    options: RequestInit, 
    retries = 3, 
    backoff = 1000
): Promise<Response> => {
    try {
        const response = await fetch(url, options);

        if (response.status === 429 && retries > 0) {
            console.warn(`Rate limit aşıldı. ${backoff}ms sonra yeniden denenecek. Kalan deneme: ${retries - 1}`);
            await new Promise(resolve => setTimeout(resolve, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }

        return response;
    } catch (error) {
        if (retries > 0) {
            console.warn(`İstek hatası. ${backoff}ms sonra yeniden denenecek. Kalan deneme: ${retries - 1}`, error);
            await new Promise(resolve => setTimeout(resolve, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
        throw error;
    }
};

// Function to parse the AI's response safely
const parseJsonResponse = (jsonString: string) => {
    try {
        const jsonMatch = jsonString.match(/\{[\s\S]*\}/);

        if (!jsonMatch || !jsonMatch[0]) {
            return null;
        }

        const extractedJson = jsonMatch[0];
        
        // Temizlenmiş JSON string'ini JavaScript nesnesine çevir
        const parsedJson = JSON.parse(extractedJson);

        return parsedJson;
    } catch (error) {
        console.error("----------- JSON PARSE HATASI -----------");
        if (error instanceof Error) {
            console.error("Hata Mesajı:", error.message);
        } else {
            console.error("Beklenmedik Hata Tipi:", error);
        }
        console.error("----------- BOZUK JSON VERİSİ -----------");
        console.log(jsonString); 
        console.error("-----------------------------------------");
        return null;
    }
};

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const image = formData.get("image") as File | null; // Expect a single image
        const companyCode = formData.get("companyCode") as string | null;

        if (!image) {
            return new Response(JSON.stringify({ error: "No image provided" }), { status: 400 });
        }

        // Sunucu yapılandırması eksikse net hata ver (aksi halde OpenRouter 401 döner ve
        // istemciye anlamsız bir 500 olarak yansır).
        if (!process.env.OPENROUTER_API_KEY) {
            console.error("OPENROUTER_API_KEY tanımlı değil — sunucu ortam değişkenlerini kontrol edin.");
            return new Response(
                JSON.stringify({ error: "Sunucu yapılandırması eksik: analiz servisi anahtarı tanımlı değil. Lütfen yöneticiyle iletişime geçin." }),
                { status: 503, headers: { "Content-Type": "application/json" } }
            );
        }

        // Model seçimi sunucu tarafında, firmaya atanmış modelden çözülür (client belirlemez).
        let model = DEFAULT_OPENROUTER_MODEL;
        if (companyCode) {
            const company = await prisma.company.findUnique({
                where: { code: companyCode },
                include: { model: true },
            });
            if (company?.model?.isActive && company.model.openrouterId) {
                model = company.model.openrouterId;
            }
        }

        // Yedek model: birincil model hata verirse buna düşülür (admin panelinden işaretlenir)
        const fallback = await prisma.model.findFirst({
            where: { isFallback: true, isActive: true },
            select: { openrouterId: true, displayName: true },
        });
        const fallbackModel =
            fallback?.openrouterId && fallback.openrouterId !== model ? fallback.openrouterId : null;

        const arrayBuffer = await image.arrayBuffer();
        const base64Image = Buffer.from(arrayBuffer).toString("base64");
        
        const payload = {
            max_tokens: MAX_OUTPUT_TOKENS,
            ...(REASONING_EFFORT !== 'off' ? { reasoning: { effort: REASONING_EFFORT } } : {}),
            response_format: { "type": "json_object" }, 
            messages: [
                {
                    role: "system",
                    content: system_propmt,
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Bu görseldeki faturayı analiz et ve talimatlara uygun şekilde JSON olarak ver.",
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Image}`, 
                            },
                        },
                    ],
                },
            ],
        };

        // Tek bir model denemesi: istek + JSON ayrıştırma.
        // withReasoning=false ise reasoning parametresi gönderilmez (desteklemeyen modeller için).
        const runModel = async (useModel: string, withReasoning = true): Promise<any> => {
            const { reasoning, ...rest } = payload as any;
            const requestBody = withReasoning && reasoning
                ? { ...rest, reasoning, model: useModel }
                : { ...rest, model: useModel };

            const response = await fetchWithRetry("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": process.env.NODE_ENV === 'production'
                        ? `https://${process.env.VERCEL_URL}`
                        : 'http://localhost:3000',
                    "X-Title": process.env.NODE_ENV === 'production' ? 'okibo-analyzer' : 'okibo-analyzer-local',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorText = await response.text();
                // Model reasoning parametresini kabul etmiyorsa parametresiz bir kez daha dene
                if (response.status === 400 && withReasoning && /reasoning/i.test(errorText)) {
                    console.warn(`${useModel}: reasoning parametresi kabul edilmedi, parametresiz deneniyor.`);
                    return runModel(useModel, false);
                }
                throw new Error(`API ${response.status}: ${errorText.slice(0, 300)}`);
            }

            const jsonResponse = await response.json();
            const content = jsonResponse.choices?.[0]?.message?.content;
            const parsed = parseJsonResponse(content);
            if (!parsed) throw new Error('Model yanıtı JSON olarak ayrıştırılamadı');
            return parsed;
        };

        let parsedContent: any;
        let usedModel = model;
        try {
            parsedContent = await runModel(model);
        } catch (primaryError) {
            console.error(`Birincil model (${model}) başarısız:`, primaryError);
            if (!fallbackModel) {
                return new Response(
                    JSON.stringify({ error: "Analiz başarısız oldu ve tanımlı bir yedek model yok." }),
                    { status: 502, headers: { "Content-Type": "application/json" } }
                );
            }
            try {
                console.warn(`Yedek modele düşülüyor: ${fallbackModel}`);
                parsedContent = await runModel(fallbackModel);
                usedModel = fallbackModel;
            } catch (fallbackError) {
                console.error(`Yedek model (${fallbackModel}) de başarısız:`, fallbackError);
                return new Response(
                    JSON.stringify({ error: "Analiz başarısız oldu. Lütfen sayfayı yeniden çekip tekrar deneyin." }),
                    { status: 502, headers: { "Content-Type": "application/json" } }
                );
            }
        }

        return new Response(JSON.stringify(parsedContent), {
            headers: { "Content-Type": "application/json", "X-Model-Used": usedModel },
        });

    } catch (error) {
        console.error("Error processing request:", error);
        return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
    }
}