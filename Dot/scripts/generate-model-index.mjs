import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const demoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataRoot = path.join(demoRoot, 'public', 'data');
const outputPath = path.join(dataRoot, 'model-index.json');

async function findModelFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findModelFiles(entryPath);
    return entry.name.toLowerCase().endsWith('.model3.json') ? [entryPath] : [];
  }));
  return files.flat();
}

const modelPaths = (await findModelFiles(dataRoot))
  .map((filePath) => `/${path.relative(path.join(demoRoot, 'public'), filePath).replaceAll(path.sep, '/')}`)
  .sort();

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(modelPaths, null, 2)}\n`);