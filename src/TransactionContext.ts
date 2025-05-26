import { Node, ValueType } from './Node';
import type { BPlusTree } from './BPlusTree';

// Export ITransactionContext interface
export interface ITransactionContext<T, K extends ValueType> {
  readonly transactionId: string;
  readonly snapshotRootId: number;
  workingRootId: number | undefined; // Can be undefined if the tree becomes empty
  readonly treeSnapshot: BPlusTree<T, K>; // Reference to the tree at the start of the transaction

  readonly workingNodes: ReadonlyMap<number, Node<T, K>>;
  readonly deletedNodes: ReadonlySet<number>; // Set of IDs for nodes deleted in this transaction

  addWorkingNode(node: Node<T, K>): void;
  getWorkingNode(nodeId: number): Node<T, K> | undefined;
  getCommittedNode(nodeId: number): Node<T, K> | undefined; // From the snapshot
  ensureWorkingNode(nodeId: number): Node<T, K>; // Ensures a working copy exists and returns it
  markNodeForDeletion(nodeId: number): void;
  getNode(nodeId: number): Node<T, K> | undefined; // Checks working, then deleted, then committed
  getRootNode(): Node<T, K> | undefined;

  commit(): Promise<void>; // Commit the transaction
  abort(): Promise<void>;  // Abort the transaction

  // 2PC (Two-Phase Commit) methods
  prepareCommit(): Promise<void>; // Phase 1: Prepare for commit without applying changes
  finalizeCommit(): Promise<void>; // Phase 2: Finalize the prepared commit
}

export class TransactionContext<T, K extends ValueType> implements ITransactionContext<T, K> {
  public readonly transactionId: string;
  public readonly snapshotRootId: number;
  public workingRootId: number | undefined;
  public readonly treeSnapshot: BPlusTree<T, K>;
  private _workingNodes: Map<number, Node<T, K>>;
  private _deletedNodes: Set<number>;

  // Snapshot isolation: store node states at transaction start time
  private readonly _snapshotNodeStates: Map<number, { keys: K[], values: T[], leaf: boolean }>;

  // 2PC state tracking
  private _isPrepared: boolean = false;
  private _preparedChanges: {
    finalNodesToCommit: Map<number, Node<T, K>>;
    finalRootId: number;
    deletedNodeIds: Set<number>;
  } | undefined;

  constructor(tree: BPlusTree<T, K>) {
    this.transactionId = TransactionContext.generateTransactionId();
    this.treeSnapshot = tree;
    this.snapshotRootId = tree.root;
    this.workingRootId = tree.root;
    this._workingNodes = new Map<number, Node<T, K>>();
    this._deletedNodes = new Set<number>();

    // Create snapshot of current node states for isolation
    this._snapshotNodeStates = new Map();
    for (const [nodeId, node] of tree.nodes) {
      this._snapshotNodeStates.set(nodeId, {
        keys: [...node.keys],
        values: node.leaf ? [...(node.pointers as T[])] : [],
        leaf: node.leaf
      });
    }
  }

