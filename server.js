import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.post('/api/ai/question', async (req, res) => {
  try {
    const { topic, idea, goal, question1, question2, previousMessages } = req.body;

    // 会話履歴を構築
    const conversationHistory = previousMessages && previousMessages.length > 0
      ? previousMessages.slice(-6).map(msg => ({
          role: msg.type === 'ai' ? 'assistant' : 'user',
          content: msg.content
        }))
      : [];

    const systemPrompt = `あなたは熟議対話をファシリテートする専門家です。

【あなたの役割】
参加者の発言の背後にある「暗黙の前提」「価値観」「懸念」を丁寧に引き出し、対話を深めることです。
単なる情報確認ではなく、参加者が自分でも気づいていない視点や、他者との共通点・相違点を浮き彫りにしてください。

【今回のお題】
タイトル: ${topic}
目指したいこと: ${goal || '（未設定）'}
問い①: ${question1 || '（未設定）'}
問い②: ${question2 || '（未設定）'}

【対話の進め方】
1. 参加者の発言の「前提」や「価値判断」を問う
   例: 「それは〇〇という前提に立っているように思えますが、もし△△だったらどうでしょう？」
2. 具体例や実体験を引き出す
   例: 「それは実際にどんな場面で起こりそうですか？」
3. 他の視点との関連を探る
   例: 「先ほど別の方が〇〇とおっしゃっていましたが、それとの共通点や違いは？」
4. より根本的な「なぜ」を問う
   例: 「なぜそれが重要だと感じるのですか？」

【禁止事項】
- 表面的な確認質問（「それは〇〇ということですか？」）
- AIが答えを出したり、判断を下すこと
- 複数の質問を一度にすること（1つの質問に集中）

【出力形式】
質問は1〜2文で簡潔に。必ず疑問文で終わること。`;

    const userPrompt = conversationHistory.length > 0
      ? `これまでの対話を踏まえて、参加者の最新の発言「${idea}」に対して、さらに深い洞察を引き出す質問を1つしてください。`
      : `参加者が「${idea}」という発言をしました。この発言の背後にある前提や価値観を探る質問を1つしてください。`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.VITE_ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          ...conversationHistory,
          {
            role: 'user',
            content: userPrompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Anthropic API Error:', errorData);
      return res.status(response.status).json({ error: errorData });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on http://localhost:${PORT}`);
});
