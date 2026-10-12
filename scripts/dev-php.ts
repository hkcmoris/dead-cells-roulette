import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const phpBinary = process.env.PHP_BINARY || 'php';
const portValue = process.env.PORT ?? '3002';
const port = Number(portValue);

if (!/^\d+$/.test(portValue) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
}

const documentRoot = fileURLToPath(new URL('../apps/server/php/', import.meta.url));
const router = fileURLToPath(new URL('../apps/server/php/dev-router.php', import.meta.url));
const child = spawn(phpBinary, ['-S', `127.0.0.1:${port}`, '-t', documentRoot, router], {
    stdio: 'inherit',
    env: process.env,
});

const forwardInterrupt = (): void => {
    child.kill('SIGINT');
};
const forwardTerminate = (): void => {
    child.kill('SIGTERM');
};

process.on('SIGINT', forwardInterrupt);
process.on('SIGTERM', forwardTerminate);

child.once('error', (error) => {
    console.error(`Cannot start PHP (${phpBinary}): ${error.message}`);
    process.exitCode = 1;
});

child.once('close', (code, signal) => {
    process.removeListener('SIGINT', forwardInterrupt);
    process.removeListener('SIGTERM', forwardTerminate);
    process.exitCode = code ?? (signal === 'SIGINT' ? 130 : signal === 'SIGTERM' ? 143 : 1);
});
