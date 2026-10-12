const logoUrl = new URL('./assets/dead-cells-logo.png', import.meta.url).href;

export function App() {
    return (
        <main
            aria-label="Dead Cells Roulette"
            className="app-background fixed inset-0 flex items-center justify-center bg-cover bg-center bg-no-repeat p-6 portrait:bg-left"
        >
            <img
                src={logoUrl}
                alt="Dead Cells"
                className="h-auto max-h-full w-full max-w-4xl object-contain"
                draggable={false}
            />
        </main>
    );
}
