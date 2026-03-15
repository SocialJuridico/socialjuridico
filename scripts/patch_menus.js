const fs = require('fs');
const file = 'e:/Documentos/Alura/cliente/Carlos/SJ/socialjuridico/src/app/dashboard/cliente/page.js';
let c = fs.readFileSync(file, 'utf8');

// 2. Adicionar os dois novos itens de menu na sidebar (antes do botão Sair)
const oldNav = '          <button\n            className={`${styles.navItem} ${styles.logoutBtn}`}';
const newNavItems = `          <Link href="#" className={\`\${styles.navItem} \${activeTab === 'meus-casos' ? styles.activeNavItem : ''}\`} onClick={() => setActiveTab('meus-casos')} title="Meus Casos">
            <FileText size={22} />
            {!isSidebarCollapsed && <span>Meus Casos</span>}
          </Link>
          <Link href="#" className={\`\${styles.navItem} \${activeTab === 'conversas' ? styles.activeNavItem : ''}\`} onClick={() => setActiveTab('conversas')} title="Minhas Conversas">
            <MessageSquare size={22} />
            {!isSidebarCollapsed && <span>Minhas Conversas</span>}
          </Link>
          <Link href="#" className={\`\${styles.navItem} \${styles.logoutBtn}\`}`;

if (!c.includes(oldNav)) { console.log('❌ Nav anchor not found'); process.exit(1); }
c = c.replace(oldNav, newNavItems);
console.log('✅ Nav items added');

// 3. Atualizar o título do header
const oldTitle = `activeTab === 'painel' ? 'Painel' : 
              activeTab === 'novo' ? 'Novo Caso' : 
              activeTab === 'notificacoes' ? 'Notificações' : 'Meu Perfil'`;
const newTitle = `activeTab === 'painel' ? 'Painel' :
              activeTab === 'novo' ? 'Novo Caso' :
              activeTab === 'notificacoes' ? 'Notificações' :
              activeTab === 'meus-casos' ? 'Meus Casos' :
              activeTab === 'conversas' ? 'Minhas Conversas' :
              'Meu Perfil'`;
if (c.includes(oldTitle)) { c = c.replace(oldTitle, newTitle); console.log('✅ Header title updated'); }
else { console.log('⚠️  Header title not found - skipping'); }

// 4. Adicionar as tabs de conteúdo antes do fechamento de pageBody
const oldPageBodyClose = `        </section>
      </main>`;
const meuscasosTab = `          {activeTab === 'meus-casos' && (
            <div className={styles.meusCasosPage}>
              <div className={styles.sectionHeader} style={{marginBottom: '24px'}}>
                <h2 className={styles.sectionTitle}>Todos os Meus Casos</h2>
                <button onClick={() => setActiveTab('novo')} className={styles.addNewBtn}>+ Novo Caso</button>
              </div>
              {loadingCasos ? (
                <p style={{padding: '20px', opacity: 0.6}}>Carregando seus casos...</p>
              ) : casos.length > 0 ? (
                <div className={styles.casosFullGrid}>
                  {casos.map((caso) => (
                    <div key={caso.id} className={styles.caseCardFull} onClick={() => handleOpenEditModal(caso)}>
                      <div className={styles.caseCardHeader}>
                        <span className={styles.badge}>{caso.status}</span>
                        <span className={styles.date}>{new Date(caso.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <h3 className={styles.caseTitleCard}>{caso.titulo}</h3>
                      <p className={styles.caseAreaTag}>{caso.area_atuacao || 'Área não definida'}</p>
                      <p className={styles.caseDesc}>{caso.descricao?.substring(0, 150)}...</p>
                      <div className={styles.caseCardFooter}>
                        {caso.advogado_id ? (
                          <span className={styles.advTag}>✔ Advogado vinculado</span>
                        ) : (
                          <span className={styles.noAdvTag}>⏳ Aguardando advogado</span>
                        )}
                        <span className={styles.editHint}>Clique para editar →</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyStateMinimal} style={{padding: '60px 20px', textAlign: 'center', opacity: 0.7}}>
                  <FileText size={56} style={{marginBottom: '16px', color: 'var(--color-gold)'}} />
                  <p style={{fontSize: '1.1rem', fontWeight: 700}}>Nenhum caso registrado</p>
                  <p style={{marginTop: '8px', opacity: 0.6}}>Clique em "Novo Caso" para criar o seu primeiro caso.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'conversas' && (
            <div className={styles.conversasPage}>
              <div className={styles.sectionHeader} style={{marginBottom: '24px'}}>
                <h2 className={styles.sectionTitle}>Minhas Conversas</h2>
              </div>
              {loadingCasos ? (
                <p style={{padding: '20px', opacity: 0.6}}>Carregando...</p>
              ) : casos.filter(c => c.advogado_id).length > 0 ? (
                <div className={styles.conversasList}>
                  {casos.filter(caso => caso.advogado_id).map((caso) => (
                    <div
                      key={caso.id}
                      className={styles.conversaItem}
                      onClick={() => window.location.href = \`/chat/\${caso.id}\`}
                    >
                      <div className={styles.conversaAvatar}>
                        <Scale size={20} />
                      </div>
                      <div className={styles.conversaInfo}>
                        <h3 className={styles.conversaTitulo}>{caso.titulo}</h3>
                        <p className={styles.conversaArea}>{caso.area_atuacao || 'Área não definida'}</p>
                      </div>
                      <div className={styles.conversaStatus}>
                        <span className={styles.badge}>{caso.status}</span>
                        <span className={styles.conversaArrow}>→</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyStateMinimal} style={{padding: '60px 20px', textAlign: 'center', opacity: 0.7}}>
                  <MessageSquare size={56} style={{marginBottom: '16px', color: 'var(--color-gold)'}} />
                  <p style={{fontSize: '1.1rem', fontWeight: 700}}>Nenhuma conversa iniciada</p>
                  <p style={{marginTop: '8px', opacity: 0.6}}>Conversas aparecem quando um advogado é vinculado ao seu caso.</p>
                </div>
              )}
            </div>
          )}

        </section>
      </main>`;

c = c.replace(oldPageBodyClose, meuscasosTab);
console.log('✅ Tab content added');

fs.writeFileSync(file, c, 'utf8');
console.log('✅ File saved!');
