import { spawnSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const phpBinary = process.env.PHP_BINARY || 'php';
const root = fileURLToPath(new URL('../', import.meta.url));

function runPhp(arguments_: string[]): void {
    const result = spawnSync(phpBinary, arguments_, { stdio: 'inherit' });
    if (result.error) {
        throw new Error(`Cannot run PHP (${phpBinary}): ${result.error.message}`);
    }
    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}

async function phpFiles(directory: string): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(
        entries.map(async (entry): Promise<string[]> => {
            const filename = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                return phpFiles(filename);
            }
            return entry.isFile() &&
                entry.name.endsWith('.php') &&
                entry.name !== 'config.local.php'
                ? [filename]
                : [];
        }),
    );
    return nested.flat().sort();
}

runPhp([
    '-r',
    'if (PHP_VERSION_ID < 80300) { fwrite(STDERR, "PHP 8.3 or newer is required; found " . PHP_VERSION . PHP_EOL); exit(1); }',
]);

const files = (
    await Promise.all(
        ['apps/server/php', 'apps/server/test'].map((directory) =>
            phpFiles(path.join(root, directory)),
        ),
    )
).flat();

if (files.length === 0) {
    throw new Error('No PHP files found to validate.');
}

for (const filename of files) {
    runPhp(['-l', filename]);
}

console.log(`PHP syntax checks passed (${files.length} files).`);
