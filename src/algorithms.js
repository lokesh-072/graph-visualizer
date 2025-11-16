// src/algorithms.js

// simple min-heap for {node, priority}
class MinHeap {
  constructor() {
    this.data = [];
  }
  push(item) {
    this.data.push(item);
    this._siftUp(this.data.length - 1);
  }
  pop() {
    if (this.data.length === 0) return null;
    this._swap(0, this.data.length - 1);
    const popped = this.data.pop();
    this._siftDown(0);
    return popped;
  }
  isEmpty() {
    return this.data.length === 0;
  }
  _parent(i) {
    return Math.floor((i - 1) / 2);
  }
  _left(i) {
    return 2 * i + 1;
  }
  _right(i) {
    return 2 * i + 2;
  }
  _siftUp(i) {
    while (i > 0) {
      const p = this._parent(i);
      if (this.data[p].priority <= this.data[i].priority) break;
      this._swap(i, p);
      i = p;
    }
  }
  _siftDown(i) {
    while (true) {
      const l = this._left(i);
      const r = this._right(i);
      let smallest = i;
      if (
        l < this.data.length &&
        this.data[l].priority < this.data[smallest].priority
      )
        smallest = l;
      if (
        r < this.data.length &&
        this.data[r].priority < this.data[smallest].priority
      )
        smallest = r;
      if (smallest === i) break;
      this._swap(i, smallest);
      i = smallest;
    }
  }
  _swap(a, b) {
    const tmp = this.data[a];
    this.data[a] = this.data[b];
    this.data[b] = tmp;
  }
}

/**
 * Dijkstra using priority queue (MinHeap).
 * @param {Object} adjacency - adjacency map {node: [{to, weight, edgeId}, ...], ...}
 * @param {Object} edgeKeyToId - mapping of normalized edge key -> edgeId
 * @param {boolean} isDirected
 * @param {string} source
 * @param {string} target
 * @param {Iterable} nodesIterable - iterable of node ids (used to initialize distances)
 * @returns {Object} { distance, path, edgeIds }
 */
export function dijkstraPQ(
  adjacency,
  edgeKeyToId,
  isDirected,
  source,
  target,
  nodesIterable
) {
  if (!adjacency || !source || !target)
    return { distance: Infinity, path: [], edgeIds: [] };

  const dist = {};
  const prev = {};

  for (const n of nodesIterable) {
    dist[n] = Infinity;
    prev[n] = null;
  }
  dist[source] = 0;

  const pq = new MinHeap();
  pq.push({ node: source, priority: 0 });

  while (!pq.isEmpty()) {
    const it = pq.pop();
    if (!it) break;
    const u = it.node;
    const d = it.priority;
    if (d > dist[u]) continue;
    if (u === target) break;

    const neighbors = adjacency[u] || [];
    for (const e of neighbors) {
      const v = e.to;
      const w = Number(e.weight);
      const alt = dist[u] + w;
      if (alt < dist[v]) {
        dist[v] = alt;
        prev[v] = u;
        pq.push({ node: v, priority: alt });
      }
    }
  }

  if (!isFinite(dist[target]))
    return { distance: Infinity, path: [], edgeIds: [] };

  const path = [];
  let cur = target;
  while (cur !== null) {
    path.push(cur);
    cur = prev[cur];
  }
  path.reverse();

  // helper
  function normalizeKey(a, b, directed) {
    if (directed) return `${a}->${b}`;
    return [a, b].sort().join("--");
  }

  const edgeIds = [];
  for (let i = 0; i + 1 < path.length; i++) {
    const a = path[i],
      b = path[i + 1];
    let key = normalizeKey(a, b, isDirected);
    let eid = edgeKeyToId[key];
    if (eid === undefined) {
      // try the other order (for directed mismatches)
      key = normalizeKey(b, a, isDirected);
      eid = edgeKeyToId[key];
    }
    if (eid !== undefined) edgeIds.push(eid);
  }

  return { distance: dist[target], path, edgeIds };
}

/**
 * Prim's algorithm for undirected MST. For directed graphs, treat edges as undirected.
 * Returns chosen edge ids and total weight.
 * @param {Object} adjacency
 * @param {Iterable} nodesIterable
 * @param {string|null} startNode
 * @returns {Object} { totalWeight, edgeIds }
 */
export function primMST(adjacency, nodesIterable, startNode = null) {
  const nodes = Array.from(nodesIterable);
  if (nodes.length === 0) return { totalWeight: 0, edgeIds: [] };
  const start = startNode && nodes.includes(startNode) ? startNode : nodes[0];

  const inMST = new Set([start]);
  const edgeCandidates = []; // simple array -> sort by weight
  const chosenEdgeIds = [];
  let totalWeight = 0;

  (adjacency[start] || []).forEach((e) => {
    edgeCandidates.push({
      from: start,
      to: e.to,
      weight: Number(e.weight),
      edgeId: e.edgeId,
    });
  });

  while (inMST.size < nodes.length && edgeCandidates.length > 0) {
    edgeCandidates.sort((a, b) => a.weight - b.weight);
    let idx = -1;
    for (let i = 0; i < edgeCandidates.length; i++) {
      if (!inMST.has(edgeCandidates[i].to)) {
        idx = i;
        break;
      }
    }
    if (idx === -1) break;
    const chosen = edgeCandidates.splice(idx, 1)[0];
    inMST.add(chosen.to);
    chosenEdgeIds.push(chosen.edgeId);
    totalWeight += Number(chosen.weight);

    (adjacency[chosen.to] || []).forEach((e) => {
      if (!inMST.has(e.to)) {
        edgeCandidates.push({
          from: chosen.to,
          to: e.to,
          weight: Number(e.weight),
          edgeId: e.edgeId,
        });
      }
    });
  }

  return { totalWeight, edgeIds: chosenEdgeIds };
}
