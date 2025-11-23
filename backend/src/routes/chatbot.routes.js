// backend/src/routes/chatbot.routes.js
import express from "express";
import OpenAI from "openai";
import { pool } from "../config/db.js";

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/chatbot
 * body: { message, usuario_documento, usuario_nombre }
 */
router.post("/", async (req, res) => {
  const { message, usuario_documento, usuario_nombre } = req.body;

  if (!message || !usuario_documento) {
    return res.status(400).json({ reply: "Faltan datos en la petición." });
  }

  try {
    // ------------------------------------------------------------
    // 1) DETECTAR INTENCIÓN
    // ------------------------------------------------------------
    const detectPrompt = `
Eres Finyx, un asistente financiero que decide si debe leer/escribir
datos REALES en la base de datos para contestar la petición del usuario.

El usuario se llama: **${usuario_nombre}**.
Si vas a hablar con él, puedes usar su nombre de forma natural, amigable y profesional
(por ejemplo: "Miguel, según tus datos..." o "Miguel, veo que tus gastos han subido").
Pero NUNCA uses el nombre dentro del JSON ni en respuestas de intención SQL.

RESPONDE DE LA SIGUIENTE FORMA:

- Si la petición REQUIERE acceso a la BD (consultar ingresos, gastos, listar transacciones, crear transacción, crear meta, listar metas, analizar datos reales),
  RESPONDE EXCLUSIVAMENTE con un JSON válido (sin texto adicional) con esta estructura EXACTA:

{
  "action": "consulta_balance" | "consulta_categoria" | "listar_transacciones" |
             "crear_transaccion" | "consulta_ingresos" | "consulta_gastos" |
             "analisis_finanzas" | "listar_metas" | "crear_meta" | "none",
  "categoria": "",
  "tipo": "",
  "monto": "",
  "descripcion": "",
  "nombre_meta": "",
  "monto_meta": "",
  "limit": "",
  "requiereSQL": true | false
}

- Si NO requiere SQL -> responde en TEXTO SIMPLE (no JSON).
- Preguntas como “¿Por qué gasté tanto este mes?” y “¿Cómo puedo ahorrar?” -> requieren SQL → "analisis_finanzas".
- Cuando uses JSON, no agregues texto fuera del JSON.
- Debes usar nombres de categorías, NO IDs.
`;

    const detectResp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: detectPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.0,
      max_tokens: 400,
    });

    const detectText = (detectResp.choices?.[0]?.message?.content || "").trim();

    let intent = null;
    if (detectText.startsWith("{") && detectText.endsWith("}")) {
      try {
        intent = JSON.parse(detectText);
      } catch {}
    }

    if (!intent || !intent.requiereSQL || intent.action === "none") {
      return res.json({ reply: detectText || "Lo siento, no entendí tu solicitud." });
    }

    // ------------------------------------------------------------
    // 2) EJECUTAR SQL SEGÚN ACCIÓN
    // ------------------------------------------------------------

    let dataForReasoning = {
      action: intent.action,
      totals: {},
      transactions: [],
      metas: [],
      categoryFound: null,
      created: false,
      createdMeta: false
    };

    const limit = intent.limit && !isNaN(Number(intent.limit)) ? Number(intent.limit) : 5;

    switch (intent.action) {

      // ---------------------- INGRESOS ----------------------
      case "consulta_ingresos": {
        const q = await pool.query(
          `SELECT COALESCE(SUM(monto),0) AS total_ingresos
           FROM transacciones
           WHERE usuario_documento = $1 AND LOWER(tipo) = 'ingreso'`,
          [usuario_documento]
        );
        dataForReasoning.totals.ingresos = parseFloat(q.rows[0].total_ingresos);
        break;
      }

      // ---------------------- GASTOS ----------------------
      case "consulta_gastos": {
        const q = await pool.query(
          `SELECT COALESCE(SUM(monto),0) AS total_gastos
           FROM transacciones
           WHERE usuario_documento = $1 AND LOWER(tipo) = 'gasto'`,
          [usuario_documento]
        );
        dataForReasoning.totals.gastos = parseFloat(q.rows[0].total_gastos);
        break;
      }

      // ---------------------- BALANCE ----------------------
      case "consulta_balance": {
        const q = await pool.query(
          `SELECT COALESCE(SUM(CASE WHEN LOWER(tipo)='ingreso' THEN monto ELSE -monto END),0) AS balance
           FROM transacciones
           WHERE usuario_documento = $1`,
          [usuario_documento]
        );
        dataForReasoning.totals.balance = parseFloat(q.rows[0].balance);
        break;
      }

      // ---------------------- CONSULTA POR CATEGORÍA ----------------------
      case "consulta_categoria": {
        const catName = (intent.categoria || "").trim();
        if (!catName) return res.json({ reply: "Debes indicar la categoría." });

        const catQ = await pool.query(
          `SELECT id, nombre FROM categorias 
           WHERE (usuario_documento = $1 OR usuario_documento IS NULL)
             AND LOWER(nombre) = LOWER($2)
           LIMIT 1`,
          [usuario_documento, catName]
        );

        if (catQ.rows.length === 0) {
          return res.json({ reply: `No encontré la categoría "${catName}".` });
        }

        const catId = catQ.rows[0].id;
        dataForReasoning.categoryFound = catQ.rows[0].nombre;

        const q = await pool.query(
          `SELECT COALESCE(SUM(monto),0) AS total
           FROM transacciones
           WHERE usuario_documento = $1 AND categoria_id = $2`,
          [usuario_documento, catId]
        );

        dataForReasoning.totals.category_total = parseFloat(q.rows[0].total);

        const rows = await pool.query(
          `SELECT tipo, monto, descripcion, fecha
           FROM transacciones
           WHERE usuario_documento = $1 AND categoria_id = $2
           ORDER BY fecha DESC
           LIMIT 5`,
          [usuario_documento, catId]
        );

        dataForReasoning.transactions = rows.rows;
        break;
      }

      // ---------------------- LISTAR TRANSACCIONES ----------------------
      case "listar_transacciones": {
        const rows = await pool.query(
          `SELECT t.tipo, t.monto, t.descripcion, t.fecha, c.nombre AS categoria
           FROM transacciones t
           LEFT JOIN categorias c ON c.id = t.categoria_id
           WHERE t.usuario_documento = $1
           ORDER BY fecha DESC
           LIMIT $2`,
          [usuario_documento, limit]
        );
        dataForReasoning.transactions = rows.rows;
        break;
      }

      // ---------------------- CREAR TRANSACCIÓN ----------------------
      case "crear_transaccion": {
        const nombreCat = (intent.categoria || "").trim();
        if (!nombreCat) return res.json({ reply: "Debes indicar la categoría." });

        const catQ = await pool.query(
          `SELECT id FROM categorias
           WHERE (usuario_documento = $1 OR usuario_documento IS NULL)
             AND LOWER(nombre) = LOWER($2)
           LIMIT 1`,
          [usuario_documento, nombreCat]
        );

        if (catQ.rows.length === 0) {
          return res.json({ reply: `No existe la categoría "${nombreCat}".` });
        }

        const categoriaId = catQ.rows[0].id;
        const tipo = intent.tipo.toLowerCase();
        const monto = parseFloat(intent.monto || 0);
        const descripcion = intent.descripcion || "";

        if (!["ingreso", "gasto"].includes(tipo)) {
          return res.json({ reply: "Tipo inválido (ingreso/gasto)." });
        }
        if (isNaN(monto) || monto <= 0) {
          return res.json({ reply: "Monto inválido." });
        }

        await pool.query(
          `INSERT INTO transacciones (usuario_documento, categoria_id, tipo, monto, descripcion, fecha)
           VALUES ($1,$2,$3,$4,$5,NOW())`,
          [usuario_documento, categoriaId, tipo, monto, descripcion]
        );

        dataForReasoning.created = true;
        dataForReasoning.createdTransaction = {
          tipo,
          monto,
          descripcion,
          categoria: nombreCat,
        };
        
        break;
      }

      // ---------------------- LISTAR METAS ----------------------
      case "listar_metas": {
        const q = await pool.query(
          `SELECT id, nombre, monto_objetivo
           FROM metas_ahorro
           WHERE usuario_documento = $1
           ORDER BY id DESC`,
          [usuario_documento]
        );
        dataForReasoning.metas = q.rows;
        break;
      }

      // ---------------------- CREAR META ----------------------
      case "crear_meta": {
        const nombre_meta = (intent.nombre_meta || "").trim();
        const monto_meta = parseFloat(intent.monto_meta || 0);

        if (!nombre_meta) {
          return res.json({ reply: "Debes indicar el nombre de la meta." });
        }
        if (isNaN(monto_meta) || monto_meta <= 0) {
          return res.json({ reply: "El monto de la meta es inválido." });
        }

        await pool.query(
          `INSERT INTO metas_ahorro (usuario_documento, nombre, monto_objetivo)
           VALUES ($1, $2, $3)`,
          [usuario_documento, nombre_meta, monto_meta]
        );

        dataForReasoning.createdMeta = true;
        dataForReasoning.newMeta = {
          nombre: nombre_meta,
          monto_objetivo: monto_meta,
        };

        break;
      }

      // ---------------------- ANÁLISIS DE FINANZAS ----------------------
      case "analisis_finanzas": {
        const ingresosQ = await pool.query(
          `SELECT COALESCE(SUM(monto),0) AS total
           FROM transacciones 
           WHERE usuario_documento=$1 AND LOWER(tipo)='ingreso'`,
          [usuario_documento]
        );

        const gastosQ = await pool.query(
          `SELECT COALESCE(SUM(monto),0) AS total
           FROM transacciones 
           WHERE usuario_documento=$1 AND LOWER(tipo)='gasto'`,
          [usuario_documento]
        );

        const rowsQ = await pool.query(
          `SELECT t.tipo, t.monto, t.descripcion, t.fecha, c.nombre AS categoria
           FROM transacciones t
           LEFT JOIN categorias c ON c.id = t.categoria_id
           WHERE t.usuario_documento = $1
           ORDER BY fecha DESC
           LIMIT 10`,
          [usuario_documento]
        );

        dataForReasoning.totals.ingresos = parseFloat(ingresosQ.rows[0].total);
        dataForReasoning.totals.gastos = parseFloat(gastosQ.rows[0].total);
        dataForReasoning.transactions = rowsQ.rows;
        break;
      }

      // ------------------------------------------------------
      default:
        return res.json({ reply: "No entendí la acción solicitada." });
    }

    // ------------------------------------------------------------
    // 3) RAZONAMIENTO FINAL CON IA
    // ------------------------------------------------------------

    const dataSummaryLines = [];

    if (dataForReasoning.totals.ingresos !== undefined)
      dataSummaryLines.push(`Ingresos: ${dataForReasoning.totals.ingresos}`);

    if (dataForReasoning.totals.gastos !== undefined)
      dataSummaryLines.push(`Gastos: ${dataForReasoning.totals.gastos}`);

    if (dataForReasoning.totals.balance !== undefined)
      dataSummaryLines.push(`Balance: ${dataForReasoning.totals.balance}`);

    if (dataForReasoning.totals.category_total !== undefined)
      dataSummaryLines.push(
        `Total en categoría (${dataForReasoning.categoryFound}): ${dataForReasoning.totals.category_total}`
      );

    if (dataForReasoning.created)
      dataSummaryLines.push(
        `Transacción creada: ${JSON.stringify(dataForReasoning.createdTransaction)}`
      );

    if (dataForReasoning.createdMeta)
      dataSummaryLines.push(
        `Meta creada: ${JSON.stringify(dataForReasoning.newMeta)}`
      );

    const txLines = dataForReasoning.transactions.map((t, i) => {
      const fecha = t.fecha
        ? new Date(t.fecha).toLocaleDateString("es-CO")
        : "-";
      return `${i + 1}. ${t.tipo.toUpperCase()} — $${t.monto} — ${
        t.categoria || "Sin categoría"
      } — ${t.descripcion || "-"} — ${fecha}`;
    });

    const metaLines = dataForReasoning.metas.map((m, i) => {
      return `${i + 1}. ${m.nombre} — Objetivo: $${m.monto_objetivo}`;
    });

    const reasoningSystem = `
Eres Finyx, un asistente financiero amigable. 
El usuario se llama ${usuario_nombre}. Úsalo de forma cordial y profesional,
solo en respuestas de texto, nunca dentro de JSON.

REGLAS:
- Si se creó una transacción O una meta:
    → Respuesta corta (1 o 2 frases).
    → Solo confirmación + micro recomendación.
- Si NO se creó transacción (consultas, análisis, explicaciones), entonces puedes dar una respuesta más completa basada en los datos.
- Nunca devuelvas JSON aquí.
`;

    const reasoningUser = `
Pregunta del usuario: ${message}

Datos:
${dataSummaryLines.join("\n")}

Transacciones:
${txLines.join("\n")}

Metas:
${metaLines.join("\n")}
`;

    const reasoningResp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: reasoningSystem },
        { role: "user", content: reasoningUser },
      ],
      temperature: 0.7,
      max_tokens: 450,
    });

    const finalText =
      reasoningResp.choices?.[0]?.message?.content?.trim() ||
      "No pude generar una respuesta clara.";

    // ------------------------------------------------------------
    // RESPUESTA FINAL
    // ------------------------------------------------------------
    res.json({
      reply: finalText,
      created: !!dataForReasoning.created,
      createdMeta: !!dataForReasoning.createdMeta,
      createdTransaction: dataForReasoning.createdTransaction || null,
      newMeta: dataForReasoning.newMeta || null
    });

  } catch (err) {
    console.error("ERROR CHATBOT:", err);
    return res.status(500).json({ reply: "Error interno del chatbot." });
  }
});

export default router;
