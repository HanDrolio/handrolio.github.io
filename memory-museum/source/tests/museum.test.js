import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as T from 'three';
import { codeText, dailyCode, glyphs, makeDay, museumDate, parseCode } from '../src/core/seed.js';
import { normalizedMemory, readJournal, scheduleEntries } from '../src/memories/import.js';
import { DEMOS } from '../src/memories/demo.js';
import { publishedRecords } from '../src/memories/collection.js';
import { Museum } from '../src/museum/world.js';
import { GARDEN_LEVEL } from '../src/museum/garden.js';
import { Controller, SPAWN } from '../src/movement/controller.js';
import { Collision } from '../src/movement/physics.js';
import { PERSONAS, WINGS } from '../src/personas/personas.js';

test('the published archive preserves every exhibit and collection summary verbatim', () => {
  const source = JSON.parse(readFileSync(new URL('../public/data/cosmos-museum-memories.json', import.meta.url), 'utf8'));
  const records = publishedRecords(source);
  assert.equal(records.memories.length, 40);
  assert.equal(records.collections.length, 9);
  const exhibits = Object.values(source.archives).flatMap(collection => collection.content.key_exhibits);
  for (const exhibit of exhibits) {
    const result = records.memories.find(memory => memory.id === 'published-' + exhibit.id);
    assert.equal(result.title, exhibit.title);
    assert.equal(result.content, exhibit.content);
    assert.equal(result.type, exhibit.type);
    assert.equal(result.timestamp, exhibit.timestamp);
  }
  for (const collection of Object.values(source.archives)) {
    assert.equal(records.collections.find(item => item.id === collection.id).summary, collection.content.summary);
  }
});

test('4:44 AM is the civil-day boundary, including New Year', () => {
  assert.equal(museumDate(new Date(2027, 0, 1, 4, 43, 59)), '2026-12-31');
  assert.equal(museumDate(new Date(2027, 0, 1, 4, 44)), '2027-01-01');
  assert.equal(museumDate(new Date(2026, 10, 1, 4, 43)), '2026-10-31');
});

test('every glyph sequence is a lossless seed encoding', () => {
  for (let code = 0; code <= 65535; code++) {
    assert.equal(parseCode(glyphs(code).join('-')), code);
    assert.equal(parseCode(codeText(code)), code);
  }
  assert.equal(parseCode('♾️-🌀-🔥'), null);
});

test('seed fixes layout and placement and moves about one fifth away from home', () => {
  const date = '2026-11-07';
  const code = dailyCode(date, 'test-archive', DEMOS.length);
  const day = makeDay({ code, date, memories: DEMOS });
  const replay = makeDay({ code: parseCode(glyphs(code).join('')), date, memories: [...DEMOS].reverse() });
  assert.deepEqual(day, replay);
  assert.equal(day.migrations.size, Math.round(DEMOS.length * 0.2));
  for (const [id, wing] of day.migrations) assert.notEqual(DEMOS.find(memory => memory.id === id).persona, wing);
  assert.notDeepEqual(day.layouts, makeDay({ code: (code + 1) % 65536, date, memories: DEMOS }).layouts);
  const ordinary = Array.from({ length: 512 }, (_, index) => index).find(candidate => !makeDay({ code: candidate, date, memories: [] }).basement);
  assert.equal(makeDay({ code: ordinary, date, memories: [], demonVisits: 6 }).basement, false);
  assert.equal(makeDay({ code: ordinary, date, memories: [], demonVisits: 7 }).basement, true);
});

test('new entries release in groups of at most three and sealed entries stay downstairs', async () => {
  const now = new Date(2026, 10, 7, 20);
  const entries = await readJournal(new File(['One\n\nTwo\n\nThree\n\nFour'], 'journal.md'), 'orion');
  entries.push({ memory: normalizedMemory({ content: 'Sealed', sealed: true }, now) });
  scheduleEntries(entries, [], now);
  assert.deepEqual(entries.map(record => record.memory.availableOn), ['2026-11-07', '2026-11-07', '2026-11-07', '2026-11-08', undefined]);
  const day = makeDay({ code: 0, date: '2026-11-07', memories: entries.map(record => record.memory) });
  assert.equal(day.newEntries.length, 3);
  assert.equal(Object.values(day.wingEntries).flat().length, 3);
  const normalized = normalizedMemory({ content: 'Bounded', persona: '__proto__', type: 'constructor' });
  assert.equal(normalized.persona, 'echo');
  assert.equal(normalized.type, 'text');
});

