import * as esbuild from 'esbuild';
import { copy } from 'esbuild-plugin-copy';


const logStatusPlugin = {
  name: 'log-status',
  setup(build) {
    build.onStart(() => {
      console.log(`[${new Date().toLocaleTimeString()}] build started...`);
    });
    build.onEnd((result) => {
      if (result.errors.length > 0) {
        console.error(`[${new Date().toLocaleTimeString()}] build error`);
      } else {
        console.log(`[${new Date().toLocaleTimeString()}] build finished`);
      }
    });
  },
};

const config = {
  entryPoints: ['js/src/index.js'],
  bundle: true,
  splitting: true,
  outdir: 'js/dist',
  format: 'esm', 
  loader: { '.wasm': 'file' },
  external: ['ruff_wasm'],
  plugins: [
    logStatusPlugin,
    copy({
      resolveFrom: 'cwd',
      once: true,
      assets: [
        {
          from: 'node_modules/@biomejs/wasm-web/biome_wasm_bg.wasm',
          to: 'js/dist'
        },
        {
          from: 'node_modules/@astral-sh/ruff-wasm-web/ruff_wasm_bg.wasm',
          to: 'js/dist'
        }
      ],
    }),
  ],
};

if (process.argv.includes('--watch')) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  await esbuild.build(config);
}

