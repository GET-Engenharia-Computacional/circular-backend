// Historical source: b39d0152ab4736df37120efd61f07c0e25272f08:seed_bus_stops.sql
// Coordinates are preserved, not independently surveyed. position = [longitude, latitude].
export const legacySource = {
  commit: 'b39d0152ab4736df37120efd61f07c0e25272f08',
  path: 'seed_bus_stops.sql',
  sha256: '9ddf5b2ffa5c000019bbca3189d2bb21e95e33b731c409a6a0c9b4ae0bf5ac69',
} as const;
export interface LegacyStop {
  legacyId: string;
  longName: string;
  shortName: string;
  position: readonly [number, number];
  reviewReasons: readonly string[];
}
export const legacyStops: readonly LegacyStop[] = [
  {
    legacyId: '00000000-0000-0000-0000-000000000001',
    longName: 'Corpo de Bombeiros',
    shortName: 'Bombeiros',
    position: [-43.36767978223414, -21.780375186922893],
    reviewReasons: [],
  },
  {
    legacyId: '00000000-0000-0000-0000-000000000002',
    longName: 'Portao Sul (Ponto do Trailer)',
    shortName: 'Portao Sul',
    position: [-43.36806080082189, -21.78014172235481],
    reviewReasons: [],
  },
  {
    legacyId: '00000000-0000-0000-0000-000000000003',
    longName: 'Faculdade de Farmacia',
    shortName: 'Farmacia',
    position: [-43.367347078105205, -21.77748989809465],
    reviewReasons: [],
  },
  {
    legacyId: '00000000-0000-0000-0000-000000000004',
    longName: 'Faculdade de Economia',
    shortName: 'Economia',
    position: [-43.36421729142947, -21.775633440843915],
    reviewReasons: [],
  },
  {
    legacyId: '00000000-0000-0000-0000-000000000005',
    longName: 'ICH',
    shortName: 'ICH',
    position: [-43.36548126928097, -21.77324882363144],
    reviewReasons: [],
  },
  {
    legacyId: '00000000-0000-0000-0000-000000000006',
    longName: 'Faculdade de Direito',
    shortName: 'Direito',
    position: [-43.36730777722921, -21.774045451462392],
    reviewReasons: [],
  },
  {
    legacyId: '00000000-0000-0000-0000-000000000007',
    longName: 'Portao Norte',
    shortName: 'Portao Norte',
    position: [-43.36982679202431, -21.773316626995797],
    reviewReasons: [],
  },
  {
    legacyId: '00000000-0000-0000-0000-000000000008',
    longName: 'Ponto Faculdade de Letras',
    shortName: 'Letras',
    position: [-43.370281456774336, -21.774776125649236],
    reviewReasons: [],
  },
  {
    legacyId: '00000000-0000-0000-0000-000000000009',
    longName: 'ICB',
    shortName: 'ICB',
    position: [-43.37071703851942, -21.777894329166084],
    reviewReasons: [],
  },
  {
    legacyId: '00000000-0000-0000-0000-000000000010',
    longName: 'ICE',
    shortName: 'ICE',
    position: [-43.372329454789224, -21.779014152183652],
    reviewReasons: [],
  },
  {
    legacyId: '00000000-0000-0000-0000-000000000011',
    longName: 'Faculdade de Engenharia',
    shortName: 'Engenharia',
    position: [-43.37411281075688, -21.779503284613885],
    reviewReasons: [
      'Conflito: no Flutter demonstrativo Engenharia está em outro ponto (aproximadamente 350 m).',
    ],
  },
  {
    legacyId: '00000000-0000-0000-0000-000000000012',
    longName: 'Ponto Final',
    shortName: 'Ponto Final',
    position: [-43.372205466433684, -21.777044728649518],
    reviewReasons: [],
  },
  {
    legacyId: '00000000-0000-0000-0000-000000000013',
    longName: 'Restaurante Universitario',
    shortName: 'RU',
    position: [-43.37400624009701, -21.77777907724019],
    reviewReasons: [],
  },
  {
    legacyId: '00000000-0000-0000-0000-000000000014',
    longName: 'ICE Volta',
    shortName: 'ICE Volta',
    position: [-43.372010130613404, -21.77914479920406],
    reviewReasons: [],
  },
  {
    legacyId: '00000000-0000-0000-0000-000000000015',
    longName: 'Faculdade de Educacao Fisica',
    shortName: 'FAEFID',
    position: [-43.371079316865696, -21.779615750938728],
    reviewReasons: [],
  },
  {
    legacyId: '00000000-0000-0000-0000-000000000016',
    longName: 'Faculdade de Odontologia',
    shortName: 'Odontologia',
    position: [-43.3705, -21.782],
    reviewReasons: [
      'Coordenada arredondada; o Flutter identifica Odonto em outro ponto (aproximadamente 590 m).',
    ],
  },
  {
    legacyId: '00000000-0000-0000-0000-000000000017',
    longName: 'Faculdade de Enfermagem',
    shortName: 'Enfermagem',
    position: [-43.3712, -21.7818],
    reviewReasons: [
      'Coordenada arredondada a quatro casas decimais, sem confirmação independente.',
    ],
  },
  {
    legacyId: '00000000-0000-0000-0000-000000000018',
    longName: 'Centro de Biologia da Reproducao (CBR)',
    shortName: 'CBR',
    position: [-43.371, -21.7825],
    reviewReasons: ['Coordenada arredondada, sem confirmação independente.'],
  },
  {
    legacyId: '00000000-0000-0000-0000-000000000019',
    longName: 'Centro Regional de Inovacao (CRITT)',
    shortName: 'CRITT',
    position: [-43.373, -21.7788],
    reviewReasons: ['Coordenada arredondada, sem confirmação independente.'],
  },
  {
    legacyId: '00000000-0000-0000-0000-000000000020',
    longName: 'Instituto de Artes e Design (IAD)',
    shortName: 'IAD',
    position: [-43.3752, -21.779],
    reviewReasons: ['Coordenada arredondada; IAD aparece em outro ponto no Flutter demonstrativo.'],
  },
  {
    legacyId: '00000000-0000-0000-0000-000000000021',
    longName: 'Curva da Represa',
    shortName: 'Represa',
    position: [-43.366, -21.776],
    reviewReasons: ['Coordenada arredondada, sem confirmação independente.'],
  },
  {
    legacyId: '00000000-0000-0000-0000-000000000022',
    longName: 'Hospital Universitario (HU)',
    shortName: 'HU',
    position: [-43.369, -21.775],
    reviewReasons: [
      'Conflito: HU fica na posição de Letras/Portão Norte no seed; Flutter usa outro ponto a mais de 1 km.',
    ],
  },
  {
    legacyId: '00000000-0000-0000-0000-000000000023',
    longName: 'Hospital Universitario (HU) - Santa Catarina',
    shortName: 'HU Santa Catarina',
    position: [-43.35760645725916, -21.749612547504384],
    reviewReasons: [],
  },
  {
    legacyId: '00000000-0000-0000-0000-000000000024',
    longName: 'APES',
    shortName: 'APES',
    position: [-43.36984657420565, -21.773308134867627],
    reviewReasons: [
      'Possível duplicidade: APES está a cerca de 2 m do Portão Norte; função como parada precisa de revisão.',
    ],
  },
  {
    legacyId: '00000000-0000-0000-0000-000000000025',
    longName: 'Medicina Veterinaria',
    shortName: 'Veterinaria',
    position: [-43.34896626219421, -21.764445717662916],
    reviewReasons: [],
  },
];
