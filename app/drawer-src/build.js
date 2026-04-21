const esbuild = require('esbuild');
const path = require('path');

const watch = process.argv.includes('--watch');
const outfile = path.resolve(__dirname, '../../extensions/cart-max-drawer/assets/cartmax.js');

const config = {
  entryPoints: [path.resolve(__dirname, 'src/index.jsx')],
  bundle: true,
  outfile: outfile,
  format: 'iife',
  target: 'es2018',
  minify: false,
  jsx: 'transform',
  jsxFactory: 'h',
  jsxFragment: 'Fragment',
  tsconfigRaw: '{}',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
};

if (watch) {
  esbuild.context(config).then(function (ctx) {
    ctx.watch();
    console.log('Watching for changes...');
  });
} else {
  esbuild.build(config).then(function () {
    console.log('Build complete:', outfile);
  });
}
