export default class Timer {
    startTs: [number, number];
    endTs: [number, number];
    duration: {
        nano: number;
        ms: number;
        s: number;
    };
    constructor();
    start(): void;
    stop(): void;
}
//# sourceMappingURL=time.d.ts.map