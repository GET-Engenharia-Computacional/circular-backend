BEGIN;

INSERT INTO bus_stop (id, long_name, short_name, latitude, longitude, is_active, created_at, updated_at)
SELECT data.id, data.long_name, data.short_name, data.latitude, data.longitude, TRUE, NOW(), NOW()
FROM (VALUES
    ('00000000-0000-0000-0000-000000000001'::uuid, 'Corpo de Bombeiros', 'Bombeiros', -21.780375186922893, -43.36767978223414),
    ('00000000-0000-0000-0000-000000000002'::uuid, 'Portao Sul (Ponto do Trailer)', 'Portao Sul', -21.78014172235481, -43.36806080082189),
    ('00000000-0000-0000-0000-000000000003'::uuid, 'Faculdade de Farmacia', 'Farmacia', -21.77748989809465, -43.367347078105205),
    ('00000000-0000-0000-0000-000000000004'::uuid, 'Faculdade de Economia', 'Economia', -21.775633440843915, -43.36421729142947),
    ('00000000-0000-0000-0000-000000000005'::uuid, 'ICH', 'ICH', -21.77324882363144, -43.36548126928097),
    ('00000000-0000-0000-0000-000000000006'::uuid, 'Faculdade de Direito', 'Direito', -21.774045451462392, -43.36730777722921),
    ('00000000-0000-0000-0000-000000000007'::uuid, 'Portao Norte', 'Portao Norte', -21.773316626995797, -43.36982679202431),
    ('00000000-0000-0000-0000-000000000008'::uuid, 'Ponto Faculdade de Letras', 'Letras', -21.774776125649236, -43.370281456774336),
    ('00000000-0000-0000-0000-000000000009'::uuid, 'ICB', 'ICB', -21.777894329166084, -43.37071703851942),
    ('00000000-0000-0000-0000-000000000010'::uuid, 'ICE', 'ICE', -21.779014152183652, -43.372329454789224),
    ('00000000-0000-0000-0000-000000000011'::uuid, 'Faculdade de Engenharia', 'Engenharia', -21.779503284613885, -43.37411281075688),
    ('00000000-0000-0000-0000-000000000012'::uuid, 'Ponto Final', 'Ponto Final', -21.777044728649518, -43.372205466433684),
    ('00000000-0000-0000-0000-000000000013'::uuid, 'Restaurante Universitario', 'RU', -21.77777907724019, -43.37400624009701),
    ('00000000-0000-0000-0000-000000000014'::uuid, 'ICE Volta', 'ICE Volta', -21.77914479920406, -43.372010130613404),
    ('00000000-0000-0000-0000-000000000015'::uuid, 'Faculdade de Educacao Fisica', 'FAEFID', -21.779615750938728, -43.371079316865696),
    ('00000000-0000-0000-0000-000000000016'::uuid, 'Faculdade de Odontologia', 'Odontologia', -21.782, -43.3705),
    ('00000000-0000-0000-0000-000000000017'::uuid, 'Faculdade de Enfermagem', 'Enfermagem', -21.7818, -43.3712),
    ('00000000-0000-0000-0000-000000000018'::uuid, 'Centro de Biologia da Reproducao (CBR)', 'CBR', -21.7825, -43.371),
    ('00000000-0000-0000-0000-000000000019'::uuid, 'Centro Regional de Inovacao (CRITT)', 'CRITT', -21.7788, -43.373),
    ('00000000-0000-0000-0000-000000000020'::uuid, 'Instituto de Artes e Design (IAD)', 'IAD', -21.779, -43.3752),
    ('00000000-0000-0000-0000-000000000021'::uuid, 'Curva da Represa', 'Represa', -21.776, -43.366),
    ('00000000-0000-0000-0000-000000000022'::uuid, 'Hospital Universitario (HU)', 'HU', -21.775, -43.369),
    ('00000000-0000-0000-0000-000000000023'::uuid, 'Hospital Universitario (HU) - Santa Catarina', 'HU Santa Catarina', -21.749612547504384, -43.35760645725916),
    ('00000000-0000-0000-0000-000000000024'::uuid, 'APES', 'APES', -21.773308134867627, -43.36984657420565),
    ('00000000-0000-0000-0000-000000000025'::uuid, 'Medicina Veterinaria', 'Veterinaria', -21.764445717662916, -43.34896626219421)
) AS data(id, long_name, short_name, latitude, longitude)
WHERE NOT EXISTS (
    SELECT 1
    FROM bus_stop existing
    WHERE existing.short_name = data.short_name
);

COMMIT;
