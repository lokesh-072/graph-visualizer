// src/calculators.js
// Plain-text parsing for a list of numbers, bitwise combine functions, and decimal<->binary converters.

// parse a single token into integer (supports decimal, 0x-hex, 0b-binary)
function parseSingleNumberToken(tok) {
  if (tok === null || tok === undefined) return null;
  const s = String(tok).trim();
  if (s === "") return null;
  // allow optional leading '+' or '-'
  const sign = s[0] === "-" ? -1 : 1;
  const unsigned = s[0] === "-" || s[0] === "+" ? s.slice(1) : s;
  if (/^0x[0-9a-f]+$/i.test(unsigned)) return sign * parseInt(unsigned, 16);
  if (/^0b[01]+$/i.test(unsigned)) return sign * parseInt(unsigned, 2);
  const n = Number(unsigned);
  return Number.isFinite(n) ? sign * Math.trunc(n) : null;
}

// parse plain text tokens (spaces / commas / tabs)
function parsePlainList(raw) {
  if (raw === null || raw === undefined)
    return { ok: false, message: "No input" };
  const tokens = raw
    .split(/[, \t]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) return { ok: false, message: "No numbers found" };
  const nums = [];
  for (const tok of tokens) {
    const n = parseSingleNumberToken(tok);
    if (n === null) return { ok: false, message: `Invalid token: "${tok}"` };
    nums.push(n);
  }
  return { ok: true, nums };
}

// combine list of numbers using reducer left-to-right
function combineList(raw, reducer) {
  const parsed = parsePlainList(raw);
  if (!parsed.ok) return parsed;
  const arr = parsed.nums;
  if (arr.length === 0) return { ok: false, message: "No numbers to combine" };
  let acc = arr[0];
  for (let i = 1; i < arr.length; i++) acc = reducer(acc, arr[i]);
  return { ok: true, result: acc, inputs: arr };
}

export function computeAndList(raw) {
  return combineList(raw, (a, b) => a & b);
}

export function computeOrList(raw) {
  return combineList(raw, (a, b) => a | b);
}

export function computeXorList(raw) {
  return combineList(raw, (a, b) => a ^ b);
}

// Decimal -> binary converter: accepts single token or uses first token from raw
export function decToBinary(raw) {
  if (raw === null || raw === undefined)
    return { ok: false, message: "No input" };
  const trimmed = String(raw).trim();
  if (trimmed === "") return { ok: false, message: "No input" };
  // take first token (split spaces/commas)
  const first = trimmed.split(/[, \t]+/)[0];
  const n = parseSingleNumberToken(first);
  if (n === null) return { ok: false, message: `Invalid number: "${first}"` };
  if (n < 0) {
    return { ok: true, input: n, binary: "-" + Math.abs(n).toString(2) };
  } else {
    return { ok: true, input: n, binary: n.toString(2) };
  }
}

// Binary -> decimal converter: accepts single token or uses first token from raw
// Accepts formats like "0b1010", "1010", optionally with leading '+' or '-'
export function binToDecimal(raw) {
  if (raw === null || raw === undefined)
    return { ok: false, message: "No input" };
  const trimmed = String(raw).trim();
  if (trimmed === "") return { ok: false, message: "No input" };
  const first = trimmed.split(/[, \t]+/)[0];
  if (!first) return { ok: false, message: "No input token" };
  // handle optional sign
  const sign = first[0] === "-" ? -1 : 1;
  const unsigned =
    first[0] === "-" || first[0] === "+" ? first.slice(1) : first;
  // allow optional 0b prefix
  const token =
    unsigned.startsWith("0b") || unsigned.startsWith("0B")
      ? unsigned.slice(2)
      : unsigned;
  if (!/^[01]+$/.test(token))
    return { ok: false, message: `Invalid binary token: "${first}"` };
  const val = parseInt(token, 2);
  return { ok: true, input: first, decimal: sign * val };
}
