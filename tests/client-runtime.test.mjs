import test from "node:test";
import assert from "node:assert/strict";
import { GameLoop } from "../src/client/runtime/game-loop.ts";
import {
  SaveRepository,
  SAVE_KEY,
} from "../src/client/platform/save-repository.ts";
import { freshSave } from "../src/game/save.ts";

test("save storage preserves old saves and can be replaced without the browser", () => {
  const data = new Map([
    [SAVE_KEY, JSON.stringify({ version: 1, embers: 321, sound: true })],
  ]);
  const storage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
  const repo = new SaveRepository(() => storage);
  const save = repo.load();
  assert.equal(save.embers, 321);
  assert.equal(save.sound, true);
  assert.ok(save.journeys.cinder);
  save.embers = 456;
  assert.equal(repo.persist(save), true);
  assert.equal(repo.load().embers, 456);
});

test("corrupt or unavailable storage allows play and reports failure until recovery", () => {
  const storage = {
    getItem: () => "invalid JSON",
    setItem: () => {
      throw new Error("quota");
    },
  };
  const repo = new SaveRepository(() => storage);
  assert.deepEqual(repo.load(), freshSave());
  assert.equal(repo.available, false);
  assert.equal(repo.persist(freshSave()), false);
  storage.setItem = () => {};
  assert.equal(repo.persist(freshSave()), true);
  const unavailable = new SaveRepository(() => {
    throw new Error("blocked");
  });
  assert.deepEqual(unavailable.load(), freshSave());
  assert.equal(unavailable.available, false);
});

test("host loop caps suspended time, starts once and cancels cleanly", () => {
  let now = 0,
    id = 0;
  const pending = new Map();
  const scheduler = {
    now: () => now,
    request: (callback) => {
      pending.set(++id, callback);
      return id;
    },
    cancel: (key) => pending.delete(key),
  };
  const deltas = [];
  const loop = new GameLoop((dt) => deltas.push(dt), scheduler);
  const advance = (time) => {
    now = time;
    const [key, callback] = pending.entries().next().value;
    pending.delete(key);
    callback(time);
  };
  loop.start();
  loop.start();
  assert.equal(pending.size, 1);
  advance(16);
  advance(10000);
  assert.deepEqual(deltas, [0.016, 0.05]);
  loop.reset();
  advance(10016);
  assert.equal(deltas.at(-1), 0.016);
  loop.stop();
  assert.equal(pending.size, 0);
});
