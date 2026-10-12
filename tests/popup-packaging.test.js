'use strict';
// Popup + packaging regression tests (source-pattern level).
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EXT = path.join(ROOT, 'youtube-declutter');
const popup = fs.readFileSync(path.join(EXT, 'popup.js'), 'utf8');
const manifest = require(path.join(EXT, 'manifest.json'));
const packager = fs.readFileSync(path.join(ROOT, 'scripts', 'package.js'), 'utf8');

describe('popup quality UI', () => {
  it('Playback group renders first', () => {
    assert.ok(/GROUP_ORDER = \['Playback'/.test(popup), 'Playback must lead GROUP_ORDER');
  });

  it('select options come from the shared core', () => {
    assert.ok(popup.includes('QCORE.QUALITY_OPTIONS'), 'options must prefer the core');
    assert.ok(popup.includes("id = 'quality-select'") || popup.includes("id='quality-select'") || popup.includes("'quality-select'"), 'select id present');
  });

  it('select is searchable but excluded from badges and counts', () => {
    assert.ok(popup.includes('premium enhanced bitrate'), 'search must cover premium tokens');
    assert.ok(/data-key.*default_quality/.test(popup), 'select row key present');
    // Mechanism, not just presence: counts derive from FEATURES only...
    assert.ok(/FEATURES\.filter\(\(f\) => !!states\[f\.key\]\)/.test(popup), 'header count must be FEATURES-only');
    assert.ok(/dataset\.keys = groupFeatures\.map/.test(popup), 'group badges must be FEATURES-only');
    // ...the select row is never a FEATURES entry and never becomes one.
    assert.ok(!/FEATURES\.push/.test(popup), 'select must never be pushed into FEATURES');
    const features = fs.readFileSync(path.join(EXT, 'features.js'), 'utf8');
    assert.ok(!/key:\s*'default_quality'/.test(features), 'default_quality must not be a feature key');
  });

  it('bulk operations never touch the resolution', () => {
    const bulk = popup.slice(popup.indexOf('function setGroupEnabled'), popup.indexOf('function buildUi'));
    assert.ok(!/preferredQuality/.test(bulk), 'All/None must not assign quality');
    assert.ok(!/persistQuality/.test(bulk), 'All/None must not persist quality');
  });

  it('reset restores both keys atomically', () => {
    assert.ok(/preferredQuality = QUALITY_DEFAULT/.test(popup), 'reset restores hd1080');
    assert.ok(/persistAll\(\)/.test(popup), 'reset uses the atomic write');
  });
});

describe('dev-only packaging', () => {
  it('manifest never references tests or tooling', () => {
    const text = JSON.stringify(manifest);
    assert.ok(!/"tests/.test(text), 'manifest must not reference tests/');
    assert.ok(!/"scripts\//.test(text), 'manifest must not reference scripts/');
    assert.ok(!/package\.json/.test(text), 'manifest must not reference package.json');
  });

  it('no tests directory ships inside the extension', () => {
    assert.ok(!fs.existsSync(path.join(EXT, 'tests')), 'tests/ must live at repo root, not in the extension');
    assert.ok(!fs.existsSync(path.join(EXT, 'package.json')), 'package.json must not ship in the extension');
  });

  it('packager allowlist covers every shipped reference', () => {
    const refs = new Set(manifest.content_scripts.flatMap((e) => e.js));
    const popupHtml = fs.readFileSync(path.join(EXT, 'popup.html'), 'utf8');
    for (const m of popupHtml.matchAll(/<script src="([^"]+)">/g)) refs.add(m[1]);
    refs.add('popup.html');
    refs.add('popup.js');
    refs.add('popup.css');
    for (const f of refs) {
      assert.ok(packager.includes(`'${f}'`), `package.js must ship ${f}`);
    }
    const filesBlock = (packager.match(/const FILES = \[([\s\S]*?)\];/) || [])[1] || '';
    assert.ok(!/tests/.test(filesBlock), 'packager FILES must not copy tests');
    assert.ok(!/package\.json/.test(filesBlock), 'packager FILES must not copy package.json');
  });
});
