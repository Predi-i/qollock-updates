"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");

function page() {
    const storage = new Map([["settings", "previous"]]);
    let now = 0;
    const timers = [];
    const context = {
        navigator: {}, crypto: webcrypto, location: { hash: "" }, document: {},
        localStorage: {
            getItem: key => storage.get(key) ?? null,
            setItem: (key, value) => storage.set(key, String(value)),
            removeItem: key => storage.delete(key)
        },
        setTimeout: (callback, delay) => timers.push({ at: now + delay, callback }),
        addEventListener: () => {}
    };
    context.window = context.self = context.top = context;
    const source = fs.readFileSync(path.join(__dirname, "../bridge.html"), "utf8");
    vm.runInNewContext(source.match(/<script>([\s\S]*?)<\/script>/)[1], context);
    const token = storage.get("__qol_bridge_token__");
    return {
        storage,
        save: (part, total, chunk, key = "settings", writeToken = token) => {
            context.__qolSaveChunk(key, part, total, chunk, "qol_1_1", false, writeToken);
            return JSON.parse(context.document.title.slice(8));
        },
        advance: ms => {
            now += ms;
            for (const timer of timers.splice(0)) {
                if (timer.at <= now) timer.callback();
                else timers.push(timer);
            }
        }
    };
}

test("regular chunk progress keeps a save alive beyond thirty seconds", () => {
    const p = page();
    assert.equal(p.save(0, 3, "first").ok, true);
    p.advance(20000);
    assert.equal(p.save(1, 3, "second").ok, true);
    p.advance(20000);
    assert.equal(p.save(2, 3, "third").ok, true);
    assert.equal(p.storage.get("settings"), "firstsecondthird");
});

test("a missing or expired first chunk cannot overwrite the previous save", () => {
    const p = page();
    assert.equal(p.save(2, 3, "tail").ok, false);
    assert.equal(p.storage.get("settings"), "previous");
    p.save(0, 3, "first");
    p.advance(30000);
    assert.equal(p.save(1, 3, "second").ok, false);
    assert.equal(p.save(2, 3, "third").ok, false);
    assert.equal(p.storage.get("settings"), "previous");
    p.save(0, 2, "new");
    assert.equal(p.save(1, 2, "save").ok, true);
    assert.equal(p.storage.get("settings"), "newsave");
});

for (const mismatch of ["key", "total", "order"]) {
    test(`inconsistent save ${mismatch} rejects instead of committing a partial value`, () => {
        const p = page();
        p.save(0, 3, "first");
        const response = mismatch === "key" ? p.save(1, 3, "second", "other") :
            mismatch === "total" ? p.save(1, 2, "second") : p.save(2, 3, "third");
        assert.equal(response.ok, false);
        assert.equal(p.storage.get("settings"), "previous");
        assert.equal(p.storage.has("other"), false);
    });
}

test("retired expiry callbacks cannot expire a replacement transfer with the same id", () => {
    const p = page();
    p.save(0, 2, "old");
    p.advance(20000);
    p.save(1, 2, "save");
    p.save(0, 2, "new");
    p.advance(15000);
    assert.equal(p.save(1, 2, "save").ok, true);
    assert.equal(p.storage.get("settings"), "newsave");
});

test("refused changes cannot disturb an authorized transfer using the same id", () => {
    const p = page();
    p.save(0, 2, "first");
    assert.equal(p.save(1, 2, "foreign", "settings", "wrong-token").ok, false);
    assert.equal(p.save(1, 2, "foreign", "__qol_reserved__").ok, false);
    assert.equal(p.save(1, 2, "second").ok, true);
    assert.equal(p.storage.get("settings"), "firstsecond");
});
