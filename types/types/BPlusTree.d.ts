import { Node } from './Node';
import { ValueType } from '../btree';
export declare type Cursor = {
    node: number;
    pos: number;
    value: any;
};
export declare function evaluate(tree: BPlusTree, id: number, pos: number): Cursor;
export declare function get_current(cur: Node, pos: number): {
    node: number;
    pos: number;
    value: any;
};
export declare function eval_current(tree: BPlusTree, id: number, pos: number): Cursor;
export declare function eval_next(tree: BPlusTree, id: number, pos: number): Cursor;
export declare function eval_previous(tree: BPlusTree, id: number, pos: number): Cursor;
export declare type SearchOptions = {
    skip: number;
    take: number;
    forward: boolean;
};
export declare function find_first(tree: BPlusTree, key: ValueType, forward?: boolean): Cursor;
export declare function find(tree: BPlusTree, key: ValueType, options?: Partial<SearchOptions>): any[];
/**
 * в дереве храняться значения ключевого поля и указатель на запись, по сути это будет id
 * но тут можно хранить и значения
 */
export declare class BPlusTree {
    t: number;
    root: Node;
    unique: boolean;
    nodes: Map<number, Node>;
    constructor(t: number, unique: boolean);
    find(key?: ValueType, { skip, take, forward, }?: {
        skip?: number;
        take?: number;
        forward?: boolean;
    }): any[];
    findFirst(key: ValueType): any;
    findLast(key: ValueType): any;
    cursor(key: ValueType): Cursor;
    count(key: ValueType): number;
    size(): number;
    insert(key: ValueType, value: any): boolean;
    remove(key: ValueType): number | boolean;
    removeMany(key: ValueType): number | boolean;
    min(): ValueType;
    max(): ValueType;
    toJSON(): {
        t: number;
        unique: boolean;
        root: any;
    };
    print(node?: Node): void;
}
//# sourceMappingURL=BPlusTree.d.ts.map