# Deploy SPURSCOPE to Vercel

1. Push this repository to GitHub.
2. Import the repository at [vercel.com/new](https://vercel.com/new).
3. Keep the detected framework as **Next.js**.
4. Leave the build command and output directory at their defaults.
5. Deploy.

The project requires Node.js 20.9 or newer. Vercel will use the `engines.node` setting from `package.json`.

The current web MVP runs its demo calculations in the browser, so it does not need Render. Later, we can move live-data fetching and heavier simulations into a Vercel Function or database-backed API.
