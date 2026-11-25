import fs from 'fs';
import path from 'path';

const distIndexPath = path.join(process.cwd(), 'dist', 'index.html');
const fallbackIndexPath = path.join(process.cwd(), 'index.html');
const targetPath = path.join(process.cwd(), 'api', '_htmlTemplate.js');

const sourcePath = fs.existsSync(distIndexPath) ? distIndexPath : fallbackIndexPath;
const htmlContent = fs.readFileSync(sourcePath, 'utf-8');

const output = `// Auto-generated during npm run build from dist/index.html — do not edit manually.\nexport const INDEX_HTML = ${JSON.stringify(htmlContent)};\n`;
fs.writeFileSync(targetPath, output, 'utf-8');
console.log(`[sync-html-template] Embedded ${path.relative(process.cwd(), sourcePath)} -> api/_htmlTemplate.js`);
