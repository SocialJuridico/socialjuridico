const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'Swagger UI.html');
const content = fs.readFileSync(filePath, 'utf8');

// The JSON spec is typically embedded inside a script tag or as a JSON string
// Let's find any occurrences of json specs or the json URL
const urlIndex = content.indexOf('https://n8n.socialjuridico.com.br/docs/json');
console.log("Found JSON URL in file:", urlIndex !== -1);

// Let's look for "/api/publico/oab/processos", "/api/plataformas/monitoramentos", "/api/publico/djen/buscar"
const targets = [
  '/api/publico/oab/processos',
  '/api/plataformas/monitoramentos',
  '/api/publico/djen/buscar'
];

for (const t of targets) {
  const index = content.indexOf(t);
  console.log(`Target "${t}" index:`, index);
  if (index !== -1) {
    // Let's print 500 characters around the match to see the context
    console.log(`Context for ${t}:`);
    console.log(content.slice(Math.max(0, index - 200), Math.min(content.length, index + 800)));
    console.log("-----------------------------------------");
  }
}
