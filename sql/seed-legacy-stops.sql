-- Recovered from b39d0152ab4736df37120efd61f07c0e25272f08:seed_bus_stops.sql
-- 25 historical candidates; 16 initially active, 9 inactive for review.
-- Existing stops are preserved. Execute once at a time, in your chosen database.
START TRANSACTION;
-- Legacy ID: 00000000-0000-0000-0000-000000000001; Preserved from legacy; no independent survey.
INSERT INTO bus_stops(id,short_name,long_name,location,is_active)
SELECT '8c37f8f9-51ac-59a3-b4a0-bc3ef043dd19','Bombeiros','Corpo de Bombeiros',ST_GeomFromText('POINT(-43.36767978223414 -21.780375186922893)',4326,'axis-order=long-lat'),1
WHERE NOT EXISTS (SELECT 1 FROM bus_stops WHERE id IN ('8c37f8f9-51ac-59a3-b4a0-bc3ef043dd19','00000000-0000-0000-0000-000000000001') OR LOWER(TRIM(short_name))=LOWER('Bombeiros'));

-- Legacy ID: 00000000-0000-0000-0000-000000000002; Preserved from legacy; no independent survey.
INSERT INTO bus_stops(id,short_name,long_name,location,is_active)
SELECT '580296c3-c863-51d5-b33a-e3cc58fcdae0','Portao Sul','Portao Sul (Ponto do Trailer)',ST_GeomFromText('POINT(-43.36806080082189 -21.78014172235481)',4326,'axis-order=long-lat'),1
WHERE NOT EXISTS (SELECT 1 FROM bus_stops WHERE id IN ('580296c3-c863-51d5-b33a-e3cc58fcdae0','00000000-0000-0000-0000-000000000002') OR LOWER(TRIM(short_name))=LOWER('Portao Sul'));

-- Legacy ID: 00000000-0000-0000-0000-000000000003; Preserved from legacy; no independent survey.
INSERT INTO bus_stops(id,short_name,long_name,location,is_active)
SELECT '9fef247a-17ca-5e0b-8cc1-c99bfa9d884e','Farmacia','Faculdade de Farmacia',ST_GeomFromText('POINT(-43.367347078105205 -21.77748989809465)',4326,'axis-order=long-lat'),1
WHERE NOT EXISTS (SELECT 1 FROM bus_stops WHERE id IN ('9fef247a-17ca-5e0b-8cc1-c99bfa9d884e','00000000-0000-0000-0000-000000000003') OR LOWER(TRIM(short_name))=LOWER('Farmacia'));

-- Legacy ID: 00000000-0000-0000-0000-000000000004; Preserved from legacy; no independent survey.
INSERT INTO bus_stops(id,short_name,long_name,location,is_active)
SELECT '943be05d-08ab-5780-ae69-ac43cec19d3e','Economia','Faculdade de Economia',ST_GeomFromText('POINT(-43.36421729142947 -21.775633440843915)',4326,'axis-order=long-lat'),1
WHERE NOT EXISTS (SELECT 1 FROM bus_stops WHERE id IN ('943be05d-08ab-5780-ae69-ac43cec19d3e','00000000-0000-0000-0000-000000000004') OR LOWER(TRIM(short_name))=LOWER('Economia'));

-- Legacy ID: 00000000-0000-0000-0000-000000000005; Preserved from legacy; no independent survey.
INSERT INTO bus_stops(id,short_name,long_name,location,is_active)
SELECT 'b55b548e-6802-50ef-9f85-784be236c133','ICH','ICH',ST_GeomFromText('POINT(-43.36548126928097 -21.77324882363144)',4326,'axis-order=long-lat'),1
WHERE NOT EXISTS (SELECT 1 FROM bus_stops WHERE id IN ('b55b548e-6802-50ef-9f85-784be236c133','00000000-0000-0000-0000-000000000005') OR LOWER(TRIM(short_name))=LOWER('ICH'));

-- Legacy ID: 00000000-0000-0000-0000-000000000006; Preserved from legacy; no independent survey.
INSERT INTO bus_stops(id,short_name,long_name,location,is_active)
SELECT '431afb95-3c96-5e9b-ae02-9cb2c20ba32c','Direito','Faculdade de Direito',ST_GeomFromText('POINT(-43.36730777722921 -21.774045451462392)',4326,'axis-order=long-lat'),1
WHERE NOT EXISTS (SELECT 1 FROM bus_stops WHERE id IN ('431afb95-3c96-5e9b-ae02-9cb2c20ba32c','00000000-0000-0000-0000-000000000006') OR LOWER(TRIM(short_name))=LOWER('Direito'));

