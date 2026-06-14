# Atualizações das Rotas `/sou-advogado` e `/termos`

**Data:** 08 de junho de 2026

## Objetivo

Este documento registra as alterações realizadas nas rotas públicas voltadas a advogados e aos Termos de Uso do Social Jurídico.

A refatoração teve como foco:

- alinhar linguagem, identidade visual e navegação com a nova Home;
- reduzir promessas excessivas ou juridicamente arriscadas;
- atualizar recursos, planos e funcionamento real da plataforma;
- melhorar acessibilidade e responsividade;
- ampliar transparência sobre contratação, IA, dados, pagamentos e responsabilidades;
- preparar os documentos para revisão jurídica formal.

---

# 1. Rota `/sou-advogado`

## 1.1. Posicionamento da página

A rota deixou de utilizar uma comunicação agressiva baseada em frases como:

- “Capte clientes reais”;
- “Automatize seu escritório com IA”;
- “Começar agora grátis”;
- “Clientes reais e comprometidos”;
- “Fechar casos”.

A nova mensagem é mais institucional e condizente com o papel da plataforma:

> Mais oportunidades e mais organização para sua advocacia.

A página agora apresenta o Social Jurídico como ambiente de:

- acesso a casos publicados;
- consulta ao Radar Jurídico;
- gestão de clientes;
- organização de documentos;
- comunicação;
- agenda e prazos;
- ferramentas profissionais.

---

## 1.2. Hero

O Hero foi totalmente reformulado.

### Principais mudanças

- remoção do badge genérico “Tecnologia para advogados”;
- nova headline institucional;
- novo subtítulo com foco em oportunidades e organização;
- CTA principal para criação de perfil profissional;
- CTA secundário para conhecer os planos;
- reforços de confiança;
- três pilares visuais:
  - casos publicados;
  - Radar Jurídico;
  - gestão integrada;
- identidade visual alinhada à Home principal;
- responsividade para desktop, tablet e mobile;
- suporte a foco por teclado e movimento reduzido.

### Nova ação principal

```text
Criar meu perfil profissional
```

### Ação secundária

```text
Conhecer os planos
```

---

## 1.3. Como funciona para advogados

A jornada antiga baseada em “Juris”, análise automática de viabilidade e liberação de contato foi removida.

A nova jornada possui três etapas:

1. **Crie seu perfil profissional**
   - dados profissionais;
   - inscrição na OAB;
   - áreas de atuação;
   - informações de experiência.

2. **Encontre oportunidades**
   - casos publicados na plataforma;
   - oportunidades do Radar Jurídico.

3. **Converse e organize**
   - manifestação de interesse;
   - chat;
   - documentos;
   - tarefas;
   - histórico de atendimento.

Também foi incluído aviso de que a manifestação de interesse não garante contratação e que honorários e relação profissional são definidos entre advogado e cliente.

---

## 1.4. Recursos profissionais

A seção antiga possuía apenas quatro recursos e continha promessas absolutas.

A nova seção passou a apresentar oito pilares:

1. Casos publicados;
2. Radar Jurídico;
3. CRM Jurídico;
4. Agenda e prazos;
5. Assinatura digital;
6. Notificação Extrajudicial Blindada;
7. Inteligência Artificial Jurídica;
8. Atendimento centralizado.

Foram removidas expressões como:

- “imutabilidade garantida”;
- “cadeia de custódia válida”;
- “IA especializada”;
- “análise definitiva de viabilidade”.

A nova redação comunica recursos sem prometer validade, resultado ou desempenho absoluto.

---

## 1.5. Planos Start e Pro

Os planos antigos foram substituídos.

### Plano Start

```text
R$ 40,99/mês
Primeiro mês por R$ 10,99
```

Direcionado a advogados que desejam começar a acessar oportunidades e organizar atendimentos.

### Plano Pro

```text
R$ 87,90/mês
Primeiro mês por R$ 10,99
```

Direcionado a profissionais que desejam mais recursos, gestão e acesso a ferramentas avançadas.

### Remoções

Foram removidos:

- “Consultar valor”;
- 7 Juris;
- 20 Juris;
- acesso ilimitado sem comprovação;
- IA ilimitada;
- preços antigos de notificação;
- selo de autoridade sem regra validada.

### Aviso comercial

Foi acrescentado que limites, condições promocionais e recursos podem variar conforme as regras comerciais vigentes.

