# Atualizações da Home

**Data:** 08 de junho de 2026

## Objetivo da refatoração

A Home do Social Jurídico foi revisada com foco em:

- melhorar clareza e conversão;
- reforçar o posicionamento institucional da plataforma;
- separar melhor a comunicação para clientes e advogados;
- reduzir promessas excessivas;
- melhorar responsividade, acessibilidade e experiência mobile;
- aproximar a navegação mobile da experiência de um aplicativo nativo;
- fortalecer a credibilidade da plataforma com dados e informações reais.

---

## 1. Layout global e metadados

Foram revisados os metadados globais da aplicação, incluindo:

- `metadataBase` com o domínio oficial;
- título padrão e template para páginas internas;
- descrição mais clara da plataforma;
- Open Graph;
- Twitter Card;
- robots e Google Bot;
- manifest e ícones;
- viewport e cor de tema.

Também foi mantida, por enquanto, a estrutura global com:

- `AccessTracker`;
- `OneSignalSetup`;
- `Toaster`;
- `PWAInstallPrompt`;
- `Footer`;
- `ScrollToTop`.

No `globals.css`, a fonte principal passou a utilizar a variável da fonte Geist carregada pelo Next.js.

---

## 2. Hero

O Hero foi reformulado para manter um visual centralizado, institucional e sóbrio.

### Principais mudanças

- nova headline mais clara;
- foco principal em clientes;
- CTA principal para publicação gratuita do caso;
- CTA secundário para advogados;
- remoção do badge genérico “Plataforma jurídica digital”;
- reforço de confiança com publicação gratuita e comunicação segura;
- melhoria de espaçamento, tipografia e responsividade;
- visual mais institucional, sem aparência excessiva de landing page comercial.

### Contadores mantidos

Foram mantidos quatro indicadores estratégicos:

- clientes cadastrados;
- advogados cadastrados;
- casos abertos;
- oportunidades disponíveis no Radar Jurídico.

Os números são arredondados para baixo e exibidos com `+`, reforçando crescimento contínuo da plataforma.

Exemplo:

- `178` clientes → `170+`;
- `337` advogados → `330+`;
- `12` casos → `10+`;
- `63` oportunidades → `60+`.

A contagem do Radar segue a mesma regra da API:

```js
.eq("status", "aprovado")
.lt("cliques_count", 5)
```

Em caso de falha de consulta, o contador correspondente não é exibido, evitando mostrar `0+` incorretamente.

---

## 3. Features

A seção de funcionalidades deixou de destacar apenas ferramentas para advogados e passou a apresentar recursos voltados ao cliente.

### Novos recursos apresentados

1. **Conte seu caso do seu jeito**  
   Relato por texto, áudio ou vídeo.

2. **Anjo Jurídico**  
   Inteligência artificial que ajuda a explicar termos jurídicos em linguagem simples.

3. **Chat completo**  
   Mensagens, áudios, arquivos e comunicação organizada.

4. **Videochamada integrada**  
   Atendimento por vídeo dentro da própria plataforma.

Também foi adicionada uma observação esclarecendo que o Anjo Jurídico possui caráter informativo e não substitui a orientação profissional do advogado.

---

## 4. Differences

A antiga comparação entre “Advocacia Tradicional” e “Social Jurídico” foi removida.

A nova seção evita críticas generalizadas à advocacia e passa a explicar os diferenciais da experiência na plataforma.

### Novos diferenciais

- publicação gratuita;
- advogados demonstram interesse;
- cliente mantém a liberdade de escolha;
- atendimento centralizado.

Também foi incluída uma observação institucional informando que a contratação e a relação profissional são definidas diretamente entre cliente e advogado.

---

## 5. How It Works

A seção “Como funciona” foi mantida em duas jornadas:

### Para clientes

1. Conte o que aconteceu;
2. Publique gratuitamente;
3. Escolha e converse.

### Para advogados

1. Crie seu perfil profissional;
2. Acesse oportunidades;
3. Atenda e organize.

Foram removidas promessas como:

- “clientes reais e comprometidos”;
- “demandas sérias garantidas”;
- “resolução digital”.

Também foram corrigidos os links que antes apontavam para âncoras inexistentes.

---

## 6. Community

A seção Community foi reposicionada para contar a origem real do Social Jurídico.

A plataforma nasceu a partir da experiência do grupo no Facebook **“Preciso de um Advogado”**, criado há mais de sete anos.

### Dados apresentados

- mais de 7 anos de história;
- mais de 16 mil membros;
- mais de 24 mil visualizações recentes;
- integração entre comunidade e plataforma.

A seção agora explica que as necessidades identificadas dentro da comunidade inspiraram a criação do Social Jurídico.

Também foi removido o uso de avaliações simuladas e estatísticas sem comprovação.

### Imagem utilizada

O componente espera a capa da comunidade em:

```text
public/community/preciso-de-um-advogado.webp
```

---

## 7. Testimonials

A seção de depoimentos foi removida temporariamente da Home.

### Motivo

Os depoimentos antigos estavam definidos diretamente no código e poderiam ser interpretados como avaliações verificadas.

A seção poderá ser reativada futuramente quando houver:

- avaliações reais;
- autorização dos usuários;
- nota verdadeira;
- identificação adequada;
- origem comprovável do depoimento.

A importação e renderização do componente foram removidas do `page.js`.

---

## 8. FAQ

O FAQ foi ampliado e passou a responder às principais objeções de clientes e advogados.

### Temas incluídos

