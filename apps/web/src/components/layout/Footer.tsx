export function Footer() {
  return (
    <footer className="border-t mt-12">
      <div className="max-w-5xl mx-auto px-6 py-6 text-sm text-muted-foreground">
        <p>
          KinnikumanAPI — A personal learning project inspired by{' '}
          <a
            href="https://pokeapi.co/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            PokéAPI
          </a>
          .
        </p>

        <p className="mt-1">
          Built with Hono, Drizzle, Turso, React, and shadcn/ui.
        </p>
      </div>
    </footer>
  );
}
