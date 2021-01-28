import { ValueType } from '../btree';
import { Chainable } from './Chainable';
import { BPlusTree } from './BPlusTree';
export declare function addSibling(a: Chainable, b: Chainable, order: 'right' | 'left'): void;
export declare function removeSibling(a: Chainable, order: 'right' | 'left'): void;
export declare enum VertexColor {
    gray = 1,
    blue = 2,
    red = 3
}
export declare function registerNode(tree: BPlusTree, node: Node): void;
export declare function unregisterNode(tree: BPlusTree, node: Node): void;
export declare function push_node_up(node: Node): void;
export declare function push_min_up(node: Node, key: ValueType): void;
export declare function push_max_up(node: Node, key: ValueType): void;
export declare class Node {
    static createLeaf(tree: BPlusTree): Node;
    static createNode(tree: BPlusTree): Node;
    static createRootFrom(tree: BPlusTree, ...node: Array<Node>): Node;
    static load(tree: BPlusTree): void;
    id: number;
    t: number;
    leaf: boolean;
    key_num: number;
    size: number;
    keys: ValueType[];
    children: Node[];
    pointers: any[];
    min: ValueType;
    max: ValueType;
    isFull: boolean;
    isEmpty: boolean;
    tree: BPlusTree;
    private constructor();
    delete(): void;
    insertMany(...items: Array<[ValueType, any]>): void;
    insert(item: [ValueType, any]): void;
    remove(item: ValueType | Node): Node | [ValueType, any];
    updateStatics(): void;
    commit(): void;
    print(node?: Node): void;
    toJSON(): any;
    _parent: number;
    get parent(): Node;
    set parent(node: Node);
    _left: number;
    _right: number;
    get left(): Node;
    set left(node: Node);
    get right(): Node;
    set right(node: Node);
    addSiblingAtRight(b: any): void;
    addSiblingAtLeft(b: any): void;
    removeSiblingAtRight(): void;
    removeSiblingAtLeft(): void;
}
/**
 * все манипуляции с деревом простое обхединение массивов
 * поскольку мы знаем что и откуда надо брать
 * отсюда: все операции это просто функции
 *
 * операции пользователя это вставка... он вставляет только данные а не узлы дерева
 * а это методы дерева
 *
 */
//# sourceMappingURL=Node.d.ts.map