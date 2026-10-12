import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist', 'webzdarma');
const clientOutput = path.join(root, 'apps', 'client', 'dist');
const phpSource = path.join(root, 'apps', 'server', 'php');

// Only these server files belong on shared hosting. Local config and the dev router stay local.
const apiFiles = [
    'index.php',
    '.htaccess',
    'private/Api.php',
    'private/Database.php',
    'private/config.example.php',
    'private/.htaccess',
] as const;

if (path.relative(root, output) !== path.join('dist', 'webzdarma')) {
    throw new Error('Refusing to remove a packaging directory outside dist/webzdarma.');
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(clientOutput, output, { recursive: true });
await cp(path.join(root, 'scripts', 'webzdarma.htaccess'), path.join(output, '.htaccess'));

for (const filename of apiFiles) {
    const destination = path.join(output, 'api', filename);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(path.join(phpSource, filename), destination);
}

console.log(`FileZilla upload folder: ${output}`);
