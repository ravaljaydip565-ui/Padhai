export default async function handler(req, res) {
  // 1. CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    // 2. API Key Fix
    let apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'API Key Missing' });
    apiKey = apiKey.trim();

    // 3. Auto-Switch Models Logic
    const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'];
    const { contents, mode, prompt } = req.body;
    
    let successData = null;
    let lastError = null;

    for (const model of models) {
        try {
            console.log(`Trying ${model}...`);
            let url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            let body = { contents, generationConfig: { temperature: 0.7 } };

            if (mode === 'image') {
                url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`;
                body = { instances: [{ prompt }], parameters: { sampleCount: 1 } };
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            if (response.ok) {
                successData = data;
                break; 
            } else {
                lastError = data;
                if (mode === 'image') break;
            }
        } catch (e) { console.error(e); }
    }

    if (successData) return res.status(200).json(successData);
    return res.status(500).json({ error: 'Failed', details: lastError });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
      }
      
