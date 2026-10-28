// [longitude, latitude]. Sources and precision are kept with the seed for review.
export const campusPlaces = [
  {
    key: 'ru-campus',
    name: 'Restaurante Universitário — RU Campus',
    category: 'Alimentação',
    position: [-43.3742, -21.7778],
    description:
      '4ª plataforma, junto à Engenharia. Posição aproximada do prédio; confirmar entrada acessível.',
    source: 'https://www2.ufjf.br/ru/?page_id=2861',
    precision: 'approximate',
  },
  {
    key: 'biblioteca-central',
    name: 'Biblioteca Central',
    category: 'Bibliotecas',
    position: [-(43 + 22 / 60 + 8.11 / 3600), -(21 + 46 / 60 + 26.7 / 3600)],
    description: 'Biblioteca Central, junto à Reitoria.',
    source:
      'https://www2.ufjf.br/ambienteconstruido/files/2015/06/Miriam-Carla-do-Nascimento-Dias.pdf#page=160',
    precision: 'published-coordinate',
  },
  {
    key: 'ich',
    name: 'Instituto de Ciências Humanas — ICH',
    category: 'Institutos',
    position: [-43.36548126928097, -21.77324882363144],
    description: 'Novo ICH. Referência aproximada junto à parada do instituto.',
    source: 'legacy/bus-stops.ts:ICH; https://www2.ufjf.br/bach/utilidades/mapas/mapa-do-ich/',
    precision: 'approximate',
  },
  {
    key: 'biblioteca-ich',
    name: 'Biblioteca Setorial do ICH',
    category: 'Bibliotecas',
    position: [-43.36548126928097, -21.77324882363144],
    description: 'Complexo do ICH. Referência do instituto; entrada da biblioteca a confirmar.',
    source: 'https://www2.ufjf.br/bach/utilidades/mapas/mapa-do-ich/',
    precision: 'approximate',
  },
  {
    key: 'engenharia',
    name: 'Faculdade de Engenharia',
    category: 'Faculdades',
    position: [-43.372475, -21.778291],
    description: 'Faculdade de Engenharia — campus universitário.',
    source: 'https://www2.ufjf.br/engenharia/diversos/localizacao/',
    precision: 'published-coordinate',
  },
  {
    key: 'hu-dom-bosco',
    name: 'Hospital Universitário — HU Dom Bosco',
    category: 'Saúde',
    position: [-43.36855, -21.7861],
    description:
      'Av. Eugênio do Nascimento, s/n — Dom Bosco. Unidade externa ao campus; acesso pelo circular não garantido.',
    source:
      'https://saudenopais.com/estabelecimento/mg/hospital-universitario-da-ufjf-cnes-2218798/',
    precision: 'published-coordinate',
  },
  {
    key: 'npj-centro',
    name: 'Núcleo de Prática Jurídica — NPJ Centro',
    category: 'Serviços externos',
    position: [-43.3454, -21.7626],
    description:
      'Av. Presidente Itamar Franco, 988 — Centro. Posição aproximada na avenida, a confirmar no nº 988. Unidade externa, não atendida pelo circular do campus.',
    source: 'https://www2.ufjf.br/cartadeservicos2/nucleo-de-pratica-juridica/',
    precision: 'approximate',
  },
] as const;
