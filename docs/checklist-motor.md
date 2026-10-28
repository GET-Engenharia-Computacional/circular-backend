# Atendimento ao prompt do motor de telemetria

Referência: prompt técnico reenviado em 27/10/2026. O usuário confirmou explicitamente **MySQL local, sem Docker**. Os requisitos de PostgreSQL/PostGIS/Compose do texto original são substituídos pelos equivalentes MySQL abaixo; a aplicação existente e seus dados não são reinicializados.

## Requisitos funcionais

| Requisito | Implementação atual | Evidência principal |
|---|---|---|
| Telemetria persistida | `bus_locations`, com pontos geográficos SRID 4326, linha, motorista, sessão e horário UTC | `src/telemetry/telemetry.service.ts`, `src/database/schema.ts` |
| WebSocket bidirecional | Socket.io com os cinco comandos previstos, acknowledgements e eventos de erro | `src/telemetry/bus-location.gateway.ts` |
| Frota autorizada | Consulta à placa ativa no banco ao iniciar sessão, enviar GPS e renovar heartbeat | `TelemetryService.authorize` |
| Sessão do motorista | Usuário ativo driver/admin, veículo, linha e socket; índices únicos impedem duas sessões abertas por veículo ou motorista | `driver_sessions`, `TelemetryService.start` e `ownedSession` |
| Sanitização GPS | `[lng,lat]`, latitude -21.80 a -21.70, longitude -43.40 a -43.30, velocidade 0–80 km/h, direção válida e timestamp com fuso | DTOs de telemetria e `TelemetryService.ingest` |
| Ordem temporal | Amostras repetidas/antigas são rejeitadas dentro da transação que bloqueia a sessão | `TelemetryService.ingest` |
| Expiração de sinal | Lease persistido de 30 segundos; monitor a cada segundo encerra a sessão e publica offline | `TelemetryService.expireSessions` |
| JWT + Bcrypt | Login Basic/JSON, usuário ativo, JWT HS256 com `sub`, matrícula e perfil; guards de autenticação/papéis | `src/auth/` |
| Consulta da frota em circulação | `GET /bus-location`, dicionário por placa, somente sessões válidas e autorizadas | `TelemetryService.current` |
| REST de fallback | Início explícito da sessão, envio de posição, heartbeat e fechamento autenticados | `src/telemetry/bus-location.controller.ts` |
| Paradas ativas e proximidade | `GET /bus-stops` e `/bus-stops/nearest`, resultados em metros ordenados por distância | `src/catalog/bus-stops.service.ts` |
| Fórum com anonimato | Listagem de perguntas/respostas e criação autenticada; autor anônimo omitido da projeção pública | `src/forum/` |
| Tratamento de validação | ValidationPipe, whitelist e tipos estritos; campos booleanos aceitam omissão com padrão, mas rejeitam `null` e strings | DTOs e testes de validação |

Na revisão deste prompt foram corrigidos dois casos: booleanos opcionais enviados como `null` agora geram HTTP 400 em vez de atingir uma restrição do banco, e comparações SQL retornadas pelo MySQL como `"0"`/`"1"` são convertidas explicitamente ao verificar a validade da sessão e o motivo do offline. Assim, heartbeat ou GPS não reativam uma sessão vencida na janela anterior à execução do monitor.

## Protocolo Socket.io

| Comando/evento | Comportamento |
|---|---|
| `driver:start-session` | Valida JWT, usuário, veículo e linha; persiste posse da sessão pelo socket |
| `driver:send-location` | Valida e persiste GPS; só publica `passenger:location-update` após commit |
| `driver:heartbeat` | Renova a sessão, inclusive com veículo parado, sem criar nova amostra GPS |
| `driver:close-session` | Fecha a própria sessão; persiste offline quando há coordenada conhecida e publica `passenger:bus-offline` |
| `passenger:subscribe` | Troca inscrição para `all_busses` ou `line_{busLineId}` e devolve snapshot |

As salas são combinadas pelo Socket.io para evitar evento duplicado ao mesmo socket. Passageiros podem consultar sem login; comandos do motorista exigem JWT. A desconexão não renova a sessão: após 30 segundos sem GPS/heartbeat, ela expira. Desativar um usuário, uma linha ou uma placa também invalida a transmissão. Outro socket não assume silenciosamente a sessão existente.

## Adaptações de banco autorizadas

| Pedido original | Equivalente na versão atual |
|---|---|
| PostgreSQL + PostGIS | MySQL 8.0.22+ / InnoDB com recursos espaciais nativos |
| `GEOMETRY(Point,4326)` | `POINT NOT NULL SRID 4326` |
| `ST_SetSRID(ST_MakePoint(lng,lat),4326)` | `ST_GeomFromText(?,4326,'axis-order=long-lat')` |
| `ST_DWithin` / `ST_DistanceSphere` | `ST_Distance_Sphere`, filtro de raio e ordenação em metros |
| UUID nativo | UUID válido armazenado em `CHAR(36)` |
| `TIMESTAMPTZ` | `DATETIME(3)` normalizado em UTC, lido/escrito com timezone UTC |
| Índices únicos parciais para sessões | Colunas geradas com chave apenas para sessões abertas e índices únicos |
| Docker Compose | Serviço MySQL local e API Node.js executada diretamente |

Não há Dockerfile ou Compose na entrega atual. A porta padrão da API é 3000. O serviço MySQL desta máquina foi configurado em 127.0.0.1:1433; a conexão é privada no `.env`.

## Entregáveis

- Entidades: `src/database/entities.ts`.
- Migração: `src/database/migrations/1761600000000-initial-schema.ts`.
- SQL para Workbench: `sql/schema.sql`.
- Auth: `src/auth/auth.service.ts` e `src/auth/jwt.strategy.ts`.
- Gateway: `src/telemetry/bus-location.gateway.ts`.
- Consultas espaciais: `src/catalog/bus-stops.service.ts`.
- Fórum: `src/forum/forum.service.ts` e `src/forum/forum.controller.ts`.
- Inicialização e operação: `README.md` e `.env.example`.
- Recuperação do Swift: `docs/reaproveitamento-swift.md` e importação de paradas com origem documentada.

## Verificação e limites

Os testes unitários/Socket.io usam `npm test`. A suíte `npm run test:integration` verifica MySQL real, HTTP, broadcast por sala, rejeição de duplicatas, exclusividade concorrente, heartbeat sem deslocamento, expiração e revogação de veículo, distância espacial e anonimato. Ela exige banco descartável terminado em `_test` e `ALLOW_INTEGRATION_DB_RESET=true`; nunca deve apontar para `localizaufjf`.

O gateway está pronto para consumo sem polling e é exercitado com clientes Socket.io nos testes. **Os frontends Flutter ainda não foram migrados nem conectados a esse protocolo**: o passageiro existente continua fazendo polling até a adaptação do cliente. A ordem de coordenadas, unidade da velocidade, ID de linha e sessões também precisam ser adaptadas conforme o README.

Não foram inventadas linhas, veículos autorizados ou motoristas para o banco principal. As 25 paradas recuperadas do Swift continuam preservadas, com nove candidatas inativas para revisão. Estimativas de chegada, itinerários, horários oficiais, deploy e testes de carga não fazem parte deste prompt do motor.

O broadcast atual é local a um processo. Não há broker/outbox; um crash entre commit e emissão pode perder um evento. O snapshot recupera o estado após reconexão. Múltiplas instâncias exigem arquitetura de eventos compartilhada.
