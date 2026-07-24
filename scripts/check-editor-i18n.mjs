#!/usr/bin/env node
/**
 * E7 (anexo v4.3): las cadenas literales que se detectaron hardcodeadas en el
 * editor no pueden reaparecer en /src — todo texto sale del diccionario (D10).
 * El build falla si el grep de la denylist devuelve algo.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'src');

// Cadenas literales del hallazgo E7 (con y sin tildes correctas)
const DENYLIST = [
  'label="Categorias"',
  "label={'Categorias'}",
  'El tamano de las piezas es fijo',
  'significa que no cabe',
  'Arrastra en una zona vacia para girar',
  'Cargando el editor',
];

const offenders = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry)) {
      const content = readFileSync(full, 'utf8');
      for (const needle of DENYLIST) {
        if (content.includes(needle)) offenders.push({ file: full.replace(ROOT, ''), needle });
      }
    }
  }
}

walk(SRC);

if (offenders.length > 0) {
  for (const o of offenders) {
    console.error(`E7 VIOLADO: ${o.file} contiene la cadena hardcodeada "${o.needle}"`);
  }
  console.error(`\nCheck i18n del editor: ${offenders.length} aparicion(es). El build falla (E7).`);
  process.exit(1);
}

console.log('Check i18n del editor: limpio (E7).');
