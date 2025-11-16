// src/ui.js
import { parseGraphInput } from "./graphParser.js";
import { dijkstraPQ, primMST } from "./algorithms.js";
import {
  createNetwork,
  resetHighlights,
  highlightPath,
  highlightMST,
} from "./visManager.js";
import {
  computeAndList,
  computeOrList,
  computeXorList,
  decToBinary,
  binToDecimal,
} from "./calculators.js";

export function initUI() {
  // DOM elements
  const graphInput = document.getElementById("graph-input");
  const generateBtn = document.getElementById("generate-btn");
  const resetBtn = document.getElementById("reset-btn");
  const weightedCheckbox = document.getElementById("weighted-checkbox");
  const graphContainer = document.getElementById("graph-container");
  const dijkstraSourceInput = document.getElementById("dijkstra-source");
  const dijkstraTargetInput = document.getElementById("dijkstra-target");
  const dijkstraRunBtn = document.getElementById("dijkstra-run");
  const primStartInput = document.getElementById("prim-start");
  const primRunBtn = document.getElementById("prim-run");
  const dijkstraResultDiv = document.getElementById("dijkstra-result");
  const primResultDiv = document.getElementById("prim-result");

  // graph input mode radios
  const graphModePlain = document.getElementById("graph-mode-plain");
  const graphModeArray = document.getElementById("graph-mode-array");

  // calculator DOM refs (plain text only)
  const calcListInput = document.getElementById("calc-list");
  const calcAndBtn = document.getElementById("calc-and");
  const calcOrBtn = document.getElementById("calc-or");
  const calcXorBtn = document.getElementById("calc-xor");
  const decToBinBtn = document.getElementById("dec-to-bin");
  const binToDecBtn = document.getElementById("bin-to-dec");
  const calcResultDiv = document.getElementById("calc-result");

  // state
  let parsed = null; // will hold result of parseGraphInput
  let visHandles = null;

  function renderParsedGraph() {
    if (!parsed) return;
    visHandles = createNetwork(
      graphContainer,
      parsed.nodesArr,
      parsed.edgesArr,
      parsed.isDirected
    );
    dijkstraResultDiv.innerHTML = "";
    primResultDiv.innerHTML = "";
    calcResultDiv.innerHTML = "";
  }

  generateBtn.addEventListener("click", () => {
    const raw = graphInput.value || "";
    const weighted = weightedCheckbox.checked;
    const directed =
      document.querySelector('input[name="direction"]:checked').value ===
      "directed";
    const inputMode =
      graphModeArray && graphModeArray.checked ? "array" : "plain";

    try {
      parsed = parseGraphInput(raw, { weighted, directed, inputMode });
    } catch (err) {
      alert(
        "Failed to parse graph input: " +
          (err && err.message ? err.message : String(err))
      );
      return;
    }

    if (!parsed.nodesArr.length) {
      alert("No nodes parsed. Check input format.");
      return;
    }
    renderParsedGraph();
  });

  resetBtn.addEventListener("click", () => {
    resetHighlights();
    dijkstraResultDiv.innerHTML = "";
    primResultDiv.innerHTML = "";
    calcResultDiv.innerHTML = "";
  });

  dijkstraRunBtn.addEventListener("click", () => {
    if (!parsed) {
      dijkstraResultDiv.innerText = "Generate a graph first.";
      return;
    }
    const src = dijkstraSourceInput.value.trim();
    const tgt = dijkstraTargetInput.value.trim();
    if (!src || !tgt) {
      dijkstraResultDiv.innerText = "Provide both source and target node ids.";
      return;
    }
    const nodesIterable = parsed.nodesArr.map((n) => n.id);
    const res = dijkstraPQ(
      parsed.adjacency,
      parsed.edgeKeyToId,
      parsed.isDirected,
      src,
      tgt,
      nodesIterable
    );
    if (!res || !res.path.length) {
      dijkstraResultDiv.innerText = `No path found from ${src} to ${tgt}.`;
      resetHighlights();
      return;
    }
    highlightPath(res.path, res.edgeIds);
    dijkstraResultDiv.innerHTML = `<strong>Path</strong>: ${res.path.join(
      " → "
    )}<br/><strong>Distance</strong>: ${res.distance}`;
  });

  primRunBtn.addEventListener("click", () => {
    if (!parsed) {
      primResultDiv.innerText = "Generate a graph first.";
      return;
    }
    const start = primStartInput.value.trim() || null;
    const nodesIterable = parsed.nodesArr.map((n) => n.id);
    const res = primMST(parsed.adjacency, nodesIterable, start);
    if (!res || !res.edgeIds.length) {
      primResultDiv.innerText = `MST not found or graph too small/disconnected.`;
      resetHighlights();
      return;
    }
    highlightMST(res.edgeIds);
    primResultDiv.innerHTML = `<strong>MST total weight</strong>: ${
      res.totalWeight
    }<br/><strong>Edge IDs</strong>: ${res.edgeIds.join(", ")}`;
  });

  // --- Calculator listeners (plain text) ---
  function showCalcListResult(obj, opName) {
    if (!obj) {
      calcResultDiv.innerText = "Error computing.";
      return;
    }
    if (!obj.ok) {
      calcResultDiv.innerText = obj.message || "Invalid input";
      return;
    }

    calcResultDiv.innerHTML = `<strong>${opName}</strong><br/>
      Inputs = [${obj.inputs.join(", ")}] <br/>
      Result (decimal) = <strong>${obj.result}</strong>`;
  }

  calcAndBtn.addEventListener("click", () => {
    const raw = calcListInput.value;
    const res = computeAndList(raw);
    showCalcListResult(res, "AND (all numbers)");
  });

  calcOrBtn.addEventListener("click", () => {
    const raw = calcListInput.value;
    const res = computeOrList(raw);
    showCalcListResult(res, "OR (all numbers)");
  });

  calcXorBtn.addEventListener("click", () => {
    const raw = calcListInput.value;
    const res = computeXorList(raw);
    showCalcListResult(res, "XOR (all numbers)");
  });

  decToBinBtn.addEventListener("click", () => {
    const raw = calcListInput.value;
    const r = decToBinary(raw);
    if (!r.ok) {
      calcResultDiv.innerText = r.message || "Invalid input";
      return;
    }
    calcResultDiv.innerHTML = `<strong>Decimal → Binary</strong><br/>
      Input = ${r.input} <br/>
      Binary = <strong>${r.binary}</strong>`;
  });

  binToDecBtn.addEventListener("click", () => {
    const raw = calcListInput.value;
    const r = binToDecimal(raw);
    if (!r.ok) {
      calcResultDiv.innerText = r.message || "Invalid input";
      return;
    }
    calcResultDiv.innerHTML = `<strong>Binary → Decimal</strong><br/>
      Input = ${r.input} <br/>
      Decimal = <strong>${r.decimal}</strong>`;
  });

  // initial example (convenience)
  graphInput.value = `1 2 10
1 3 5
2 3 2
3 4 1
2 5 7`;
  weightedCheckbox.checked = true;
  document.querySelector(
    'input[name="direction"][value="undirected"]'
  ).checked = true;

  // auto-generate initial graph once UI is ready
  generateBtn.click();
}
