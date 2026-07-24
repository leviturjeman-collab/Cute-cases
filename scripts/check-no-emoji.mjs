#!/usr/bin/env node
/**
 * Chequeo anti-emoji de CI (Directiva D1, §1).
 * Recorre /src y los diccionarios i18n buscando puntos de código de los
 * rangos Unicode de emoji y HACE FALLAR el build si encuentra alguno.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOTS = ['src'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.json', '.css', '.md']);

// U+1F300–U+1FAFF, U+2600–U+27BF, U+FE0F, y U+200D en secuencias emoji
const EMOJI_RE =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]|\u{200D}(?=[\u{1F300}-\u{1FAFF}])/gu;

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next') continue;
      yield* walk(full);
    } else if (EXTENSIONS.has(full.slice(full.lastIndexOf('.')))) {
      yield full;
    }
  }
}

let failures = 0;
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const content = readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      const matches = line.match(EMOJI_RE);
      if (matches) {
        failures += matches.length;
        console.error(
          `D1 VIOLADO: ${relative(process.cwd(), file)}:${i + 1} contiene ${JSON.stringify(matches)}`,
        );
      }
    });
  }
}

if (failures > 0) {
  console.error(`\nCheck anti-emoji: ${failures} aparición(es). El build falla (D1).`);
  process.exit(1);
}
console.log('Check anti-emoji: limpio (D1).');
