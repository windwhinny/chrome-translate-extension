import { describe, it } from "vitest";
import streamJSONParser from "./streamJSONParser";

describe("streamJSONParser", () => {
    it("", async () => {
        const sleep = (time: number) => new Promise((resolve) => setTimeout(resolve, time));

        const stream = async function* () {
            yield '{"key1":';
            await sleep(100);
            yield '"value", "key2": 1234,';
            await sleep(100);
            yield '"key3": true }';
        };

        await streamJSONParser(stream())
            .watch((result) => {
                console.log(result);
            })
            .wrap();
    });
})
