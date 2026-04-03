import { formidable } from "formidable";
import fs from "fs";
import mammoth from "mammoth";
import Groq from "groq-sdk";

export const config = {
  api: {
    bodyParser: false
  }
};

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

async function extractText(filePath, type) {

  if (type?.includes("word")) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  if (type?.includes("pdf")) {
    // Simple fallback without native dependencies
    const buffer = fs.readFileSync(filePath);
    return buffer.toString("utf8");
  }

  return fs.readFileSync(filePath, "utf8");
}

function chunkText(text, size = 5000) {

  const chunks = [];

  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }

  return chunks;
}

function extractJSON(str) {

  try {

    const start = str.indexOf("[");
    const end = str.lastIndexOf("]");

    if (start !== -1 && end !== -1) {
      return JSON.parse(str.slice(start, end + 1));
    }

    return [];

  } catch {
    return [];
  }
}

function removeDuplicates(faqs) {

  const seen = new Set();

  return faqs.filter(f => {

    const key = f.question?.toLowerCase();

    if (!key) return false;
    if (seen.has(key)) return false;

    seen.add(key);

    return true;

  });
}

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = formidable({
    maxFileSize: 10 * 1024 * 1024
  });

  form.parse(req, async (err, fields, files) => {

    try {

      if (err) {
        return res.status(500).json({ error: "Upload failed" });
      }

      const file = files.file?.[0] || files.file;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const filePath = file.filepath || file.path;
      const mimeType = file.mimetype || file.type;

      const text = await extractText(filePath, mimeType);

      if (!text || text.length < 20) {
        return res.status(400).json({ error: "Document empty or unreadable" });
      }

      const chunks = chunkText(text);

      let allFaqs = [];

      for (const chunk of chunks) {

        const prompt = `
Generate business FAQs from this document.

Return STRICT JSON format:

[
{
"question":"",
"answer":"",
"keywords":[]
}
]
`;

        const completion = await groq.chat.completions.create({
          model: "llama-3.1-8b-instant",
          temperature: 0.2,
          messages: [
            { role: "system", content: "You generate business FAQs." },
            { role: "user", content: prompt + chunk }
          ]
        });

        const output = completion?.choices?.[0]?.message?.content || "";

        const parsed = extractJSON(output);

        allFaqs = allFaqs.concat(parsed);
      }

      const cleaned = removeDuplicates(allFaqs);

      return res.status(200).json({
        faqs: cleaned
      });

    } catch (error) {

      console.error("FAQ generation error:", error);

      return res.status(500).json({
        error: "FAQ generation failed"
      });

    }

  });

}