import { Node, ValueType } from './Node';
import type { BPlusTree } from './BPlusTree';
import { transaction, debug } from './logger';

// Savepoint support interfaces
export interface SavepointInfo {
  savepointId: string;
  name: string;
  timestamp: number;
  workingNodesCount: number;
  deletedNodesCount: number;
}

export interface SavepointSnapshot<T, K extends ValueType> {
  savepointId: string;
  name: string;
  timestamp: number;
  workingRootId: number | undefined;
  workingNodesSnapshot: Map<number, Node<T, K>>;
  deletedNodesSnapshot: Set<number>;
  // For optimization - store only changes from previous savepoint
  incrementalChanges?: {
    addedNodes: Map<number, Node<T, K>>;
    modifiedNodes: Map<number, Node<T, K>>;
    removedNodes: Set<number>;
  };
}

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

  // Savepoint support methods
  createSavepoint(name: string): Promise<string>;
  rollbackToSavepoint(savepointId: string): Promise<void>;
  releaseSavepoint(savepointId: string): Promise<void>;
  listSavepoints(): string[];
  getSavepointInfo(savepointId: string): SavepointInfo | undefined;
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

  // Savepoint support fields
  private _savepoints: Map<string, SavepointSnapshot<T, K>>;
  private _savepointCounter: number = 0;
  private _savepointNameToId: Map<string, string>;

  constructor(tree: BPlusTree<T, K>) {
    this.transactionId = TransactionContext.generateTransactionId();
    this.treeSnapshot = tree;
    this.snapshotRootId = tree.root;
    this.workingRootId = tree.root;
    this._workingNodes = new Map<number, Node<T, K>>();
    this._deletedNodes = new Set<number>();

    // Initialize savepoint support
    this._savepoints = new Map<string, SavepointSnapshot<T, K>>();
    this._savepointNameToId = new Map<string, string>();

    // Create snapshot of current node states for isolation
    // Use deep copying to prevent shared references
    this._snapshotNodeStates = new Map();
    for (const [nodeId, node] of tree.nodes) {
      this._snapshotNodeStates.set(nodeId, {
        keys: [...node.keys], // Deep copy keys array
        values: node.leaf ? [...(node.pointers as T[])] : [], // Deep copy values/pointers array
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
        transaction(`[markNodeForDeletion] Marking original node ${originalId} (from working copy ${nodeId}) for deletion.`);
      } else {
        // If it's a new node created within this transaction (no originalId),
        // mark the working copy ID for deletion. It won't be in treeSnapshot anyway.
        this._deletedNodes.add(nodeId);
        transaction(`[markNodeForDeletion] Marking new node ${nodeId} for deletion.`);
      }

      // Always remove the working copy from working nodes
      this._workingNodes.delete(nodeId);
      transaction(`[markNodeForDeletion] Removed working copy ${nodeId} from working nodes.`);
    } else {
      // The nodeId is not in working nodes, might be an original node ID
      // In this case, just mark it for deletion (assuming it exists in committed state)
      this._deletedNodes.add(nodeId);
      transaction(`[markNodeForDeletion] Marking node ${nodeId} (assumed original) for deletion.`);
    }

    // If the node being marked for deletion was the working root, clear the working root.
    // We need to check against both nodeId (if it was a new root) and originalId (if root was a copy).
    if (this.workingRootId === nodeId ||
        (workingNode && (workingNode as any)._originalNodeId !== undefined && this.workingRootId === (workingNode as any)._originalNodeId)) {
      transaction(`[markNodeForDeletion] Working root ${this.workingRootId} is being deleted. Setting workingRootId to undefined.`);
      this.workingRootId = undefined;
    }
  }

  public getNode(requestedId: number): Node<T, K> | undefined {
    debug(`[getNode] Requested ID: ${requestedId}`);

    // 1. Check working nodes by temporary ID
    const byTempId = this._workingNodes.get(requestedId);
    if (byTempId) {
      debug(`[getNode] Found in workingNodes by temp ID ${requestedId}`);
      return byTempId;
    }

    // 2. Check working nodes by original ID if requestedId might be an original ID
    for (const workingNode of this._workingNodes.values()) {
      if ((workingNode as any)._originalNodeId === requestedId) {
        debug(`[getNode] Found in workingNodes (temp ID: ${workingNode.id}) by original ID ${requestedId}`);
        return workingNode;
      }
    }

    // 3. Check if the original node was marked for deletion
    // _deletedNodes is expected to store original IDs
    if (this._deletedNodes.has(requestedId)) {
      debug(`[getNode] Node with original ID ${requestedId} is in _deletedNodes.`);
      return undefined;
    }

    // 4. Check committed nodes in the tree snapshot by original ID
    const committedNode = this.treeSnapshot.nodes.get(requestedId);
    if (committedNode) {
      debug(`[getNode] Found in treeSnapshot.nodes by original ID ${requestedId}`);
      return committedNode;
    }

    debug(`[getNode] Node ${requestedId} not found.`);
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
      finalNodeMap.has(deletedNodeId);
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
        // console.error(`[commit CRITICAL] Final root ${finalRootId} not found in finalNodeMap`);
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

    // Clear all savepoints before commit
    transaction(`[commit] Clearing ${this._savepoints.size} savepoints before commit`);
    for (const snapshot of this._savepoints.values()) {
      snapshot.workingNodesSnapshot.clear();
      snapshot.deletedNodesSnapshot.clear();
    }
    this._savepoints.clear();
    this._savepointNameToId.clear();

    // console.log(`Committed transaction ${this.transactionId}. Final root: ${this.treeSnapshot.root}, Nodes count: ${this.treeSnapshot.nodes.size}`);
  }

  public async abort(): Promise<void> {
    transaction(`[abort] Aborting transaction ${this.transactionId}, clearing ${this._savepoints.size} savepoints`);

    // Clear all savepoints
    for (const snapshot of this._savepoints.values()) {
      snapshot.workingNodesSnapshot.clear();
      snapshot.deletedNodesSnapshot.clear();
    }
    this._savepoints.clear();
    this._savepointNameToId.clear();

    // Clear transaction state
    this._workingNodes.clear();
    this._deletedNodes.clear();
    this.workingRootId = this.snapshotRootId;

    transaction(`[abort] Transaction ${this.transactionId} aborted successfully`);
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

    // Clear all savepoints after successful finalize
    transaction(`[finalizeCommit] Clearing ${this._savepoints.size} savepoints after finalize`);
    for (const snapshot of this._savepoints.values()) {
      snapshot.workingNodesSnapshot.clear();
      snapshot.deletedNodesSnapshot.clear();
    }
    this._savepoints.clear();
    this._savepointNameToId.clear();

    // console.log(`Finalized transaction ${this.transactionId}. Final root: ${this.treeSnapshot.root}, Nodes count: ${this.treeSnapshot.nodes.size}`);
  }

  // Savepoint support methods
  public async createSavepoint(name: string): Promise<string> {
    // Check for duplicate savepoint names
    if (this._savepointNameToId.has(name)) {
      throw new Error(`Savepoint with name '${name}' already exists in transaction ${this.transactionId}`);
    }

    // Generate unique savepoint ID
    const savepointId = `sp-${this.transactionId}-${++this._savepointCounter}-${Date.now()}`;

    // Create deep copy of current working nodes state
    const workingNodesSnapshot = new Map<number, Node<T, K>>();
    for (const [nodeId, node] of this._workingNodes) {
      // Create full copy of the node to avoid shared references
      // Don't use Node.copy() as it registers the node in transaction context
      const nodeCopy = this.createDeepCopyForSnapshot(node);
      workingNodesSnapshot.set(nodeId, nodeCopy);
      transaction(`[createSavepoint] Copying node ${nodeId}: keys=[${node.keys.join(',')}] -> snapshot keys=[${nodeCopy.keys.join(',')}]`);
    }

    // Create copy of deleted nodes set
    const deletedNodesSnapshot = new Set<number>(this._deletedNodes);

    // Create savepoint snapshot
    const snapshot: SavepointSnapshot<T, K> = {
      savepointId,
      name,
      timestamp: Date.now(),
      workingRootId: this.workingRootId,
      workingNodesSnapshot,
      deletedNodesSnapshot
    };

    // Store the savepoint
    this._savepoints.set(savepointId, snapshot);
    this._savepointNameToId.set(name, savepointId);

    transaction(`[createSavepoint] Created savepoint '${name}' (${savepointId}) with ${workingNodesSnapshot.size} working nodes and ${deletedNodesSnapshot.size} deleted nodes`);
    return savepointId;
  }

  public async rollbackToSavepoint(savepointId: string): Promise<void> {
    const snapshot = this._savepoints.get(savepointId);
    if (!snapshot) {
      throw new Error(`Savepoint ${savepointId} not found in transaction ${this.transactionId}`);
    }

    transaction(`[rollbackToSavepoint] Rolling back to savepoint '${snapshot.name}' (${savepointId})`);

    // Restore working root ID
    this.workingRootId = snapshot.workingRootId;

    // Clear current working nodes
    this._workingNodes.clear();

    // Restore working nodes from snapshot - create exact copies with same IDs
    for (const [nodeId, snapshotNode] of snapshot.workingNodesSnapshot) {
      // Create a deep copy of the snapshot node without using Node.copy
      // to avoid creating new IDs and registering in transaction context
      const restoredNode = this.createExactCopyFromSnapshot(snapshotNode);
      this._workingNodes.set(nodeId, restoredNode);
    }

    // Restore deleted nodes set
    this._deletedNodes.clear();
    for (const deletedNodeId of snapshot.deletedNodesSnapshot) {
      this._deletedNodes.add(deletedNodeId);
    }

    // Remove all savepoints created after this one (nested rollback)
    const savePointsToRemove: string[] = [];
    for (const [spId, sp] of this._savepoints) {
      if (sp.timestamp > snapshot.timestamp) {
        savePointsToRemove.push(spId);
      }
    }

    transaction(`[rollbackToSavepoint] Found ${savePointsToRemove.length} savepoints to remove after timestamp ${snapshot.timestamp}`);

    // Clean up newer savepoints
    for (const spId of savePointsToRemove) {
      const sp = this._savepoints.get(spId);
      if (sp) {
        this._savepointNameToId.delete(sp.name);
        this._savepoints.delete(spId);
        // Clean up memory from snapshot data
        sp.workingNodesSnapshot.clear();
        sp.deletedNodesSnapshot.clear();
        transaction(`[rollbackToSavepoint] Removed savepoint '${sp.name}' (${spId}) created after rollback point`);
      }
    }

    transaction(`[rollbackToSavepoint] Rollback completed. Working nodes: ${this._workingNodes.size}, deleted nodes: ${this._deletedNodes.size}`);
  }

  // Helper method to create exact copy from snapshot without new IDs
  private createExactCopyFromSnapshot(snapshotNode: Node<T, K>): Node<T, K> {
    // Create a working node without registering it
    const newNode = snapshotNode.leaf
      ? Node.createWorkingLeaf(this.treeSnapshot)
      : Node.createWorkingNode(this.treeSnapshot);

    // Copy all properties exactly as they were in the snapshot
    newNode.keys = [...snapshotNode.keys];
    newNode.pointers = [...snapshotNode.pointers];
    newNode.children = [...snapshotNode.children];
    newNode._parent = snapshotNode._parent;
    newNode._left = snapshotNode._left;
    newNode._right = snapshotNode._right;
    newNode.key_num = snapshotNode.key_num;
    newNode.size = snapshotNode.size;
    newNode.min = snapshotNode.min;
    newNode.max = snapshotNode.max;
    newNode.isFull = snapshotNode.isFull;
    newNode.isEmpty = snapshotNode.isEmpty;

    // Restore the exact ID from snapshot
    (newNode as any).id = snapshotNode.id;

    // Restore the original node ID if it exists
    if ((snapshotNode as any)._originalNodeId !== undefined) {
      (newNode as any)._originalNodeId = (snapshotNode as any)._originalNodeId;
    }

    return newNode;
  }

  public async releaseSavepoint(savepointId: string): Promise<void> {
    const snapshot = this._savepoints.get(savepointId);
    if (!snapshot) {
      throw new Error(`Savepoint ${savepointId} not found in transaction ${this.transactionId}`);
    }

    transaction(`[releaseSavepoint] Releasing savepoint '${snapshot.name}' (${savepointId})`);

    // Remove savepoint from maps
    this._savepoints.delete(savepointId);
    this._savepointNameToId.delete(snapshot.name);

    // Clean up memory from snapshot data
    snapshot.workingNodesSnapshot.clear();
    snapshot.deletedNodesSnapshot.clear();

    transaction(`[releaseSavepoint] Savepoint '${snapshot.name}' (${savepointId}) released successfully`);
  }

  public listSavepoints(): string[] {
    const savepoints: string[] = [];
    for (const snapshot of this._savepoints.values()) {
      savepoints.push(`${snapshot.name} (${snapshot.savepointId}) - ${new Date(snapshot.timestamp).toISOString()}`);
    }
    return savepoints.sort();
  }

  public getSavepointInfo(savepointId: string): SavepointInfo | undefined {
    const snapshot = this._savepoints.get(savepointId);
    if (!snapshot) {
      return undefined;
    }

    return {
      savepointId: snapshot.savepointId,
      name: snapshot.name,
      timestamp: snapshot.timestamp,
      workingNodesCount: snapshot.workingNodesSnapshot.size,
      deletedNodesCount: snapshot.deletedNodesSnapshot.size
    };
  }

  private createDeepCopyForSnapshot(node: Node<T, K>): Node<T, K> {
    // Create a plain object copy without registering in any tree or transaction
    const copy = Object.create(Object.getPrototypeOf(node));

    // Copy all properties
    copy.id = node.id;
    copy.leaf = node.leaf;
    copy.key_num = node.key_num;
    copy.size = node.size;
    copy.min = node.min;
    copy.max = node.max;
    copy.isFull = node.isFull;
    copy.isEmpty = node.isEmpty;
    copy._parent = node._parent;
    copy._left = node._left;
    copy._right = node._right;
    copy.tree = node.tree;
    copy.length = node.length;

    // Deep copy arrays
    copy.keys = [...node.keys];
    copy.pointers = [...node.pointers];
    copy.children = [...node.children];

    // Copy original node ID if it exists
    if ((node as any)._originalNodeId !== undefined) {
      (copy as any)._originalNodeId = (node as any)._originalNodeId;
    }

    return copy;
  }

  static forceCopy<T, K extends ValueType>(originalNode: Node<T, K>, transactionContext: ITransactionContext<T, K>): Node<T, K> {
    // Create a working node WITHOUT adding it to tree.nodes (transaction isolation)
    const newNode = originalNode.leaf
      ? Node.createWorkingLeaf(transactionContext.treeSnapshot)
      : Node.createWorkingNode(transactionContext.treeSnapshot);

    // console.log(`[Node.forceCopy] Creating new ${newNode.leaf ? 'leaf' : 'internal'} working node ${newNode.id} from original ${originalNode.id} with keys: [${originalNode.keys.join(',')}], pointers: [${originalNode.pointers?.length || 0}]`); // LOG REMOVED

    // Deep copy all properties from the original node to ensure complete isolation
    newNode.keys = [...originalNode.keys]; // Deep copy keys array
    newNode.pointers = originalNode.pointers ? [...originalNode.pointers] : []; // Deep copy pointers array
    newNode.children = originalNode.children ? [...originalNode.children] : []; // Deep copy children array
    newNode._parent = originalNode._parent; // Will be updated by the calling context if needed
    newNode._left = originalNode._left;
    newNode._right = originalNode._right;
    newNode.key_num = originalNode.key_num;
    newNode.size = originalNode.size;
    newNode.min = originalNode.min;
    newNode.max = originalNode.max;
    newNode.isFull = originalNode.isFull;
    newNode.isEmpty = originalNode.isEmpty;

    // console.log(`[Node.forceCopy] Copied working node ${newNode.id}: leaf=${newNode.leaf}, keys=[${newNode.keys.join(',')}], pointers count=${newNode.pointers?.length || 0}, key_num=${newNode.key_num}`); // LOG REMOVED

    // Store the original node ID for debugging and potential reference
    (newNode as any)._originalNodeId = originalNode.id;

    // Register the new node in the transaction context ONLY
    transactionContext.addWorkingNode(newNode);

    return newNode;
  }
}

// function getKeyByValue<K, V>(map: Map<K, V>, searchValue: V): K | undefined {
//   for (const [key, value] of map.entries()) {
//     if (value === searchValue) {
//       return key;
//     }
//   }
//   return undefined;
// }