test('controller jumps close to 1.2 m, lands, and cannot cross a wall', () => {
  const camera = new T.PerspectiveCamera(75, 1, 0.08, 120);
  const controller = new Controller(camera);
  controller.place(new T.Vector3(0, 0, 0), 0);
  const collision = new Collision();
  collision.disc(0, 0, 20, 0);
  collision.wall(new T.Group(), 0, -3, 5, 0.5, 0, 3);
  let maximum = 0;
  for (let frame = 0; frame < 90; frame++) {
    controller.update(1 / 120, { frameLook: [0, 0], move: [0, 0], right: [0, 0],
      down: () => false, pressed: action => action === 'jump' && frame === 0 }, collision, PERSONAS.orion, { lookSpeed: 1 }, () => {});
    maximum = Math.max(maximum, controller.position.y);
  }
  assert.ok(maximum > 1.16 && maximum < 1.23, maximum);
  assert.equal(controller.position.y, 0);
  for (let frame = 0; frame < 120; frame++) {
    controller.update(1 / 60, { frameLook: [0, 0], move: [0, 1], right: [0, 0], down: () => true, pressed: () => false },
      collision, PERSONAS.orion, { lookSpeed: 1 }, () => {});
  }
  assert.ok(controller.position.z >= -2.45, controller.position.z);
});

test('all eight corridors connect to the Rotunda and the roof is reached through the oculus', () => {
  globalThis.document = { createElement: () => ({ getContext: () => ({
    fillRect() {}, strokeRect() {}, fillText() {},
  }) }) };
  const memories = DEMOS.map(memory => ({ ...memory, asset: undefined }));
  const archive = { memories, entries: new Map(memories.map(memory => [memory.id, memory])) };
  const museum = new Museum(new T.Scene(), archive);
  museum.build(makeDay({ code: 444, date: '2026-11-07', memories, demonVisits: 7 }));
  assert.equal(museum.zone(SPAWN), 'rotunda');
  for (const [index, wing] of WINGS.entries()) {
    const angle = index * Math.PI / 4;
    const x = Math.sin(angle), z = -Math.cos(angle);
    const position = new T.Vector3(x * 22.6, 0, z * 22.6);
    for (let step = 0; step < 56; step++) {
      museum.collision.move(position, x * 0.12, z * 0.12, 1.82);
      assert.equal(museum.collision.ground(position.x, position.z, 0.01, wing.id), 0);
    }
    assert.equal(museum.zone(position), wing.id);
  }
  const roofFloors = museum.collision.floors.filter(floor => floor.y > 0.6 && floor.y < GARDEN_LEVEL && floor.hx < 1 && floor.hz < 1)
    .filter(floor => floor.x > -4.1 && floor.x < 10 && floor.z > -5 && floor.z < 14).sort((a, b) => a.y - b.y);
  assert.equal(roofFloors.length, 12);
  for (let i = 1; i < roofFloors.length; i++) {
    assert.ok(roofFloors[i].y - roofFloors[i - 1].y < 1.2);
    assert.ok(Math.hypot(roofFloors[i].x - roofFloors[i - 1].x, roofFloors[i].z - roofFloors[i - 1].z) < 2.45);
  }
  assert.equal(museum.collision.ground(0, -8, GARDEN_LEVEL + 0.03, 'orion'), GARDEN_LEVEL);
  assert.notEqual(museum.collision.ground(0, 0, GARDEN_LEVEL + 0.03, 'orion'), GARDEN_LEVEL);
  assert.ok(museum.targets.some(target => target.kind === 'basement'));
});
