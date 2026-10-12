import { deepStrictEqual, match, strictEqual } from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { mkdtemp, rmdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { test } from 'node:test';

const phpBinary = process.env.PHP_BINARY ?? 'php';
const phpDirectory = fileURLToPath(new URL('../php/', import.meta.url));

async function availablePort(): Promise<number> {
    const server = createServer();
    await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });

    const address = server.address();
    await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
    });

    if (!address || typeof address === 'string') {
        throw new Error('Test server did not receive a TCP port');
    }

    return address.port;
}

void test('PHP API works at both deployment paths without a configured database', async (t) => {
    const port = await availablePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    const child = spawn(phpBinary, ['-S', `127.0.0.1:${port}`, 'dev-router.php'], {
        cwd: phpDirectory,
        env: {
            ...process.env,
            DB_HOST: 'invalid;host',
            DB_PORT: 'invalid',
            DB_NAME: '',
            DB_USER: '',
            DB_PASS: '',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    let startupError: Error | undefined;
    let hasClosed = false;
    child.stdout.on('data', (data: Buffer) => {
        output += data.toString();
    });
    child.stderr.on('data', (data: Buffer) => {
        output += data.toString();
    });
    child.once('error', (error) => {
        startupError = error;
    });
    const closed = new Promise<void>((resolve) => {
        child.once('close', () => {
            hasClosed = true;
            resolve();
        });
    });
    t.after(async () => {
        if (!hasClosed) {
            child.kill();
        }
        await closed;
    });

    let ready = false;
    for (let attempt = 0; attempt < 100; attempt += 1) {
        if (startupError || hasClosed) {
            throw new Error(
                `Could not start PHP API. Install PHP 8.3+ or set PHP_BINARY. ${startupError?.message ?? output}`,
            );
        }
        try {
            const response = await fetch(`${baseUrl}/api/health`, {
                signal: AbortSignal.timeout(500),
            });
            await response.text();
            ready = true;
            break;
        } catch {
            await delay(50);
        }
    }
    strictEqual(ready, true, `PHP API did not become ready. ${output}`);

    for (const prefix of ['', '/dead-cells-roulette']) {
        await t.test(`GET ${prefix}/api/health returns JSON`, async () => {
            const response = await fetch(`${baseUrl}${prefix}/api/health`);
            strictEqual(response.status, 200);
            match(response.headers.get('content-type') ?? '', /^application\/json\b/);
            strictEqual(response.headers.get('cache-control'), 'no-store');
            strictEqual(response.headers.get('x-content-type-options'), 'nosniff');
            deepStrictEqual(await response.json(), { ok: true });
        });

        await t.test(`HEAD ${prefix}/api/health returns headers without a body`, async () => {
            const response = await fetch(`${baseUrl}${prefix}/api/health`, { method: 'HEAD' });
            strictEqual(response.status, 200);
            strictEqual(await response.text(), '');
        });
    }

    await t.test('unknown API routes return JSON 404 without database access', async () => {
        const response = await fetch(`${baseUrl}/api/not-implemented`);
        strictEqual(response.status, 404);
        match(response.headers.get('content-type') ?? '', /^application\/json\b/);
        deepStrictEqual(await response.json(), {
            error: { code: 'not_found', message: 'Endpoint not found' },
        });
    });

    await t.test('unsupported methods declare the allowed methods', async () => {
        const response = await fetch(`${baseUrl}/api/health`, { method: 'POST' });
        strictEqual(response.status, 405);
        strictEqual(response.headers.get('allow'), 'GET, HEAD');
        match(response.headers.get('content-type') ?? '', /^application\/json\b/);
        deepStrictEqual(await response.json(), {
            error: {
                code: 'method_not_allowed',
                message: 'Only GET and HEAD requests are supported',
            },
        });
    });

    await t.test('malformed percent encoding returns a controlled JSON error', async () => {
        const response = await fetch(`${baseUrl}/api/%ZZ`);
        strictEqual(response.status, 400);
        match(response.headers.get('content-type') ?? '', /^application\/json\b/);
        match(await response.text(), /invalid_parameter/);
    });

    await t.test('the development router never serves private or project files', async () => {
        for (const path of [
            '/api/private/config.local.php',
            '/api/private/config.example.php',
            '/api/private/Database.php',
            '/dead-cells-roulette/api/private/config.local.php',
            '/private/Database.php',
            '/private/config.local.php',
            '/dead-cells-roulette/private/config.local.php',
            '/dev-router.php',
            '/package.json',
            '/.env',
        ]) {
            const response = await fetch(`${baseUrl}${path}`);
            strictEqual(response.status, 404, path);
            match(response.headers.get('content-type') ?? '', /^application\/json\b/, path);
            const body = await response.text();
            match(body, /not_found/, path);
            strictEqual(body.includes('<?php'), false, path);
        }
    });
});

const runFile = promisify(execFile);
const databaseEnvironmentKeys = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASS'];

async function readDatabaseSettings(
    configFile: string,
    overrides: NodeJS.ProcessEnv = {},
): Promise<unknown> {
    const env = { ...process.env };
    for (const key of databaseEnvironmentKeys) {
        delete env[key];
    }
    Object.assign(env, overrides);

    const script = `
require $argv[1];
require $argv[2];
try {
    echo json_encode(\\DeadCellsRoulette\\databaseSettings($argv[3]), JSON_THROW_ON_ERROR);
} catch (\\DeadCellsRoulette\\HttpError $error) {
    echo json_encode(['status' => $error->status, 'errorCode' => $error->errorCode], JSON_THROW_ON_ERROR);
}
`;
    const { stdout } = await runFile(
        phpBinary,
        [
            '-r',
            script,
            join(phpDirectory, 'private', 'Api.php'),
            join(phpDirectory, 'private', 'Database.php'),
            configFile,
        ],
        { env },
    );
    return JSON.parse(stdout) as unknown;
}

void test('shared database configuration is validated without opening a connection', async (t) => {
    const directory = await mkdtemp(join(tmpdir(), 'dead-cells-roulette-config-'));
    const configFile = join(directory, 'config.php');
    await writeFile(
        configFile,
        `<?php
return [
    'DB_HOST' => 'shared-db.internal',
    'DB_PORT' => '3307',
    'DB_NAME' => 'shared_games',
    'DB_USER' => 'games_user',
    'DB_PASS' => 'fixture-password',
    'UNRELATED_SETTING' => 'ignored',
];
`,
    );
    t.after(async () => {
        await unlink(configFile);
        await rmdir(directory);
    });

    await t.test('local PHP configuration supplies only the shared DB settings', async () => {
        deepStrictEqual(await readDatabaseSettings(configFile), {
            DB_HOST: 'shared-db.internal',
            DB_PORT: 3307,
            DB_NAME: 'shared_games',
            DB_USER: 'games_user',
            DB_PASS: 'fixture-password',
        });
    });

    await t.test(
        'process environment overrides the local file, including an empty password',
        async () => {
            deepStrictEqual(
                await readDatabaseSettings(configFile, {
                    DB_HOST: 'database.example',
                    DB_PORT: '3308',
                    DB_NAME: 'override_games',
                    DB_USER: 'override_user',
                    DB_PASS: '',
                }),
                {
                    DB_HOST: 'database.example',
                    DB_PORT: 3308,
                    DB_NAME: 'override_games',
                    DB_USER: 'override_user',
                    DB_PASS: '',
                },
            );
        },
    );

    await t.test('environment-only configuration uses the default MySQL port', async () => {
        deepStrictEqual(
            await readDatabaseSettings(join(directory, 'missing.php'), {
                DB_HOST: 'localhost',
                DB_NAME: 'shared_games',
                DB_USER: 'games_user',
            }),
            {
                DB_HOST: 'localhost',
                DB_PORT: 3306,
                DB_NAME: 'shared_games',
                DB_USER: 'games_user',
                DB_PASS: '',
            },
        );
    });

    await t.test('missing required configuration produces a controlled error', async () => {
        deepStrictEqual(await readDatabaseSettings(join(directory, 'missing.php')), {
            status: 503,
            errorCode: 'database_unavailable',
        });
    });

    await t.test('invalid ports and DSN injection are rejected before connection', async () => {
        const invalidSettings = [
            { DB_PORT: '0' },
            { DB_PORT: '-1' },
            { DB_PORT: '65536' },
            { DB_PORT: '3306junk' },
            { DB_PORT: '3306.5' },
            { DB_HOST: '' },
            { DB_NAME: '' },
            { DB_USER: '' },
            { DB_HOST: 'localhost;dbname=other' },
            { DB_NAME: 'games;charset=latin1' },
        ];
        for (const overrides of invalidSettings) {
            deepStrictEqual(
                await readDatabaseSettings(configFile, overrides),
                { status: 503, errorCode: 'database_unavailable' },
                JSON.stringify(overrides),
            );
        }
    });
});
