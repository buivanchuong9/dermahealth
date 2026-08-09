import { readFileSync } from 'node:fs';
import ts from 'typescript';

class MemoryStorage {
  #data = new Map();

  get length() {
    return this.#data.size;
  }

  key(index) {
    return [...this.#data.keys()][index] ?? null;
  }

  getItem(key) {
    return this.#data.get(key) ?? null;
  }

  setItem(key, value) {
    this.#data.set(String(key), String(value));
  }

  removeItem(key) {
    this.#data.delete(key);
  }
}

async function importTypeScriptModule(file) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: file,
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

const checks = [
  {
    file: 'src/domain/store.ts',
    forbidden: ['localStorage.getItem', 'localStorage.setItem'],
  },
  {
    file: 'src/api/authToken.ts',
    forbidden: ['localStorage', 'sessionStorage'],
  },
  {
    file: 'src/pages/KioskCheckIn.tsx',
    forbidden: ['localStorage', 'sessionStorage'],
  },
  {
    file: 'src/pages/workflows/WorkflowTemplateEditor.tsx',
    forbidden: ['localStorage', 'sessionStorage'],
  },
];

const failures = checks.flatMap(({ file, forbidden }) => {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  return forbidden
    .filter((pattern) => source.includes(pattern))
    .map((pattern) => `${file} contains forbidden browser persistence: ${pattern}`);
});

if (failures.length) {
  failures.forEach((failure) => console.error(failure));
  process.exit(1);
}

const localStorage = new MemoryStorage();
const sessionStorage = new MemoryStorage();
Object.defineProperties(globalThis, {
  localStorage: { value: localStorage, configurable: true },
  sessionStorage: { value: sessionStorage, configurable: true },
});

localStorage.setItem('dermahealth:store:patients', JSON.stringify([{ id: 'patient-1' }]));
localStorage.setItem('dermahealth:v1:auth:accessToken', 'bearer-token');
localStorage.setItem('dermahealth:reception-device:secret', 'device-secret');
localStorage.setItem('dermahealth:workflow-layout:draft-1:system-nodes', '{}');
localStorage.setItem('dermahealth:v1:auth:activeRole:user-1', 'doctor');
localStorage.setItem('theme', 'dark');
sessionStorage.setItem('dermahealth:returnTo', '/patients/patient-1');
sessionStorage.setItem('safe-ui-state', 'kept');

const { purgeLegacySensitiveStorage } = await importTypeScriptModule(
  'src/security/purgeLegacySensitiveStorage.ts',
);
purgeLegacySensitiveStorage();

const sensitiveKeys = [
  'dermahealth:store:patients',
  'dermahealth:v1:auth:accessToken',
  'dermahealth:reception-device:secret',
  'dermahealth:workflow-layout:draft-1:system-nodes',
];
if (sensitiveKeys.some((key) => localStorage.getItem(key) !== null)) {
  throw new Error('Legacy sensitive localStorage migration did not purge every key.');
}
if (sessionStorage.getItem('dermahealth:returnTo') !== null) {
  throw new Error('Legacy sensitive sessionStorage migration did not purge returnTo.');
}
if (
  localStorage.getItem('dermahealth:v1:auth:activeRole:user-1') !== 'doctor' ||
  localStorage.getItem('theme') !== 'dark' ||
  sessionStorage.getItem('safe-ui-state') !== 'kept'
) {
  throw new Error('Sensitive storage migration removed allowlisted UI preferences.');
}

const beforeStoreMutation = localStorage.length;
const { createEntityStore } = await importTypeScriptModule('src/domain/store.ts');
const entityStore = createEntityStore('patients', []);
entityStore.upsert({ id: 'patient-2', name: 'Sensitive patient' });
entityStore.replaceAll([{ id: 'patient-3', name: 'Another patient' }]);
if (localStorage.length !== beforeStoreMutation) {
  throw new Error('EntityStore persisted clinical data during a runtime mutation.');
}

const beforeTokenMutation = localStorage.length;
const authToken = await importTypeScriptModule('src/api/authToken.ts');
authToken.setAccessToken('new-bearer-token', new Date(Date.now() + 60_000).toISOString());
if (authToken.getAccessToken() !== 'new-bearer-token') {
  throw new Error('In-memory access token store did not retain the active token.');
}
if (localStorage.length !== beforeTokenMutation || sessionStorage.length !== 1) {
  throw new Error('Access token leaked into persistent browser storage.');
}
authToken.clearAccessToken();

console.log('Sensitive clinical state, tokens and kiosk credentials are memory-only; legacy keys are purged.');
