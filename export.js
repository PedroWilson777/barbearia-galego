const fs = require('fs');
const path = require('path');

const includeDirs = ['src', 'prisma'];
const includeFiles = ['package.json', 'next.config.js', 'tailwind.config.ts', '.env'];
const outputFile = 'PROJETO_COMPLETO.md';

let output = '# Projeto Completo: Barbearia Galego\n\n';

function readFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      readFiles(fullPath);
    } else {
      // ignore images, fonts, etc
      if (['.tsx', '.ts', '.js', '.json', '.prisma', '.css'].includes(path.extname(fullPath))) {
        output += `\n\n## Arquivo: \`${fullPath}\`\n\n\`\`\`${path.extname(fullPath).substring(1)}\n`;
        output += fs.readFileSync(fullPath, 'utf8');
        output += `\n\`\`\`\n`;
      }
    }
  }
}

for (const dir of includeDirs) {
  if (fs.existsSync(dir)) {
    readFiles(dir);
  }
}

for (const file of includeFiles) {
  if (fs.existsSync(file)) {
    output += `\n\n## Arquivo: \`${file}\`\n\n\`\`\`${path.extname(file).substring(1)}\n`;
    output += fs.readFileSync(file, 'utf8');
    output += `\n\`\`\`\n`;
  }
}

fs.writeFileSync(outputFile, output);
console.log(`Projeto exportado com sucesso para ${outputFile}`);
