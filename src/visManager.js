// src/visManager.js
// This module expects `vis` global (UMD loaded in index.html)

let network = null;
let nodesDataSet = null;
let edgesDataSet = null;

function createNetwork(containerEl, nodesArr, edgesArr, isDirected = false) {
  // destroy previous if exists
  if (network) {
    network.destroy();
    containerEl.innerHTML = "";
    network = null;
  }

  nodesDataSet = new vis.DataSet(nodesArr);
  edgesDataSet = new vis.DataSet(edgesArr);

  const data = { nodes: nodesDataSet, edges: edgesDataSet };
  const options = {
    edges: {
      arrows: {
        to: { enabled: isDirected, scaleFactor: 0.5 },
      },
      font: { align: "top" },
      color: "#888",
    },
    nodes: {
      shape: "circle",
      color: {
        background: "#007bff",
        border: "#0056b3",
        highlight: { background: "#fff", border: "#0056b3" },
      },
      font: { color: "#fff" },
      size: 25,
    },
    physics: {
      stabilization: true,
      barnesHut: { gravitationalConstant: -2000 },
    },
    interaction: { hover: true, tooltipDelay: 100 },
  };

  network = new vis.Network(containerEl, data, options);

  // return handles
  return {
    network,
    nodesDataSet,
    edgesDataSet,
    resetHighlights: () => resetHighlights(),
    highlightPath: (nodePath, edgeIds) => highlightPath(nodePath, edgeIds),
    highlightMST: (edgeIds) => highlightMST(edgeIds),
  };
}

function resetHighlights() {
  if (!nodesDataSet || !edgesDataSet) return;
  nodesDataSet.forEach((node) => {
    nodesDataSet.update({
      id: node.id,
      color: { background: "#007bff", border: "#0056b3" },
      font: { color: "#fff" },
      size: 25,
    });
  });
  edgesDataSet.forEach((edge) => {
    edgesDataSet.update({
      id: edge.id,
      color: { color: "#888" },
      width: 1,
      arrows: { to: false },
    });
  });
}

function highlightPath(nodePath, edgeIds) {
  resetHighlights();
  if (!nodesDataSet || !edgesDataSet) return;
  nodePath.forEach((nodeId) => {
    nodesDataSet.update({
      id: nodeId,
      color: { background: "#ffcc00", border: "#cc9900" },
      font: { color: "#000" },
      size: 30,
    });
  });
  edgeIds.forEach((eid) => {
    edgesDataSet.update({ id: eid, color: { color: "#ff0000" }, width: 4 });
  });
}

function highlightMST(edgeIds) {
  resetHighlights();
  if (!edgesDataSet) return;
  edgeIds.forEach((eid) => {
    edgesDataSet.update({ id: eid, color: { color: "#00a000" }, width: 4 });
  });
}

export { createNetwork, resetHighlights, highlightPath, highlightMST };
