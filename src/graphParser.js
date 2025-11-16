// src/graphParser.js
// parseGraphInput(rawText, options)
// options: { weighted: boolean, directed: boolean, inputMode: 'plain'|'array' }
// Returns: { nodesArr, edgesArr, adjacency, edgeKeyToId, isDirected }

function normalizeEdgeKey(u, v, isDirected) {
  if (isDirected) return `${u}->${v}`;
  return [u, v].sort().join("--");
}

// Helper: attempt robust JSON parse of the first bracketed expression (balanced)
// returns parsed object or throws
function extractAndParseFirstBracketed(raw) {
  const s = String(raw);
  const firstIdx = s.indexOf("[");
  if (firstIdx === -1) throw new Error("No '[' found");
  let depth = 0;
  let endIdx = -1;
  for (let i = firstIdx; i < s.length; i++) {
    const ch = s[i];
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) {
        endIdx = i;
        break;
      }
    }
  }
  if (endIdx === -1)
    throw new Error("No matching closing bracket found for '['");
  const substring = s.slice(firstIdx, endIdx + 1);
  return JSON.parse(substring);
}

// convert potential numeric/string token to number if possible (weights), else return as-is
function toNumberIfPossible(val) {
  if (typeof val === "number") return val;
  if (typeof val !== "string") return null;
  const s = val.trim();
  if (s === "") return null;
  if (/^0x[0-9a-f]+$/i.test(s)) return parseInt(s, 16);
  if (/^0b[01]+$/i.test(s)) return parseInt(s, 2);
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Main parser
 */
export function parseGraphInput(
  rawText,
  options = { weighted: false, directed: false, inputMode: "plain" }
) {
  const weighted = Boolean(options.weighted);
  const directed = Boolean(options.directed);
  const inputMode = options.inputMode || "plain";

  // output structures
  const adjacency = {};
  const edgeKeyToId = {};
  const nodesSet = new Set();
  const edgesArr = [];
  let edgeIdCounter = 0;

  // Helper to add edge (fromId and toId expected as strings)
  function addEdge(fromId, toId, weight) {
    const w = weighted
      ? Number.isFinite(Number(weight))
        ? Number(Number(weight))
        : 1
      : Number.isFinite(Number(weight))
      ? Number(weight)
      : undefined;
    const edgeObj = {
      id: edgeIdCounter,
      from: String(fromId),
      to: String(toId),
    };
    if (weighted) edgeObj.label = String(w === undefined ? 1 : w);
    if (directed) edgeObj.arrows = "to";
    edgesArr.push(edgeObj);

    const key = normalizeEdgeKey(String(fromId), String(toId), directed);
    edgeKeyToId[key] = edgeIdCounter;

    // adjacency
    adjacency[String(fromId)] = adjacency[String(fromId)] || [];
    adjacency[String(fromId)].push({
      to: String(toId),
      weight: w === undefined ? 1 : w,
      edgeId: edgeIdCounter,
    });

    if (!directed) {
      adjacency[String(toId)] = adjacency[String(toId)] || [];
      adjacency[String(toId)].push({
        to: String(fromId),
        weight: w === undefined ? 1 : w,
        edgeId: edgeIdCounter,
      });
    }

    nodesSet.add(String(fromId));
    nodesSet.add(String(toId));

    edgeIdCounter++;
  }

  if (inputMode === "array") {
    // Try to parse JSON or extract bracketed array
    let parsed = null;
    try {
      // try direct JSON.parse (in case user provided full JSON)
      parsed = JSON.parse(rawText);
    } catch (e) {
      try {
        parsed = extractAndParseFirstBracketed(rawText);
      } catch (e2) {
        // final fallback: try to find "edges = ..." pattern
        const match = rawText.match(/edges\s*=\s*(\[.*)/s);
        if (match) {
          try {
            parsed = JSON.parse(match[1]);
          } catch (_) {
            // can't parse
            parsed = null;
          }
        }
      }
    }

    if (!parsed) {
      // could still be something like "nums = [1,2,3]" where bracketed JSON was malformed — return error
      throw new Error(
        "Failed to parse array-style input. Ensure it's valid JSON array-like text (e.g. [[1,2],[2,3]])."
      );
    }

    // If parsed is an object and has 'edges' or 'graph' or similar, try to extract
    if (
      !Array.isArray(parsed) &&
      typeof parsed === "object" &&
      parsed !== null
    ) {
      if (Array.isArray(parsed.edges)) parsed = parsed.edges;
      else if (Array.isArray(parsed.graph)) parsed = parsed.graph;
      else {
        // try to find first array property
        const arrProp = Object.keys(parsed).find((k) =>
          Array.isArray(parsed[k])
        );
        if (arrProp) parsed = parsed[arrProp];
        else {
          // not an array we can interpret
          throw new Error(
            "Parsed JSON is an object but no array-property found to interpret as edges or adjacency."
          );
        }
      }
    }

    if (!Array.isArray(parsed)) {
      throw new Error("Array-mode parsing did not result in an array.");
    }

    // Decide if parsed is edges-list (array of arrays with length>=2)
    const isEdgesList =
      parsed.length > 0 &&
      parsed.every((el) => Array.isArray(el) && el.length >= 2);
    const isAdjList =
      parsed.length > 0 && parsed.every((el) => Array.isArray(el));

    if (isEdgesList) {
      // each entry: [u,v] or [u,v,w]
      for (const entry of parsed) {
        const uRaw = entry[0];
        const vRaw = entry[1];
        const wRaw = entry.length >= 3 ? entry[2] : undefined;
        // convert u,v to string ids (support numbers or strings)
        const u =
          typeof uRaw === "number" || typeof uRaw === "string"
            ? String(uRaw)
            : String(uRaw);
        const v =
          typeof vRaw === "number" || typeof vRaw === "string"
            ? String(vRaw)
            : String(vRaw);
        const w = wRaw === undefined ? undefined : toNumberIfPossible(wRaw);
        addEdge(u, v, w);
      }
    } else if (isAdjList) {
      // adjacency list-style array: index i's array contains neighbors of node i
      // we'll treat node ids as indices (0-based) as strings
      for (let i = 0; i < parsed.length; i++) {
        const neigh = parsed[i];
        if (!Array.isArray(neigh)) continue;
        for (const vRaw of neigh) {
          const u = String(i);
          const v =
            typeof vRaw === "number" || typeof vRaw === "string"
              ? String(vRaw)
              : String(vRaw);
          addEdge(u, v, undefined);
        }
      }
    } else {
      // If array elements are not arrays but maybe array is list of pairs encoded differently, try to parse flatten
      throw new Error(
        "Unrecognized array structure. Expected array of edges (e.g. [[u,v],[u,v,w],...]) or adjacency-list (e.g. [[1,2],[2],[0]])."
      );
    }
  } else {
    // Plain text parser (existing behavior)
    const lines = String(rawText)
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l !== "");
    for (const line of lines) {
      if (line.includes(":")) {
        // adjacency list style
        const [nodePart, neighborsPart] = line.split(":");
        const from = nodePart.trim();
        nodesSet.add(String(from));
        const neighbors = neighborsPart.trim().split(/\s+/).filter(Boolean);
        for (const tok of neighbors) {
          if (!tok) continue;
          // neighbor could be "v-w" or "v"
          if (tok.includes("-")) {
            const [vRaw, wRaw] = tok.split("-");
            const to = vRaw.trim();
            const w = weighted
              ? toNumberIfPossible(wRaw) ?? 1
              : toNumberIfPossible(wRaw) ?? 1;
            addEdge(from, to, w);
          } else {
            const to = tok.trim();
            addEdge(from, to, undefined);
          }
        }
      } else {
        // edge list: "u v [w]"
        const parts = line.split(/\s+/).filter(Boolean);
        if (parts.length < 2) continue;
        const u = parts[0];
        const v = parts[1];
        const wRaw = parts.length >= 3 ? parts[2] : undefined;
        const w = wRaw === undefined ? undefined : toNumberIfPossible(wRaw);
        addEdge(u, v, w);
      }
    }
  }

  // create nodes array
  const nodesArr = Array.from(nodesSet).map((id) => ({
    id: id,
    label: String(id),
  }));

  return {
    nodesArr,
    edgesArr,
    adjacency,
    edgeKeyToId,
    isDirected: directed,
  };
}
