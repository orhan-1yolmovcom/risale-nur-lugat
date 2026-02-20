/* ===== Vercel Serverless Function — /api/ocr ===== */
// Proxies image OCR requests to OpenAI server-side.
// Eliminates browser CORS restrictions and keeps the API key secret.

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
  }

  const { base64, width, height } = req.body || {};
  if (!base64) {
    return res.status(400).json({ error: 'base64 image required' });
  }

  const body = {
    model: 'gpt-4o-mini',
    temperature: 0,
    max_tokens: 1500,
    messages: [
      {
        role: 'system',
        content:
          'Sen gelişmiş bir OCR Asistanısın.\n' +
          'Görevin yalnızca görseldeki metni okumak ve JSON formatında döndürmektir.\n' +
          'Kurallar:\n' +
          '1. Görseldeki tüm metni en yüksek doğrulukla çıkart.\n' +
          '2. Harf düzeltme, yorum, tahmin veya açıklama yapma.\n' +
          '3. Sadece gördüğün kelimeleri ham şekilde çıkar.\n' +
          '4. Osmanlıca/Türkçe ayrımı yapma, gördüğün gibi yaz.\n' +
          '5. Metni mümkün olduğunca satır bazlı çıkar.\n' +
          '6. SADECE JSON döndür — başka hiçbir şey yazma.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              'Aşağıdaki görseldeki metni oku. YALNIZCA şu JSON formatında yanıt ver — başka hiçbir şey yazma:\n\n' +
              '{"full_text":"OCR ile elde edilen tam metin","lines":[["kelime1","kelime2"],["kelime3","kelime4"]]}\n\n' +
              '- Kelimeleri normalize etme.\n' +
              '- Harf düzeltme yapma.\n' +
              '- Osmanlıca-Türkçe ayırma.\n' +
              '- Sadece gördüğünü aynen çıkar.',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64}`,
              detail: 'auto',
            },
          },
        ],
      },
    ],
  };

  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: data?.error?.message || 'OpenAI API error',
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
