import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import * as lightningcss from 'lightningcss';

/**
 * Unwraps CSS `@layer` directives so that older Android WebViews (Chrome < 99),
 * including automated test runners in Firebase Test Lab and Google Play Pre-Launch Report,
 * do not discard the entire stylesheet.
 */
function unwrapLayers(css: string): string {
  let result = '';
  let i = 0;
  while (i < css.length) {
    if (css.startsWith('@layer', i)) {
      const openBrace = css.indexOf('{', i);
      if (openBrace !== -1) {
        let depth = 1;
        let j = openBrace + 1;
        while (j < css.length && depth > 0) {
          if (css[j] === '{') depth++;
          else if (css[j] === '}') depth--;
          j++;
        }
        if (depth === 0) {
          const inner = css.slice(openBrace + 1, j - 1);
          result += unwrapLayers(inner);
          i = j;
          continue;
        }
      }
    }
    result += css[i];
    i++;
  }
  return result;
}

/**
 * Downlevels modern CSS (oklch colors to hex/rgb, unwraps @layer) for older Android WebViews (Chrome 80+).
 */
function legacyCssCompatPlugin(): Plugin {
  return {
    name: 'legacy-css-compat',
    enforce: 'post',
    generateBundle(_, bundle) {
      for (const fileName in bundle) {
        const chunk = bundle[fileName];
        if (fileName.endsWith('.css') && chunk.type === 'asset') {
          try {
            const rawCss = typeof chunk.source === 'string' ? chunk.source : Buffer.from(chunk.source).toString('utf8');
            const unwrapped = unwrapLayers(rawCss);
            const res = lightningcss.transform({
              filename: fileName,
              code: Buffer.from(unwrapped),
              targets: { chrome: 80 << 16 },
              minify: true,
            });
            chunk.source = res.code.toString();
            console.log(`[legacy-css-compat] Successfully downleveled ${fileName} for older Android WebViews`);
          } catch (err) {
            console.error(`[legacy-css-compat] Error downleveling ${fileName}:`, err);
          }
        }
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    legacyCssCompatPlugin(),
  ],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
  },
});

