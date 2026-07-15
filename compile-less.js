import fs from 'node:fs';
import less from 'less';

const src = './src/renderer/style.less';
const dest = './src/renderer/style.css';

console.log(`[Compile LESS] Compiling ${src} to ${dest}...`);

try {
  const lessContent = fs.readFileSync(src, 'utf8');
  less.render(lessContent, { filename: src })
    .then(output => {
      fs.writeFileSync(dest, output.css, 'utf8');
      console.log('[Compile LESS] Successfully compiled LESS to CSS.');
    })
    .catch(err => {
      console.error('[Compile LESS] LESS rendering error:', err);
      process.exit(1);
    });
} catch (err) {
  console.error('[Compile LESS] Failed to read/write file:', err);
  process.exit(1);
}