Os limites exatos de IA, Radar, notificações, armazenamento e demais ferramentas ainda devem ser preenchidos e validados.

---

## 1.6. CTA final

O CTA antigo dizia:

> Pronto para transformar sua advocacia?

E afirmava que centenas de advogados já estavam fechando casos.

A nova versão utiliza:

> Centralize oportunidades, clientes e ferramentas em uma única plataforma.

### Ações

- Criar meu perfil profissional;
- Comparar planos.

### Reforços

- cadastro profissional;
- escolha consciente do plano antes da contratação.

---

## 1.7. CSS e identidade visual

A rota passou a utilizar:

- variáveis globais de cores;
- fonte global Geist;
- fundo escuro institucional;
- dourado como destaque;
- cards discretos;
- menor dependência de efeitos comerciais;
- grids responsivos;
- `prefers-reduced-motion`;
- foco visível;
- melhor consistência com a Home.

---

## 1.8. Pendências da rota `/sou-advogado`

Antes da publicação definitiva:

- executar `npm run build`;
- remover imports não utilizados;
- confirmar leitura dos parâmetros:
  - `perfil=advogado`;
  - `plano=start`;
  - `plano=pro`;
- validar preços e promoção;
- preencher limites exatos dos planos;
- testar dispositivos móveis;
- revisar links e âncoras;
- considerar FAQ exclusivo para advogados.

---

# 2. Rota `/termos`

## 2.1. Reestruturação do documento

A rota deixou de ser um documento curto com nove cláusulas e passou a funcionar como uma minuta completa dos Termos de Uso.

A nova estrutura possui:

- Hero jurídico;
- versão do documento;
- data de atualização;
- tempo estimado de leitura;
- links relacionados;
- sumário navegável;
- conteúdo dividido por cláusulas;
- avisos importantes;
- responsividade;
- navegação acessível.

---

## 2.2. Cláusulas incluídas

A minuta passou a abordar:

1. Aceitação dos Termos;
2. Definições;
3. Natureza da plataforma;
4. Cadastro e elegibilidade;
5. Segurança da conta;
6. Publicação de casos;
7. Utilização por advogados;
8. Radar Jurídico;
9. Comunicação e contratação;
10. Planos, cobrança e renovação;
11. Cancelamento, arrependimento e reembolso;
12. Inteligência Artificial;
13. Conteúdo enviado pelo usuário;
14. Documentos e assinatura digital;
15. Notificação Extrajudicial Blindada;
16. Condutas proibidas;
17. Propriedade intelectual;
18. Suspensão e encerramento de contas;
19. Privacidade e proteção de dados;
20. Retenção, exclusão e anonimização;
21. Direitos dos titulares;
22. Disponibilidade e alterações do serviço;
23. Limitações e responsabilidades;
24. Legislação aplicável e foro;
25. Contato.

A numeração deve permanecer sincronizada com o sumário após qualquer alteração futura.

---

## 2.3. Identificação atual da plataforma

Enquanto a regularização empresarial estiver em andamento, foram definidos:

```text
Nome: Social Jurídico
Localidade: Sorocaba — SP
E-mail: socialjuridico3@gmail.com
CNPJ: em processo de constituição e regularização
```

A razão social e o CNPJ deverão ser adicionados após a conclusão do processo conduzido por Carlos.

---

## 2.4. Natureza da plataforma

Os Termos passaram a deixar claro que o Social Jurídico:

- é uma plataforma tecnológica;
- não é escritório de advocacia;
- não presta consultoria ou representação jurídica;
- não escolhe advogados pelos clientes;
- não define honorários;
- não participa da contratação;
- não garante atendimento, resposta ou resultado.

---

## 2.5. Verificação da OAB

Foi documentado o processo atual:

- verificação manual;
- contato direto com o advogado cadastrado;
- consulta ao ConfirmADV;
- possibilidade de solicitar documentos adicionais;
- limitação de recursos enquanto a validação estiver pendente;
- suspensão em caso de divergência ou irregularidade.

A validação confirma apenas as informações profissionais disponíveis no momento da consulta e não garante qualidade, especialização ou resultado.

---

## 2.6. Radar Jurídico

Os Termos passaram a informar que:

- o Radar organiza oportunidades;
- acesso depende de plano e limites;
- a oportunidade não representa contratação garantida;
- o advogado deve verificar origem, pertinência e atualidade;
- informações podem vir de fontes públicas, integrações autorizadas ou cadastros internos.

