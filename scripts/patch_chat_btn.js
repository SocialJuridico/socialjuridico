const fs = require('fs');

const file = 'e:/Documentos/Alura/cliente/Carlos/SJ/socialjuridico/src/app/dashboard/cliente/page.js';
let content = fs.readFileSync(file, 'utf8');

const newSnippet = `                
                {selectedCaso.advogado_id ? (
                  <Link href={\`/chat/\${selectedCaso.id}\`} className={styles.chatBtn} style={{textDecoration:'none',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <MessageSquare size={18} style={{marginRight:8}} />
                    Iniciar Chat com Advogado
                  </Link>
                ) : (
                  <button type="button" className={styles.chatBtn} disabled title="Aguardando um advogado ser vinculado ao caso">
                    <MessageSquare size={18} style={{marginRight:8}} />
                    Aguardando advogado...
                  </button>
                )}`;

// Use regex to match the button block regardless of exact whitespace
const regex = /\s*<button\s+\n\s+type="button"\s+\n\s+className=\{styles\.chatBtn\}\s+\n\s+disabled=\{!selectedCaso\.advogado_id\}[\s\S]*?<\/button>/;

if (regex.test(content)) {
  content = content.replace(regex, newSnippet);
  fs.writeFileSync(file, content, 'utf8');
  console.log('SUCCESS: Chat button replaced!');
} else {
  // Fallback: find exact position and splice
  const startMarker = '<button \n                  type="button" \n                  className={styles.chatBtn}';
  const endMarker = 'Iniciar Chat com Advogado\n                </button>';
  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker);
  if (startIdx !== -1 && endIdx !== -1) {
    const before = content.substring(0, startIdx);
    const after = content.substring(endIdx + endMarker.length);
    content = before + newSnippet + after;
    fs.writeFileSync(file, content, 'utf8');
    console.log('SUCCESS(fallback): Chat button replaced!');
  } else {
    console.log('FAILED: Could not find button block.');
    console.log('startMarker found:', startIdx !== -1);
    console.log('endMarker found:', endIdx !== -1);
  }
}
