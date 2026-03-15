const fs = require('fs');

const file = 'e:/Documentos/Alura/cliente/Carlos/SJ/socialjuridico/src/app/dashboard/cliente/page.js';
let content = fs.readFileSync(file, 'utf8');

// Fix 1: Replace the logout Link with a button that calls /api/auth/logout
const oldLogout = '<Link href="/login" className={`${styles.navItem} ${styles.logoutBtn}`} title="Sair">\n            <LogOut size={22} />\n            {!isSidebarCollapsed && <span>Sair</span>}\n          </Link>';
const newLogout = `<button
            className={\`\${styles.navItem} \${styles.logoutBtn}\`}
            title="Sair"
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/login';
            }}
          >
            <LogOut size={22} />
            {!isSidebarCollapsed && <span>Sair</span>}
          </button>`;

// Fix 2: Replace supabase.auth.signOut() with API call in deleteAccount
const oldDelete = 'await supabase.auth.signOut();\n      window.location.href = "/";';
const newDelete = `await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = "/";`;

let changed = false;
if (content.includes(oldLogout)) {
  content = content.replace(oldLogout, newLogout);
  console.log('✅ Logout button replaced.');
  changed = true;
} else {
  console.log('❌ Logout Link not found. Searching partial...');
  const partial = 'href="/login" className={`${styles.navItem} ${styles.logoutBtn}';
  const idx = content.indexOf(partial);
  console.log('  partial at idx:', idx);
}

if (content.includes(oldDelete)) {
  content = content.replace(oldDelete, newDelete);
  console.log('✅ Delete account logout replaced.');
  changed = true;
} else {
  console.log('❌ Delete signOut not found.');
}

if (changed) {
  fs.writeFileSync(file, content, 'utf8');
  console.log('File saved.');
}
