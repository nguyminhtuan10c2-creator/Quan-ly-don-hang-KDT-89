import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '25mb' }));

const ai = new GoogleGenAI();

// OCR endpoint for distributor purchase receipts
app.post('/api/ocr-receipt', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType || 'image/jpeg',
              },
            },
            {
              text: `Bạn là trợ lý AI chuyên bóc tách dữ liệu từ phiếu nhập hàng, hóa đơn GTGT hoặc biên bản bàn giao hàng hóa từ nhà phân phối cho cửa hàng Điện Máy & Gia Dụng KDT-89.
Hãy bóc tách thông tin từ ảnh phiếu nhập hàng này và trả về JSON thuần túy (không markdown, không bọc \`\`\`json) với cấu trúc:
{
  "supplierName": "Tên nhà cung cấp / nhà phân phối",
  "receiptNumber": "Số phiếu nhập / Số hóa đơn",
  "date": "YYYY-MM-DD",
  "items": [
    {
      "productName": "Tên sản phẩm chi tiết",
      "sku": "Mã hàng / Model",
      "category": "Tivi | Tủ lạnh | Máy giặt | Quạt | Máy lạnh | Gia dụng",
      "quantity": 10,
      "unit": "Bộ | Cái | Chiếc | Thùng",
      "costPrice": 4500000,
      "suggestedPrice": 5800000,
      "totalAmount": 45000000
    }
  ],
  "totalAmount": 45000000,
  "notes": "Ghi chú nếu có"
}`
            }
          ]
        }
      ]
    });

    const text = response.text || '';
    const cleanJson = text.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
    const parsed = JSON.parse(cleanJson);
    return res.json({ success: true, data: parsed });
  } catch (err: any) {
    console.error('OCR Receipt error:', err);
    return res.status(500).json({ error: err.message || 'Lỗi bóc tách phiếu nhập' });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