-- Legacy ID: 00000000-0000-0000-0000-000000000007; Preserved from legacy; no independent survey.
INSERT INTO bus_stops(id,short_name,long_name,location,is_active)
SELECT '479068f1-eb25-57cc-bb56-b05014a6b39f','Portao Norte','Portao Norte',ST_GeomFromText('POINT(-43.36982679202431 -21.773316626995797)',4326,'axis-order=long-lat'),1
WHERE NOT EXISTS (SELECT 1 FROM bus_stops WHERE id IN ('479068f1-eb25-57cc-bb56-b05014a6b39f','00000000-0000-0000-0000-000000000007') OR LOWER(TRIM(short_name))=LOWER('Portao Norte'));

-- Legacy ID: 00000000-0000-0000-0000-000000000008; Preserved from legacy; no independent survey.
INSERT INTO bus_stops(id,short_name,long_name,location,is_active)
SELECT 'f3aed715-8335-5619-bad5-6c1dc50fd92f','Letras','Ponto Faculdade de Letras',ST_GeomFromText('POINT(-43.370281456774336 -21.774776125649236)',4326,'axis-order=long-lat'),1
WHERE NOT EXISTS (SELECT 1 FROM bus_stops WHERE id IN ('f3aed715-8335-5619-bad5-6c1dc50fd92f','00000000-0000-0000-0000-000000000008') OR LOWER(TRIM(short_name))=LOWER('Letras'));

-- Legacy ID: 00000000-0000-0000-0000-000000000009; Preserved from legacy; no independent survey.
INSERT INTO bus_stops(id,short_name,long_name,location,is_active)
SELECT '8e89e624-13c7-51ce-91d8-5e557df1ef4d','ICB','ICB',ST_GeomFromText('POINT(-43.37071703851942 -21.777894329166084)',4326,'axis-order=long-lat'),1
WHERE NOT EXISTS (SELECT 1 FROM bus_stops WHERE id IN ('8e89e624-13c7-51ce-91d8-5e557df1ef4d','00000000-0000-0000-0000-000000000009') OR LOWER(TRIM(short_name))=LOWER('ICB'));

-- Legacy ID: 00000000-0000-0000-0000-000000000010; Preserved from legacy; no independent survey.
INSERT INTO bus_stops(id,short_name,long_name,location,is_active)
SELECT 'bb92210f-f130-5f51-b168-3d452770c041','ICE','ICE',ST_GeomFromText('POINT(-43.372329454789224 -21.779014152183652)',4326,'axis-order=long-lat'),1
WHERE NOT EXISTS (SELECT 1 FROM bus_stops WHERE id IN ('bb92210f-f130-5f51-b168-3d452770c041','00000000-0000-0000-0000-000000000010') OR LOWER(TRIM(short_name))=LOWER('ICE'));

-- Legacy ID: 00000000-0000-0000-0000-000000000011; Conflito: no Flutter demonstrativo Engenharia está em outro ponto (aproximadamente 350 m).
INSERT INTO bus_stops(id,short_name,long_name,location,is_active)
SELECT '055fd345-f20a-5ea8-a846-b1af33068986','Engenharia','Faculdade de Engenharia',ST_GeomFromText('POINT(-43.37411281075688 -21.779503284613885)',4326,'axis-order=long-lat'),0
WHERE NOT EXISTS (SELECT 1 FROM bus_stops WHERE id IN ('055fd345-f20a-5ea8-a846-b1af33068986','00000000-0000-0000-0000-000000000011') OR LOWER(TRIM(short_name))=LOWER('Engenharia'));

-- Legacy ID: 00000000-0000-0000-0000-000000000012; Preserved from legacy; no independent survey.
INSERT INTO bus_stops(id,short_name,long_name,location,is_active)
SELECT '60b8e02a-563f-5d8c-82c0-eada6852ef0c','Ponto Final','Ponto Final',ST_GeomFromText('POINT(-43.372205466433684 -21.777044728649518)',4326,'axis-order=long-lat'),1
WHERE NOT EXISTS (SELECT 1 FROM bus_stops WHERE id IN ('60b8e02a-563f-5d8c-82c0-eada6852ef0c','00000000-0000-0000-0000-000000000012') OR LOWER(TRIM(short_name))=LOWER('Ponto Final'));

