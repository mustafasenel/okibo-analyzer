import { system_propmt } from '@/lib/system-propmt';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ error: 'Görsel verisi bulunamadı.' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'API anahtarı bulunamadı.' }, { status: 500 });
    }

    const payload = {
      model: "mistralai/mistral-small-3.2-24b-instruct:free", 
      max_tokens: 10000,
      // Bu parametre, destekleyen modellere sadece JSON göndermesini söyler.
      response_format: { "type": "json_object" }, 
      messages: [
        {
          role: "system",
          content: system_propmt, // Harici dosyadan prompt'u kullanıyoruz
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
                url: image, 
              },
            },
          ],
        },
      ],
    };

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000", 
        "X-Title": "Next.js Invoice Extractor",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("OpenRouter API Hatası:", errorData);
        return NextResponse.json({ error: `API Hatası: ${response.statusText}`, details: errorData }, { status: response.status });
    }

    const data = await response.json();
    const rawContent = data.choices[0]?.message?.content;

    if (!rawContent) {
        return NextResponse.json({ error: "API'den geçerli bir cevap alınamadı." }, { status: 500 });
    }

    // --- BURASI EN ÖNEMLİ KISIM: JSON AYIKLAMA VE PARSE ETME ---
 try {
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);

        if (!jsonMatch || !jsonMatch[0]) {
            return NextResponse.json({ error: "API cevabında geçerli bir JSON bloğu bulunamadı.", rawData: rawContent }, { status: 500 });
        }

        const jsonString = jsonMatch[0];
        
        // Temizlenmiş JSON string'ini JavaScript nesnesine çevir
        const parsedJson = JSON.parse(jsonString);

        return NextResponse.json({ result: parsedJson });

    } catch (e: any) { // <-- DEĞİŞİKLİK 1: e'nin tipini 'any' yapıyoruz
        // --- DEĞİŞİKLİK 2: HATAYI VE BOZUK VERİYİ KONSOLA YAZDIRIYORUZ ---
        console.error("----------- JSON PARSE HATASI -----------");
        console.error("Hata Mesajı:", e.message);
        console.error("----------- BOZUK JSON VERİSİ -----------");
        // Hatanın olduğu yeri daha kolay bulmak için rawContent'i yazdırıyoruz
        console.log(rawContent); 
        console.error("-----------------------------------------");

        // Frontend'e daha detaylı bir hata mesajı gönderiyoruz
        return NextResponse.json({ 
            error: "API'den gelen veri JSON formatında değil. Lütfen terminal loglarını kontrol edin.", 
            rawData: rawContent 
        }, { status: 500 });
    }
    // --- JSON İŞLEME KISMININ SONU ---

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Sunucuda bir hata oluştu.' }, { status: 500 });
  }
}