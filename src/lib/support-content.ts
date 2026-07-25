export type SupportSection = {
  id: string;
  title: string;
  intro?: string;
  blocks: { heading?: string; body: string }[];
};

export const supportSections: SupportSection[] = [
  {
    id: "como-funciona",
    title: "Como o norat funciona",
    intro:
      "Pensa no norat como um porteiro na porta do seu anúncio. Quem não deveria ver sua oferta fica na página segura. Quem passa no filtro vai para a oferta de verdade.",
    blocks: [
      {
        body: "Você coloca o link do norat no anúncio (Meta, Google, TikTok, etc.). Quando alguém clica, o norat analisa esse visitante em milissegundos e decide: oferta ou página segura.",
      },
      {
        body: "Seu site principal, checkout e domínio da loja continuam onde estão. Só o subdomínio de campanha (tipo ads.seudominio.com) passa pelo norat.",
      },
      {
        heading: "Na prática",
        body: "Anúncio → link norat → visitante qualificado vê a oferta. Bot, revisor ou curioso vê conteúdo seguro e congruente com o anúncio — sem acessar sua página real de vendas.",
      },
    ],
  },
  {
    id: "dominios",
    title: "Domínios",
    intro:
      "Antes da campanha, você cadastra um subdomínio só para tráfego pago. É nele que o link do anúncio vai morar.",
    blocks: [
      {
        heading: "Por que um subdomínio?",
        body: "Assim você não mexe no www nem no domínio principal do site. O site da loja continua no ar normalmente. Só ads.seudominio.com (ou outro prefixo que você escolher) aponta para o norat.",
      },
      {
        heading: "O que é o CNAME?",
        body: "É um registro no DNS do seu domínio que diz: “esse subdomínio vai para o norat”. No painel você vê exatamente o que criar — nome, tipo e destino. Depois clica em Validar.",
      },
      {
        heading: "Validado = pronto para usar",
        body: "Quando o status fica verde, o subdomínio já está recebendo tráfego com SSL. Aí você pode escolher esse domínio ao criar a campanha.",
      },
      {
        heading: "URL de origem (opcional)",
        body: "Se no futuro você quiser que visitantes que acessam a raiz do subdomínio (sem /c/) caiam no seu site, informe onde o site está hospedado. Para campanhas, o que importa é o link /c/slug.",
      },
    ],
  },
  {
    id: "criar-campanha",
    title: "Criando uma campanha",
    intro: "O assistente te guia em etapas. Abaixo, o que cada parte significa — sem enrolação.",
    blocks: [
      {
        heading: "1. Nome da campanha",
        body: "É só para você se organizar no painel. Pode ser “Black Friday Meta” ou “Teste TikTok”. O visitante não vê esse nome.",
      },
      {
        heading: "2. Domínio",
        body: "Escolha um domínio já validado. O link final fica algo como https://ads.seudominio.com/c/nome-da-campanha — é esse link que vai no anúncio.",
      },
      {
        heading: "3. Fonte de tráfego",
        body: "Diga de qual plataforma vem o anúncio (Meta, Google, TikTok…). O norat usa isso para conferir se o clique “parece” vir daquela fonte — por exemplo, parâmetros que o Meta costuma enviar.",
      },
      {
        heading: "4. País e dispositivo",
        body: "Quer receber só mobile do Brasil? Marque isso. Quem não se encaixar vai para a página segura. Deixar “todos” é mais permissivo.",
      },
      {
        heading: "5. Página segura",
        body: "O que bots, revisores e tráfego suspeito vão ver. Use uma página neutra, alinhada ao anúncio — artigo, institucional, conteúdo dentro das políticas da plataforma.",
      },
      {
        heading: "6. Página de oferta",
        body: "Onde o visitante qualificado cai de verdade — sua landing, checkout, página de vendas. Pode ser em outro domínio; o norat só redireciona.",
      },
      {
        heading: "7. Ativar a campanha",
        body: "Em rascunho, o link ainda manda todo mundo para a página segura. Quando estiver tudo certo, mude o status para Ativa.",
      },
    ],
  },
  {
    id: "pagina-segura-vs-oferta",
    title: "Página segura vs página de oferta",
    blocks: [
      {
        heading: "Página segura",
        body: "É a “casca” que protege sua operação. Revisores das plataformas, bots e ferramentas de espionagem ficam aqui. Não precisa ser feia — precisa ser congruente com o que você prometeu no anúncio.",
      },
      {
        heading: "Página de oferta",
        body: "É o seu dinheiro de verdade. Só quem passou nos filtros chega aqui. Você pode trocar essa URL no painel quando quiser, sem mudar o link do anúncio.",
      },
      {
        body: "Resumindo: segura = proteção e conformidade. Oferta = conversão. O norat escolhe qual das duas cada clique vê.",
      },
    ],
  },
  {
    id: "como-decide",
    title: "Como o norat decide quem vê o quê",
    intro:
      "Não é sorteio. O sistema olha vários sinais e, se algo não bater, manda para a página segura.",
    blocks: [
      {
        heading: "Campanha pausada ou em rascunho",
        body: "Todo mundo vai para a página segura até você ativar.",
      },
      {
        heading: "Token da campanha",
        body: "Se o token único estiver ligado, o link precisa levar o parâmetro vp_t que o painel gera. Sem ele, o visitante é tratado como suspeito. Isso impede que alguém copie seu link e acesse a oferta direto.",
      },
      {
        heading: "Fonte de tráfego",
        body: "O clique precisa carregar os parâmetros típicos da plataforma escolhida (ex.: Meta costuma enviar fbclid). Acesso “cru”, sem parâmetros de anúncio, tende a ir para a safe.",
      },
      {
        heading: "País e dispositivo",
        body: "Fora do país ou do tipo de aparelho que você marcou? Página segura.",
      },
      {
        heading: "Bots e tráfego estranho",
        body: "User-agent suspeito, padrões de automação, datacenter, comportamento de scraper — o norat filtra antes de liberar a oferta.",
      },
      {
        heading: "E se eu testar no computador?",
        body: "Normal ir para a safe se você abrir o link direto no navegador, sem parâmetros do anúncio, ou de um país/dispositivo que não configurou. Para testar a oferta, use o modo de teste que o painel indica ou simule um clique real da plataforma.",
      },
    ],
  },
  {
    id: "entrega",
    title: "Formas de entrega (redirect, mirror…)",
    intro:
      "Na campanha você escolhe separadamente como entregar a página segura e a página de oferta. Abaixo, o que cada opção faz e um exemplo real de uso.",
    blocks: [
      {
        heading: "Redirect",
        body: "O visitante clica no link do anúncio e é levado direto para outra URL — a da safe ou a da oferta. É o mais simples e o que funciona com qualquer site, loja ou checkout.",
      },
      {
        heading: "Redirect — exemplo na prática",
        body: "Link no anúncio: ads.sualoja.com/c/black-friday. Visitante qualificado → o navegador abre https://checkout.sualoja.com/promo. Revisor ou bot → vai para https://www.sualoja.com/institucional. Na barra do navegador a URL muda e mostra o destino real. Use quando sua oferta está em Shopify, WordPress, Hostinger, Vercel — qualquer hospedagem.",
      },
      {
        heading: "Pre Page",
        body: "Antes de mandar para a página segura, o norat mostra uma página intermediária rápida (pré-página). Só vale para a safe — não é usado na oferta.",
      },
      {
        heading: "Pre Page — exemplo na prática",
        body: "Um revisor clica no anúncio. Em vez de cair direto no artigo seguro, ele vê por um instante uma página neutra do norat e só depois é redirecionado para https://www.sualoja.com/conteudo-educativo. Útil quando você quer uma camada extra na safe ou melhorar métricas de visualização em campanhas de CPM/native.",
      },
      {
        heading: "Mirror",
        body: "O conteúdo da safe ou da oferta aparece “dentro” do link do norat. A barra do navegador continua mostrando ads.sualoja.com/c/... — quem espiona não descobre a URL real da sua página de vendas.",
      },
      {
        heading: "Mirror — exemplo na prática",
        body: "Sua oferta real está em https://oferta-secreta.com/vsl, mas o visitante qualificado vê o conteúdo dessa página sem que a URL mude — continua ads.sualoja.com/c/lancamento. Um concorrente com ferramenta de spy copia o link do anúncio e só vê o domínio do norat, não o domínio da oferta. Bom para nichar e esconder o funil.",
      },
      {
        heading: "Unpack",
        body: "Modo avançado: o redirecionamento passa por um arquivo na sua própria hospedagem (PHP). Funciona melhor quando a safe e a oferta estão no mesmo servidor.",
      },
      {
        heading: "Unpack — exemplo na prática",
        body: "Sua loja e sua página segura estão na mesma Hostinger. Você instala o arquivo que o norat indica na hospedagem e configura safe e oferta apontando para URLs do mesmo domínio — por exemplo safe em sualoja.com/artigo e oferta em sualoja.com/checkout. O norat usa o unpack para entregar sem expor caminhos óbvios. Use só se já domina redirect e mirror; exige acesso à hospedagem.",
      },
      {
        heading: "Qual escolher?",
        body: "Começando agora? Redirect na safe e na oferta. Quer esconder a URL real da oferta? Mirror na oferta. Precisa de camada extra na safe? Pre Page. Tem hospedagem própria com PHP e tudo no mesmo servidor? Aí sim considere Unpack.",
      },
    ],
  },
  {
    id: "link-anuncio",
    title: "O link que vai no anúncio",
    blocks: [
      {
        body: "Depois de criar a campanha, o painel monta o link completo — domínio, slug e parâmetros (incluindo o token, se estiver ativo). Copie e cole na plataforma de anúncios.",
      },
      {
        heading: "Não encurte esse link",
        body: "Encurtadores podem remover parâmetros importantes. Use o link integral que o norat gerou.",
      },
      {
        heading: "Trocou a oferta?",
        body: "Atualize a URL da oferta no painel. O link do anúncio continua o mesmo — não precisa submeter de novo para revisão na plataforma.",
      },
    ],
  },
  {
    id: "metricas",
    title: "Métricas no painel",
    blocks: [
      {
        heading: "Cliques na oferta",
        body: "Visitantes que passaram no filtro e foram para a página de vendas.",
      },
      {
        heading: "Cliques na safe",
        body: "Quem foi filtrado — revisores, bots, tráfego fora do perfil ou sem token válido.",
      },
      {
        body: "Muita safe e pouca oferta pode ser normal no início (revisão da plataforma) ou sinal de filtro apertado demais — confira país, dispositivo e se o link no anúncio está completo.",
      },
    ],
  },
  {
    id: "duvidas",
    title: "Dúvidas frequentes",
    blocks: [
      {
        heading: "Meu site cai se eu usar o norat?",
        body: "Não, se você usar um subdomínio dedicado (ads.). O site principal não muda de hospedagem.",
      },
      {
        heading: "Preciso mudar o link do anúncio toda hora?",
        body: "Não. Você muda páginas no painel; o link do anúncio permanece.",
      },
      {
        heading: "O domínio fica pendente no painel",
        body: "Confira o CNAME no DNS, aguarde a propagação (pode levar até algumas horas) e clique em Validar de novo.",
      },
      {
        heading: "Link não abre / erro de conexão",
        body: "Geralmente é DNS ainda propagando ou subdomínio recém-criado. Valide no painel e espere alguns minutos após o status verde.",
      },
      {
        heading: "Ainda precisa de ajuda?",
        body: "Fale com o suporte pelo e-mail do seu plano. Informe o domínio da campanha, o slug e um print do que aparece no painel.",
      },
    ],
  },
];