-- Legacy ID: 00000000-0000-0000-0000-000000000013; Preserved from legacy; no independent survey.
INSERT INTO bus_stops(id,short_name,long_name,location,is_active)
SELECT '82a48a52-b6a9-5c7f-ae03-643e35a12257','RU','Restaurante Universitario',ST_GeomFromText('POINT(-43.37400624009701 -21.77777907724019)',4326,'axis-order=long-lat'),1
WHERE NOT EXISTS (SELECT 1 FROM bus_stops WHERE id IN ('82a48a52-b6a9-5c7f-ae03-643e35a12257','00000000-0000-0000-0000-000000000013') OR LOWER(TRIM(short_name))=LOWER('RU'));

-- Legacy ID: 00000000-0000-0000-0000-000000000014; Preserved from legacy; no independent survey.
INSERT INTO bus_stops(id,short_name,long_name,location,is_active)
SELECT '6e33ceab-db2b-59b3-ac3b-51e659f77164','ICE Volta','ICE Volta',ST_GeomFromText('POINT(-43.372010130613404 -21.77914479920406)',4326,'axis-order=long-lat'),1
WHERE NOT EXISTS (SELECT 1 FROM bus_stops WHERE id IN ('6e33ceab-db2b-59b3-ac3b-51e659f77164','00000000-0000-0000-0000-000000000014') OR LOWER(TRIM(short_name))=LOWER('ICE Volta'));

-- Legacy ID: 00000000-0000-0000-0000-000000000015; Preserved from legacy; no independent survey.
INSERT INTO bus_stops(id,short_name,long_name,location,is_active)
SELECT '86c309fb-ba93-56a5-a137-9c4f14049ec6','FAEFID','Faculdade de Educacao Fisica',ST_GeomFromText('POINT(-43.371079316865696 -21.779615750938728)',4326,'axis-order=long-lat'),1
WHERE NOT EXISTS (SELECT 1 FROM bus_stops WHERE id IN ('86c309fb-ba93-56a5-a137-9c4f14049ec6','00000000-0000-0000-0000-000000000015') OR LOWER(TRIM(short_name))=LOWER('FAEFID'));

-- Legacy ID: 00000000-0000-0000-0000-000000000016; Coordenada arredondada; o Flutter identifica Odonto em outro ponto (aproximadamente 590 m).
INSERT INTO bus_stops(id,short_name,long_name,location,is_active)
SELECT '6ff41ee8-90eb-57f1-81bd-92b5d363586d','Odontologia','Faculdade de Odontologia',ST_GeomFromText('POINT(-43.3705 -21.782)',4326,'axis-order=long-lat'),0
WHERE NOT EXISTS (SELECT 1 FROM bus_stops WHERE id IN ('6ff41ee8-90eb-57f1-81bd-92b5d363586d','00000000-0000-0000-0000-000000000016') OR LOWER(TRIM(short_name))=LOWER('Odontologia'));

-- Legacy ID: 00000000-0000-0000-0000-000000000017; Coordenada arredondada a quatro casas decimais, sem confirmação independente.
INSERT INTO bus_stops(id,short_name,long_name,location,is_active)
SELECT '5111e4d1-36fb-5c2b-adf0-c1d339e1eeb8','Enfermagem','Faculdade de Enfermagem',ST_GeomFromText('POINT(-43.3712 -21.7818)',4326,'axis-order=long-lat'),0
WHERE NOT EXISTS (SELECT 1 FROM bus_stops WHERE id IN ('5111e4d1-36fb-5c2b-adf0-c1d339e1eeb8','00000000-0000-0000-0000-000000000017') OR LOWER(TRIM(short_name))=LOWER('Enfermagem'));

-- Legacy ID: 00000000-0000-0000-0000-000000000018; Coordenada arredondada, sem confirmação independente.
INSERT INTO bus_stops(id,short_name,long_name,location,is_active)
SELECT '28167df2-b407-5c4a-b4c3-e4b886790054','CBR','Centro de Biologia da Reproducao (CBR)',ST_GeomFromText('POINT(-43.371 -21.7825)',4326,'axis-order=long-lat'),0
WHERE NOT EXISTS (SELECT 1 FROM bus_stops WHERE id IN ('28167df2-b407-5c4a-b4c3-e4b886790054','00000000-0000-0000-0000-000000000018') OR LOWER(TRIM(short_name))=LOWER('CBR'));

-- Legacy ID: 00000000-0000-0000-0000-000000000019; Coordenada arredondada, sem confirmação independente.
INSERT INTO bus_stops(id,short_name,long_name,location,is_active)
SELECT '25d92b9a-58ef-5b9c-9ad7-480474d49e3e','CRITT','Centro Regional de Inovacao (CRITT)',ST_GeomFromText('POINT(-43.373 -21.7788)',4326,'axis-order=long-lat'),0
WHERE NOT EXISTS (SELECT 1 FROM bus_stops WHERE id IN ('25d92b9a-58ef-5b9c-9ad7-480474d49e3e','00000000-0000-0000-0000-000000000019') OR LOWER(TRIM(short_name))=LOWER('CRITT'));