  static generateTransactionId(): string {
    return `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  public get workingNodes(): ReadonlyMap<number, Node<T, K>> {
    return this._workingNodes;
  }

  public get deletedNodes(): ReadonlySet<number> {
    return this._deletedNodes;
  }

  public addWorkingNode(node: Node<T, K>): void {
    this._workingNodes.set(node.id, node);
    this._deletedNodes.delete(node.id); // If a node is added/updated, it's no longer marked for deletion
  }

  public getWorkingNode(nodeId: number): Node<T, K> | undefined {
    return this._workingNodes.get(nodeId);
  }

  public getCommittedNode(nodeId: number): Node<T, K> | undefined {
    return this.treeSnapshot.nodes.get(nodeId);
  }

  public ensureWorkingNode(nodeId: number): Node<T, K> {
    let workingNode = this.getWorkingNode(nodeId);
    if (workingNode) {
      return workingNode;
    }

    // If not in working nodes, it might be a working copy under a different temp ID
    // but its originalNodeId matches nodeId.
    for (const wn of this._workingNodes.values()) {
      if ((wn as any)._originalNodeId === nodeId) {
        return wn;
      }
    }

    // If still not found, get the original node from snapshot and create a working copy
    const originalNode = this.getCommittedNode(nodeId);
    if (!originalNode) {
      throw new Error(`[ensureWorkingNode] Original node with ID ${nodeId} not found in snapshot.`);
    }

    // Create a CoW copy
    const newWorkingNode = Node.copy(originalNode, this);
    // this.addWorkingNode(newWorkingNode); // Node.copy already adds to working nodes
    return newWorkingNode;
  }

  public markNodeForDeletion(nodeId: number): void {
    // Try to get the working node by the provided nodeId
    const workingNode = this._workingNodes.get(nodeId);

    if (workingNode) {
      // This is a working copy in our transaction
      const originalId = (workingNode as any)._originalNodeId;

      if (originalId !== undefined) {
        // If it's a working copy of an existing node, mark the original for deletion
        this._deletedNodes.add(originalId);
        console.log(`[markNodeForDeletion] Marking original node ${originalId} (from working copy ${nodeId}) for deletion.`);
      } else {
        // If it's a new node created within this transaction (no originalId),
        // mark the working copy ID for deletion. It won't be in treeSnapshot anyway.
        this._deletedNodes.add(nodeId);
        console.log(`[markNodeForDeletion] Marking new node ${nodeId} for deletion.`);
      }

      // Always remove the working copy from working nodes
      this._workingNodes.delete(nodeId);
      console.log(`[markNodeForDeletion] Removed working copy ${nodeId} from working nodes.`);
    } else {
      // The nodeId is not in working nodes, might be an original node ID
      // In this case, just mark it for deletion (assuming it exists in committed state)
      this._deletedNodes.add(nodeId);
      console.log(`[markNodeForDeletion] Marking node ${nodeId} (assumed original) for deletion.`);
    }

    // If the node being marked for deletion was the working root, clear the working root.
    // We need to check against both nodeId (if it was a new root) and originalId (if root was a copy).
    if (this.workingRootId === nodeId ||
        (workingNode && (workingNode as any)._originalNodeId !== undefined && this.workingRootId === (workingNode as any)._originalNodeId)) {
      // console.log(`[markNodeForDeletion] Working root ${this.workingRootId} is being deleted. Setting workingRootId to undefined.`);
      this.workingRootId = undefined;
    }
  }

  public getNode(requestedId: number): Node<T, K> | undefined {
    // console.log(`[getNode] Requested ID: ${requestedId}`);

    // 1. Check working nodes by temporary ID
    const byTempId = this._workingNodes.get(requestedId);
    if (byTempId) {
      // console.log(`[getNode] Found in workingNodes by temp ID ${requestedId}`);
      return byTempId;
    }

    // 2. Check working nodes by original ID if requestedId might be an original ID
    for (const workingNode of this._workingNodes.values()) {
      if ((workingNode as any)._originalNodeId === requestedId) {
        // console.log(`[getNode] Found in workingNodes (temp ID: ${workingNode.id}) by original ID ${requestedId}`);
        return workingNode;
      }
    }

    // 3. Check if the original node was marked for deletion
    // _deletedNodes is expected to store original IDs
    if (this._deletedNodes.has(requestedId)) {
      // console.log(`[getNode] Node with original ID ${requestedId} is in _deletedNodes.`);
      return undefined;
    }

    // 4. Check committed nodes in the tree snapshot by original ID
    const committedNode = this.treeSnapshot.nodes.get(requestedId);
    if (committedNode) {
      // console.log(`[getNode] Found in treeSnapshot.nodes by original ID ${requestedId}`);
      return committedNode;
    }

    // console.log(`[getNode] Node ${requestedId} not found.`);
    return undefined;
  }

  public getRootNode(): Node<T, K> | undefined {
    if (this.workingRootId === undefined) return undefined;
    return this.getNode(this.workingRootId);
  }

  /**
   * Check if a node has been modified since this transaction started.
   * Used for snapshot isolation.
   */
  public isNodeModifiedSinceSnapshot(nodeId: number): boolean {
    const currentNode = this.treeSnapshot.nodes.get(nodeId);
    const snapshotState = this._snapshotNodeStates.get(nodeId);

    if (!currentNode || !snapshotState) {
      // Node was created or deleted since snapshot
      return true;
    }

    // Compare keys
    if (currentNode.keys.length !== snapshotState.keys.length) {
      return true;
    }

    for (let i = 0; i < currentNode.keys.length; i++) {
      if (this.treeSnapshot.comparator(currentNode.keys[i], snapshotState.keys[i]) !== 0) {
        return true;
      }
    }

    // For leaf nodes, compare values
    if (currentNode.leaf && snapshotState.leaf) {
      const currentValues = currentNode.pointers as T[];
      if (currentValues.length !== snapshotState.values.length) {
        return true;
      }

      for (let i = 0; i < currentValues.length; i++) {
        if (currentValues[i] !== snapshotState.values[i]) {
          return true;
        }
      }
    }

    return false;
  }

  public async commit(): Promise<void> {
    // console.log(`Committing transaction ${this.transactionId}`);
    // console.log(`[commit] Before: tree.root=${this.treeSnapshot.root}, workingRootId=${this.workingRootId}, snapshotRootId=${this.snapshotRootId}`);
    // console.log(`[commit] Working nodes count: ${this._workingNodes.size}, deleted nodes count: ${this._deletedNodes.size}`);

    // Phase 1: Resolve ID mappings and prepare final nodes
    const tempToFinalIdMap = new Map<number, number>();
    const finalNodesToCommit = new Map<number, Node<T, K>>();

    // For each working node, determine its final ID
    for (const [tempId, workingNode] of this._workingNodes) {
      const originalId = (workingNode as any)._originalNodeId;
      const finalId = originalId !== undefined ? originalId : tempId;

      tempToFinalIdMap.set(tempId, finalId);
      finalNodesToCommit.set(finalId, workingNode);

      // console.log(`[commit] Mapping: temp ${tempId} -> final ${finalId} (original: ${originalId ?? 'none'})`);
    }

    // Phase 2: Update all pointers within working nodes to use final IDs
    for (const [finalId, nodeToCommit] of finalNodesToCommit) {
      // Update children pointers
      if (nodeToCommit.children && nodeToCommit.children.length > 0) {
        nodeToCommit.children = nodeToCommit.children.map(childTempId => {
          return tempToFinalIdMap.get(childTempId) ?? childTempId;
        });
      }

      // Update parent pointer
      if (nodeToCommit._parent !== undefined) {
        nodeToCommit._parent = tempToFinalIdMap.get(nodeToCommit._parent) ?? nodeToCommit._parent;
      }

      // Update sibling pointers
      if (nodeToCommit._left !== undefined) {
        nodeToCommit._left = tempToFinalIdMap.get(nodeToCommit._left) ?? nodeToCommit._left;
      }
      if (nodeToCommit._right !== undefined) {
        nodeToCommit._right = tempToFinalIdMap.get(nodeToCommit._right) ?? nodeToCommit._right;
      }

      // Set the node's own ID to the final ID
      (nodeToCommit as any).id = finalId;
    }

        // Phase 3: Apply changes to the tree
    // Start with current tree state
    const finalNodeMap = new Map<number, Node<T, K>>(this.treeSnapshot.nodes);

    // Remove deleted nodes
    for (const deletedNodeId of this._deletedNodes) {
      const existedBefore = finalNodeMap.has(deletedNodeId);
      finalNodeMap.delete(deletedNodeId);
      // console.log(`[commit] Deleted node ${deletedNodeId} (existed before: ${existedBefore})`);
    }

    // Add/replace nodes with working copies
    for (const [finalId, nodeToCommit] of finalNodesToCommit) {
      finalNodeMap.set(finalId, nodeToCommit);
      // console.log(`[commit] Committed node ${finalId}, keys: [${nodeToCommit.keys?.join(',')}], children: [${nodeToCommit.children?.join(',') || 'none'}], min: ${nodeToCommit.min}, max: ${nodeToCommit.max}`);
    }



    // Phase 4: Update root if necessary
    let finalRootId = this.treeSnapshot.root;
    if (this.workingRootId !== undefined) {
      finalRootId = tempToFinalIdMap.get(this.workingRootId) ?? this.workingRootId;

      // Ensure the final root exists in the committed nodes
      if (!finalNodeMap.has(finalRootId)) {
        console.error(`[commit CRITICAL] Final root ${finalRootId} not found in finalNodeMap`);
        // Keep the current root as fallback
        finalRootId = this.treeSnapshot.root;
      }
    }

    // Handle the case where root became empty but has children (standard B+ tree root collapse)
    const finalRootNode = finalNodeMap.get(finalRootId);
    if (finalRootNode && finalRootNode.key_num === 0 && !finalRootNode.leaf && finalRootNode.children && finalRootNode.children.length === 1) {
      // Root is empty internal node with single child - that child becomes new root
      const newRootId = finalRootNode.children[0];
      const newRootNode = finalNodeMap.get(newRootId);
      if (newRootNode) {
        // console.log(`[commit] Root ${finalRootId} became empty with single child ${newRootId}, promoting child to root`);

        // Clear parent pointer of new root
        if (newRootNode._parent !== undefined) {
          newRootNode._parent = undefined;
          finalNodeMap.set(newRootId, newRootNode);
        }

        // Mark old root for deletion
        finalNodeMap.delete(finalRootId);
        // console.log(`[commit] Deleted empty root ${finalRootId}`);

        // Update finalRootId
        finalRootId = newRootId;
      }
    }

    // Also check if the original tree root became empty (even if workingRootId points elsewhere)
    const originalRootNode = finalNodeMap.get(this.treeSnapshot.root);
    if (originalRootNode && originalRootNode.key_num === 0 && !originalRootNode.leaf && originalRootNode.children && originalRootNode.children.length === 1 && originalRootNode.id !== finalRootId) {
      // Original root is empty internal node with single child, and it's different from our current finalRootId
      const newRootFromOriginal = originalRootNode.children[0];
      const newRootNodeFromOriginal = finalNodeMap.get(newRootFromOriginal);
      if (newRootNodeFromOriginal) {
        // console.log(`[commit] Original root ${this.treeSnapshot.root} became empty with single child ${newRootFromOriginal}, promoting child to root instead of current finalRootId ${finalRootId}`);

        // Clear parent pointer of new root
        if (newRootNodeFromOriginal._parent !== undefined) {
          newRootNodeFromOriginal._parent = undefined;
          finalNodeMap.set(newRootFromOriginal, newRootNodeFromOriginal);
        }

        // Mark old root for deletion
        finalNodeMap.delete(this.treeSnapshot.root);
        // console.log(`[commit] Deleted empty original root ${this.treeSnapshot.root}`);

        // Update finalRootId to the correct root
        finalRootId = newRootFromOriginal;
      }
    }

    // Phase 5: Apply all changes atomically
    this.treeSnapshot.nodes = finalNodeMap;
    this.treeSnapshot.root = finalRootId;

    // Debug tree structure after commit
    // console.log(`[commit DEBUG] Final tree structure:`);
    const rootNode = finalNodeMap.get(finalRootId);
    if (rootNode) {
      // console.log(`[commit DEBUG] Root ${finalRootId}: keys=[${rootNode.keys?.join(',')}], children=[${rootNode.children?.join(',') || 'none'}], min=${rootNode.min}, max=${rootNode.max}`);
      if (rootNode.children) {
        for (const childId of rootNode.children) {
          const child = finalNodeMap.get(childId);
          if (child) {
            // console.log(`[commit DEBUG]   Child ${childId}: keys=[${child.keys?.join(',')}], leaf=${child.leaf}, min=${child.min}, max=${child.max}`);
          }
        }
      }
    }

    // Update next_node_id to prevent conflicts
    let maxId = 0;
    for (const nodeId of finalNodeMap.keys()) {
      if (nodeId > maxId) {
        maxId = nodeId;
      }
    }
    this.treeSnapshot.next_node_id = maxId + 1;

    // Clear transaction state
    this.workingRootId = finalRootId;

    // console.log(`Committed transaction ${this.transactionId}. Final root: ${this.treeSnapshot.root}, Nodes count: ${this.treeSnapshot.nodes.size}`);
  }

  public async abort(): Promise<void> {
    // console.log(`Aborting transaction ${this.transactionId}`);
    this._workingNodes.clear();
    this._deletedNodes.clear();
    this.workingRootId = this.snapshotRootId;
  }

  // 2PC (Two-Phase Commit) methods
  public async prepareCommit(): Promise<void> {
    if (this._isPrepared) {
      throw new Error(`Transaction ${this.transactionId} is already prepared. Cannot prepare twice.`);
    }

    // console.log(`Preparing transaction ${this.transactionId} for commit`);
    // console.log(`[prepareCommit] workingRootId=${this.workingRootId}, snapshotRootId=${this.snapshotRootId}`);
    // console.log(`[prepareCommit] Working nodes count: ${this._workingNodes.size}, deleted nodes count: ${this._deletedNodes.size}`);

    // Phase 1: Resolve ID mappings and prepare final nodes (same as commit phase 1)
    const tempToFinalIdMap = new Map<number, number>();
    const finalNodesToCommit = new Map<number, Node<T, K>>();

    // For each working node, determine its final ID
    for (const [tempId, workingNode] of this._workingNodes) {
      const originalId = (workingNode as any)._originalNodeId;
      const finalId = originalId !== undefined ? originalId : tempId;

      tempToFinalIdMap.set(tempId, finalId);

      // Create deep copy of the working node for preparation
      const nodeToCommit = Node.copy(workingNode, this);
      finalNodesToCommit.set(finalId, nodeToCommit);

      // console.log(`[prepareCommit] Mapping: temp ${tempId} -> final ${finalId} (original: ${originalId ?? 'none'})`);
    }

    // Phase 2: Update all pointers within prepared nodes to use final IDs
    for (const [finalId, nodeToCommit] of finalNodesToCommit) {
      // Update children pointers
      if (nodeToCommit.children && nodeToCommit.children.length > 0) {
        nodeToCommit.children = nodeToCommit.children.map(childTempId => {
          return tempToFinalIdMap.get(childTempId) ?? childTempId;
        });
      }

      // Update parent pointer
      if (nodeToCommit._parent !== undefined) {
        nodeToCommit._parent = tempToFinalIdMap.get(nodeToCommit._parent) ?? nodeToCommit._parent;
      }

      // Update sibling pointers
      if (nodeToCommit._left !== undefined) {
        nodeToCommit._left = tempToFinalIdMap.get(nodeToCommit._left) ?? nodeToCommit._left;
      }
      if (nodeToCommit._right !== undefined) {
        nodeToCommit._right = tempToFinalIdMap.get(nodeToCommit._right) ?? nodeToCommit._right;
      }

      // Set the node's own ID to the final ID
      (nodeToCommit as any).id = finalId;
    }

    // Phase 3: Determine final root ID
    let finalRootId = this.treeSnapshot.root;
    if (this.workingRootId !== undefined) {
      finalRootId = tempToFinalIdMap.get(this.workingRootId) ?? this.workingRootId;
    }

    // Handle the case where root became empty but has children (standard B+ tree root collapse)
    const finalRootNode = finalNodesToCommit.get(finalRootId);
    if (finalRootNode && finalRootNode.key_num === 0 && !finalRootNode.leaf && finalRootNode.children && finalRootNode.children.length === 1) {
      // Root is empty internal node with single child - that child becomes new root
      const newRootId = finalRootNode.children[0];
      const newRootNode = finalNodesToCommit.get(newRootId);
      if (newRootNode) {
        // console.log(`[prepareCommit] Root ${finalRootId} would become empty with single child ${newRootId}, promoting child to root`);

        // Clear parent pointer of new root
        if (newRootNode._parent !== undefined) {
          newRootNode._parent = undefined;
        }

        // Mark old root for deletion in prepared changes
        finalNodesToCommit.delete(finalRootId);
        // console.log(`[prepareCommit] Prepared to delete empty root ${finalRootId}`);

        // Update finalRootId
        finalRootId = newRootId;
      }
    }

    // Store prepared changes
    this._preparedChanges = {
      finalNodesToCommit,
      finalRootId,
      deletedNodeIds: new Set(this._deletedNodes)
    };

    this._isPrepared = true;

    // console.log(`Transaction ${this.transactionId} prepared successfully. Final root would be: ${finalRootId}, Prepared nodes count: ${finalNodesToCommit.size}`);
  }

  public async finalizeCommit(): Promise<void> {
    if (!this._isPrepared || !this._preparedChanges) {
      throw new Error(`Transaction ${this.transactionId} must be prepared before finalizing. Call prepareCommit() first.`);
    }

    // console.log(`Finalizing transaction ${this.transactionId}`);
    // console.log(`[finalizeCommit] Applying prepared changes: ${this._preparedChanges.finalNodesToCommit.size} nodes, root: ${this._preparedChanges.finalRootId}`);

    // Start with current tree state
    const finalNodeMap = new Map<number, Node<T, K>>(this.treeSnapshot.nodes);

    // Remove deleted nodes
    for (const deletedNodeId of this._preparedChanges.deletedNodeIds) {
      finalNodeMap.delete(deletedNodeId);
      // console.log(`[finalizeCommit] Deleted node ${deletedNodeId}`);
    }

    // Add/replace nodes with prepared copies
    for (const [finalId, nodeToCommit] of this._preparedChanges.finalNodesToCommit) {
      finalNodeMap.set(finalId, nodeToCommit);
      // console.log(`[finalizeCommit] Committed node ${finalId}, keys: [${nodeToCommit.keys?.join(',')}], children: [${nodeToCommit.children?.join(',') || 'none'}], min: ${nodeToCommit.min}, max: ${nodeToCommit.max}`);
    }

    // Apply all changes atomically
    this.treeSnapshot.nodes = finalNodeMap;
    this.treeSnapshot.root = this._preparedChanges.finalRootId;

    // Debug tree structure after finalize
    // console.log(`[finalizeCommit DEBUG] Final tree structure:`);
    const rootNode = finalNodeMap.get(this._preparedChanges.finalRootId);
    if (rootNode) {
      // console.log(`[finalizeCommit DEBUG] Root ${this._preparedChanges.finalRootId}: keys=[${rootNode.keys?.join(',')}], children=[${rootNode.children?.join(',') || 'none'}], min=${rootNode.min}, max=${rootNode.max}`);
      if (rootNode.children) {
        for (const childId of rootNode.children) {
          const child = finalNodeMap.get(childId);
          if (child) {
            // console.log(`[finalizeCommit DEBUG]   Child ${childId}: keys=[${child.keys?.join(',')}], leaf=${child.leaf}, min=${child.min}, max=${child.max}`);
          }
        }
      }
    }

    // Update next_node_id to prevent conflicts
    let maxId = 0;
    for (const nodeId of finalNodeMap.keys()) {
      if (nodeId > maxId) {
        maxId = nodeId;
      }
    }
    this.treeSnapshot.next_node_id = maxId + 1;

    // Update workingRootId to reflect the final state
    this.workingRootId = this._preparedChanges.finalRootId;

    // Clear transaction and preparation state
    this._workingNodes.clear();
    this._deletedNodes.clear();
    this._isPrepared = false;
    this._preparedChanges = undefined;

    // console.log(`Finalized transaction ${this.transactionId}. Final root: ${this.treeSnapshot.root}, Nodes count: ${this.treeSnapshot.nodes.size}`);
  }
}

function getKeyByValue<K, V>(map: Map<K, V>, searchValue: V): K | undefined {
  for (const [key, value] of map.entries()) {
    if (value === searchValue) {
      return key;
    }
  }
  return undefined;
}