---

## 2.7. Inteligência Artificial

Foi reforçado que:

- respostas podem conter erros;
- IA não substitui advogado;
- documentos precisam ser revisados;
- o advogado responde pelo conteúdo utilizado;
- clientes não devem tomar decisões jurídicas apenas com base em IA;
- dados confidenciais não devem ser enviados sem necessidade;
- limites podem variar conforme o plano.

---

## 2.8. Planos e gateways

Foram registrados os gateways atuais:

```text
Stripe
InfinitePay
```

A seção de cobrança passou a tratar de:

- recorrência;
- renovação automática;
- promoção;
- falha de pagamento;
- suspensão de recursos;
- mudança de preço;
- limites conforme plano;
- processamento por terceiros;
- não armazenamento direto dos dados completos de cartão.

---

## 2.9. Cancelamento, arrependimento e reembolso

Foi criada política com os seguintes pontos:

- cancelamento pelos canais da plataforma ou e-mail;
- interrupção de novas cobranças após cancelamento válido;
- manutenção do acesso até o fim do período pago, salvo regra diversa;
- análise de cobrança posterior ao cancelamento;
- direito de arrependimento quando aplicável;
- reembolso por cobrança duplicada;
- reembolso por erro operacional;
- reembolso por cobrança indevida;
- análise de indisponibilidade relevante;
- consideração de recursos já consumidos;
- tratamento de chargebacks abusivos.

A aplicação do Código de Defesa do Consumidor deve ser avaliada conforme o caso concreto.

---

## 2.10. Retenção e exclusão

Foi proposta a seguinte política operacional:

- dados ativos mantidos enquanto necessários;
- exclusão ou anonimização preferencialmente em até 30 dias após pedido válido;
- cópias residuais em backups por até 180 dias;
- conservação de dados quando necessária para obrigação legal, prevenção de fraude ou exercício regular de direitos;
- manutenção de dados financeiros pelos prazos aplicáveis;
- manutenção de logs de segurança;
- impossibilidade de recuperação após exclusão definitiva;
- exclusão da conta não remove automaticamente cópias legitimamente mantidas por outros usuários.

### Atenção

Os prazos de 30 e 180 dias são políticas propostas e somente devem permanecer publicados se a infraestrutura conseguir cumpri-los.

---

## 2.11. Foro e contato

Foi definido:

```text
Foro: Comarca de Sorocaba — SP
```

Com ressalva para regras legais obrigatórias e direitos do consumidor.

Contato oficial:

```text
socialjuridico3@gmail.com
```

Localidade:

```text
Sorocaba — SP
```

---

## 2.12. Visual e UX dos Termos

A nova página utiliza:

- sumário lateral fixo no desktop;
- sumário em grade no tablet;
- lista vertical no mobile;
- cláusulas em blocos legíveis;
- avisos e destaques;
- âncoras com `scroll-margin-top`;
- foco por teclado;
- contraste adequado;
- links para privacidade, exclusão e contato.

A rota foi desenhada como documento jurídico digital, e não como landing page.

---

## 2.13. Pendências jurídicas e operacionais

Antes da publicação definitiva:

- inserir razão social e CNPJ;
- validar os prazos de exclusão e backup;
- confirmar política fiscal e emissão de documentos;
- revisar cancelamento e reembolso com advogado;
- revisar foro e limitação de responsabilidade;
- confirmar regras comerciais dos planos;
- revisar origem e operação do Radar;
- validar integração com Stripe e InfinitePay;
- submeter todo o documento à revisão jurídica formal.

---

# 3. Correção posterior no FAQ da Home

Foi identificado erro ao abrir perguntas frequentes:

```text
ReferenceError: trackEvent is not defined
```

A causa era uma chamada ao evento `faq_open` sem que a infraestrutura de analytics tivesse sido criada.

Como o rastreamento detalhado será implementado posteriormente no dashboard administrativo, a chamada foi removida e o FAQ voltou a utilizar apenas o controle local de abertura:

```js
function toggleFAQ(index) {
  setOpenIndex((currentIndex) =>
    currentIndex === index ? null : index,
  );
}
```

---

# 4. Status atual

## `/sou-advogado`

Estrutura, conteúdo e direção visual concluídos. Pendente validação técnica e comercial.

## `/termos`

Estrutura e minuta operacional concluídas. Pendente revisão jurídica formal e inclusão dos dados empresariais definitivos.