- gratuidade da publicação;
- diferença entre publicação e contratação;
- funcionamento do contato;
- liberdade de escolha;
- privacidade e dados sensíveis;
- envio de áudio, vídeo e documentos;
- funcionamento do Anjo Jurídico;
- papel do Social Jurídico;
- contratação e honorários;
- identificação dos advogados;
- funcionamento para profissionais;
- Radar Jurídico.

Também foram melhorados:

- acessibilidade do acordeão;
- `aria-expanded`;
- `aria-controls`;
- foco por teclado;
- responsividade;
- suporte a `prefers-reduced-motion`.

---

## 9. CTA final

O CTA final foi reformulado para evitar promessas de resolução jurídica.

### Nova mensagem

> Dê o primeiro passo para encontrar apoio jurídico.

### Ações

- publicar caso gratuitamente;
- conhecer a plataforma para advogados.

Também foram adicionados reforços de confiança:

- publicação gratuita;
- liberdade para escolher com quem conversar;
- ausência de obrigação de contratação.

O CTA deixou de ser um card pequeno isolado e passou a funcionar como uma faixa ampla integrada ao encerramento da página.

---

## 10. MobileNav

A navegação inferior mobile foi preservada e aprimorada para reforçar a aparência de aplicativo nativo.

### Nova estrutura

1. Início;
2. Como funciona;
3. Publicar;
4. Comunidade;
5. Dúvidas.

O botão central “Publicar” recebeu maior destaque visual.

### Melhorias técnicas

- suporte à área segura de iPhones;
- detecção da seção ativa durante o scroll;
- listener passivo;
- `aria-current="location"`;
- foco por teclado;
- suporte a movimento reduzido;
- compensação de espaço inferior no `body`.

No `globals.css` foi adicionada a reserva inferior:

```css
@media (max-width: 767px) {
  body {
    padding-bottom: calc(72px + env(safe-area-inset-bottom));
  }
}
```

---

## 11. Footer

O Footer foi reformulado para reforçar transparência e institucionalidade.

### Principais mudanças

- nova descrição institucional;
- remoção da alegação “plataforma líder”;
- remoção de links sociais com `href="#"`;
- remoção do botão público para área administrativa;
- atualização das rotas para clientes e advogados;
- manutenção dos links legais no mobile;
- inclusão de contato e comunidade;
- melhoria da responsividade;
- remoção de dependência de seletores frágeis como `nth-child`;
- redução de `!important`.

### Aviso institucional

Foi incluído o esclarecimento:

> O Social Jurídico é uma plataforma de tecnologia e não presta serviços advocatícios. A contratação e a relação profissional são estabelecidas diretamente entre cliente e advogado.

O copyright passou a utilizar:

```text
© 2026 Social Jurídico. Todos os direitos reservados.
```

até que a razão social oficial seja confirmada.

---

## 12. ScrollToTop

O botão de voltar ao topo foi ajustado para funcionar corretamente com a navegação inferior mobile.

### Melhorias

- posicionamento acima do `MobileNav`;
- `z-index` inferior ao da navegação;
- listener passivo;
- execução inicial ao montar;
- respeito a `prefers-reduced-motion`;
- foco visível;
- visual alinhado à identidade da plataforma.

No mobile, o botão utiliza:

```css
bottom: calc(88px + env(safe-area-inset-bottom));
```

---

## 13. PWAInstallPrompt

O convite de instalação da PWA foi revisado para não interromper o visitante cedo demais.

### Novo comportamento

- aparece apenas em dispositivos móveis;
- não aparece se a PWA já estiver instalada;
- abre automaticamente somente a partir da segunda visita;
- aguarda 15 segundos antes de aparecer;
- não reaparece por sete dias após ser fechado;
- fecha automaticamente após a instalação;
- pode ser aberto manualmente por evento;
- fica acima do `MobileNav`;
- possui instruções específicas para iOS;
- usa instruções genéricas para outros navegadores;
- não promete notificações automáticas;
- texto adequado para clientes e advogados.

### Evento para abertura manual

```js
window.dispatchEvent(new Event("openPWAInstallModal"));
```

### Novas chaves de armazenamento

```text
socialjuridico:pwa-install-dismissed-at
socialjuridico:pwa-visit-count
```

O CSS foi separado em:

```text
src/components/PWA/PWAInstallPrompt.module.css
```

---

## 14. Estrutura final da Home

A Home passou a seguir esta ordem:

```jsx
<Header />
<Hero />
<Features />
<Differences />
<HowItWorks />
<Community />
<FAQ />
<CTA />
<MobileNav />
```

O componente `Testimonials` foi removido temporariamente.

---

## 15. Direção visual adotada

A nova Home segue uma identidade:

- institucional;
- escura;
- sóbria;
- com dourado usado apenas como destaque;
- centralizada nos pontos principais;
- sem excesso de badges;
- sem aparência genérica de template SaaS;
- sem promessas exageradas;
- com hierarquia clara entre cliente e advogado;
- responsiva e preparada para dispositivos móveis.

---

## 16. Próximos passos recomendados

- validar todas as rotas utilizadas no Footer e CTAs;
- confirmar a imagem da comunidade;
- validar os números exibidos na Home;
- revisar o comportamento do Header com o novo Hero;
- testar o MobileNav em iOS e Android;
- testar a instalação da PWA em navegadores diferentes;
- revisar o `ScrollToTop` em conjunto com o Footer;
- medir cliques nos CTAs e abandono de cadastro;
- adicionar avaliações reais futuramente;
- revisar segurança e separação do cliente administrativo do Supabase.
