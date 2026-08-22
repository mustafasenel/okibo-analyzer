import { system_propmt } from '@/lib/system-propmt';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Company'ye atanmış model yoksa kullanılacak varsayılan OpenRouter modeli.
const DEFAULT_OPENROUTER_MODEL = 'qwen/qwen3-vl-8b-instruct';

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

        const arrayBuffer = await image.arrayBuffer();
        const base64Image = Buffer.from(arrayBuffer).toString("base64");
        
        const payload = {
            model: model, 
            max_tokens: 10000,
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

        const response = await fetchWithRetry("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": process.env.NODE_ENV === 'production' 
                    ? `https://${process.env.VERCEL_URL}` 
                    : 'http://localhost:3000', 
                "X-Title": process.env.NODE_ENV === 'production'
                    ? 'okibo-analyzer'
                    : 'okibo-analyzer-local',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("OpenRouter API Error:", errorText);
            return new Response(JSON.stringify({ error: `API request failed with status ${response.status}: ${errorText}` }), { status: 500 });
        }

        const jsonResponse = await response.json();
        const content = jsonResponse.choices[0]?.message?.content;
        
        console.log("🔍 Raw AI Response:");
        console.log(content);
        
        const parsedContent = parseJsonResponse(content);
        
        console.log("🔍 Parsed Content:");
        console.log(JSON.stringify(parsedContent, null, 2));
        
        if (!parsedContent) {
            return new Response(JSON.stringify({ error: "Failed to parse AI response" }), { status: 500 });
        }
        
        // Return the full parsed content for the single image
        return new Response(JSON.stringify(parsedContent), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Error processing request:", error);
        return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
    }
}