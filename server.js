// server.js
import express from "express";
import fetch from "node-fetch"; // use global fetch se estiver em Node 18+
import cors from "cors";
import rateLimit from "express-rate-limit";

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("docs")); // serve os arquivos da pasta frontend

// Limita requisições por IP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30,
});
app.use(limiter);

// Função para limpar e validar CNPJ
function onlyNumbers(str) {
  return (str || "").replace(/\D/g, "");
}

function isValidCNPJ(cnpj) {
  cnpj = onlyNumbers(cnpj);
  if (!cnpj || cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;

  const calcDigit = (cnpjArray, pos) => {
    const weights =
      pos === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
      sum += parseInt(cnpjArray[i], 10) * weights[i];
    }
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const digits = cnpj.split("").map((d) => parseInt(d, 10));
  const v1 = calcDigit(digits, 12);
  const v2 = calcDigit(digits, 13);
  return v1 === digits[12] && v2 === digits[13];
}

// Endpoint para validar o CNPJ
app.post("/api/validate-cnpj", async (req, res) => {
  try {
    const { cnpj } = req.body;
    if (!cnpj) return res.status(400).json({ ok: false, message: "CNPJ é obrigatório." });

    const normalized = onlyNumbers(cnpj);
    if (!isValidCNPJ(normalized)) {
      return res.status(400).json({ ok: false, valid: false, message: "CNPJ inválido (checksum)." });
    }

    const url = `https://www.receitaws.com.br/v1/cnpj/${normalized}`;
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    const data = await response.json();

    if (data.status && data.status.toUpperCase() === "ERROR") {
      return res.status(404).json({ ok: false, found: false, message: data.message });
    }

    res.json({ ok: true, found: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "Erro interno", error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Servidor rodando em http://localhost:${PORT}`));
