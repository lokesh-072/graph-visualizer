import "./style.css";

// --- DOM ELEMENT SELECTION ---
const generateBtn = document.querySelector("#generate-btn");
const graphInput = document.querySelector("#graph-input");
const graphContainer = document.querySelector("#graph-container");
const calcButtonsContainer = document.querySelector(".calculators-section");
const isWeightedCheckbox = document.querySelector("#is-weighted");

// --- GRAPH VISUALIZER LOGIC ---
const generateGraph = () => {
  // Read the state of the new controls
  const isDirected =
    document.querySelector('input[name="direction"]:checked').value ===
    "directed";
  const isWeighted = isWeightedCheckbox.checked;

  const inputText = graphInput.value.trim();
  const lines = inputText.split("\n").filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    alert("Please enter graph data.");
    return;
  }

  const nodes = new Set();
  const edges = [];

  try {
    lines.forEach((line) => {
      if (line.includes(":")) {
        // Adjacency list parsing remains the same (unweighted)
        const [node, neighbors] = line.split(":");
        const from = node.trim();
        nodes.add(from);
        neighbors
          .trim()
          .split(/\s+/)
          .forEach((neighbor) => {
            const to = neighbor.trim();
            if (to) {
              nodes.add(to);
              edges.push({ from, to });
            }
          });
      } else {
        // Edge list parsing is now updated for weights
        const parts = line.trim().split(/\s+/);
        const from = parts[0];
        const to = parts[1];
        // Check for weight
        const weight = isWeighted ? parts[2] : null;

        if (from && to) {
          nodes.add(from);
          nodes.add(to);
          const edge = { from, to };
          // Add label for weight if it exists
          if (weight) {
            edge.label = weight;
          }
          edges.push(edge);
        }
      }
    });

    const nodesData = Array.from(nodes).map((node) => ({
      id: node,
      label: node,
    }));

    const data = {
      nodes: new vis.DataSet(nodesData),
      edges: new vis.DataSet(edges),
    };

    // Options are now dynamic based on user selection
    const options = {
      edges: {
        arrows: {
          // Enable/disable arrows based on isDirected
          to: { enabled: isDirected, scaleFactor: 0.5 },
        },
        font: {
          // Make edge labels visible
          align: "top",
        },
        color: "#555",
      },
      nodes: {
        shape: "circle",
        color: {
          background: "#007bff",
          border: "#0056b3",
          highlight: {
            background: "#fff",
            border: "#0056b3",
          },
        },
        font: {
          color: "#fff",
          highlight: "#000",
        },
      },
      physics: {
        enabled: true,
      },
    };

    new vis.Network(graphContainer, data, options);
  } catch (error) {
    alert("Invalid input format. Please check your data.");
    console.error(error);
  }
};

// --- BITWISE CALCULATORS LOGIC ---
const calculate = (operation, inputString) => {
  const numbers = inputString
    .trim()
    .split(/\s+/)
    .map(Number)
    .filter((n) => !isNaN(n));

  if (numbers.length === 0) {
    return 0;
  }
  if (numbers.length === 1) {
    return numbers[0];
  }

  return numbers.reduce((acc, current) => {
    switch (operation) {
      case "XOR":
        return acc ^ current;
      case "OR":
        return acc | current;
      case "AND":
        return acc & current;
      default:
        return acc;
    }
  });
};

// --- EVENT LISTENERS ---
generateBtn.addEventListener("click", generateGraph);

calcButtonsContainer.addEventListener("click", (event) => {
  const button = event.target.closest(".op-btn");
  if (!button) return;

  const calcNum = button.dataset.calc;
  const operation = button.dataset.op;

  const inputField = document.querySelector(`#calc${calcNum}-input`);
  const resultSpan = document.querySelector(`#calc${calcNum}-result`);

  const result = calculate(operation, inputField.value);
  resultSpan.textContent = result;
});