-- Legacy ID: 00000000-0000-0000-0000-000000000020; Coordenada arredondada; IAD aparece em outro ponto no Flutter demonstrativo.
INSERT INTO bus_stops(id,short_name,long_name,location,is_active)
SELECT '1d979d11-8aac-5253-a6f2-728a6b8d5125','IAD','Instituto de Artes e Design (IAD)',ST_GeomFromText('POINT(-43.3752 -21.779)',4326,'axis-order=long-lat'),0
WHERE NOT EXISTS (SELECT 1 FROM bus_stops WHERE id IN ('1d979d11-8aac-5253-a6f2-728a6b8d5125','00000000-0000-0000-0000-000000000020') OR LOWER(TRIM(short_name))=LOWER('IAD'));

-- Legacy ID: 00000000-0000-0000-0000-000000000021; Coordenada arredondada, sem confirmação independente.
INSERT INTO bus_stops(id,short_name,long_name,location,is_active)
SELECT '09c6c55b-9d12-5a33-9395-50b02870a2ac','Represa','Curva da Represa',ST_GeomFromText('POINT(-43.366 -21.776)',4326,'axis-order=long-lat'),0
WHERE NOT EXISTS (SELECT 1 FROM bus_stops WHERE id IN ('09c6c55b-9d12-5a33-9395-50b02870a2ac','00000000-0000-0000-0000-000000000021') OR LOWER(TRIM(short_name))=LOWER('Represa'));

-- Legacy ID: 00000000-0000-0000-0000-000000000022; Conflito: HU fica na posição de Letras/Portão Norte no seed; Flutter usa outro ponto a mais de 1 km.
INSERT INTO bus_stops(id,short_name,long_name,location,is_active)
SELECT '6864674e-5bda-5c6c-82ec-ab60bab61a56','HU','Hospital Universitario (HU)',ST_GeomFromText('POINT(-43.369 -21.775)',4326,'axis-order=long-lat'),0
WHERE NOT EXISTS (SELECT 1 FROM bus_stops WHERE id IN ('6864674e-5bda-5c6c-82ec-ab60bab61a56','00000000-0000-0000-0000-000000000022') OR LOWER(TRIM(short_name))=LOWER('HU'));

-- Legacy ID: 00000000-0000-0000-0000-000000000023; Preserved from legacy; no independent survey.
INSERT INTO bus_stops(id,short_name,long_name,location,is_active)
SELECT '671f292a-d242-59d8-a925-4e15e0248565','HU Santa Catarina','Hospital Universitario (HU) - Santa Catarina',ST_GeomFromText('POINT(-43.35760645725916 -21.749612547504384)',4326,'axis-order=long-lat'),1
WHERE NOT EXISTS (SELECT 1 FROM bus_stops WHERE id IN ('671f292a-d242-59d8-a925-4e15e0248565','00000000-0000-0000-0000-000000000023') OR LOWER(TRIM(short_name))=LOWER('HU Santa Catarina'));

-- Legacy ID: 00000000-0000-0000-0000-000000000024; Possível duplicidade: APES está a cerca de 2 m do Portão Norte; função como parada precisa de revisão.
INSERT INTO bus_stops(id,short_name,long_name,location,is_active)
SELECT '7deab4e0-5484-56e4-8c51-ee736bf2b1c2','APES','APES',ST_GeomFromText('POINT(-43.36984657420565 -21.773308134867627)',4326,'axis-order=long-lat'),0
WHERE NOT EXISTS (SELECT 1 FROM bus_stops WHERE id IN ('7deab4e0-5484-56e4-8c51-ee736bf2b1c2','00000000-0000-0000-0000-000000000024') OR LOWER(TRIM(short_name))=LOWER('APES'));

-- Legacy ID: 00000000-0000-0000-0000-000000000025; Preserved from legacy; no independent survey.
INSERT INTO bus_stops(id,short_name,long_name,location,is_active)
SELECT '2b8ad1a1-07d8-5a00-8d9e-c588b66b670a','Veterinaria','Medicina Veterinaria',ST_GeomFromText('POINT(-43.34896626219421 -21.764445717662916)',4326,'axis-order=long-lat'),1
WHERE NOT EXISTS (SELECT 1 FROM bus_stops WHERE id IN ('2b8ad1a1-07d8-5a00-8d9e-c588b66b670a','00000000-0000-0000-0000-000000000025') OR LOWER(TRIM(short_name))=LOWER('Veterinaria'));
COMMIT;
