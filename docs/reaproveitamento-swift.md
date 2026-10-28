# Reaproveitamento do backend Swift no LocalizaUFJF v2

Fonte examinada: `origin/main`, commit `b39d0152ab4736df37120efd61f07c0e25272f08`. A análise abrange controllers, DTOs, modelos, middlewares, migrações, testes, configuração e seed. O inventário com hashes está em `legacy/inventory.json`. As consultas foram feitas pelo Git; os arquivos Swift não foram restaurados sobre o código NestJS.

O arquivo `legacy/seed_bus_stops.postgresql.sql.txt` preserva o seed original como evidência. É um arquivo histórico para leitura, não um script para executar no MySQL. A fonte executável nova está em `src/database/legacy/bus-stops.ts`, com o commit e hash da origem.

## Dados recuperáveis e limites

- **25 candidatos a paradas** com nomes, UUIDs originais e coordenadas. São dados versionados, não um dump do PostgreSQL antigo nem um levantamento geográfico confirmado.
- Estruturas para usuários, perfis, placas e linhas, mas **nenhum cadastro concreto** de linhas, veículos ou usuários dentro do backend Swift.
- Localizações ao vivo existiam somente no dicionário em memória do Vapor. Não há histórico de GPS recuperável pelo código.
- Não há itinerários ordenados, horários, ETA, campus_places ou fórum implementados no backend Swift.
- `created_at` e `updated_at` eram campos nos cadastros Swift. Seus valores históricos, assim como os hashes de senha de contas reais, dependem de um dump autorizado do banco antigo; não podem ser reconstruídos pelo seed.

## Correspondência dos modelos

| Swift / PostgreSQL | NestJS / MySQL | Reaproveitamento e melhoria |
|---|---|---|
| `user`, matrícula única, Bcrypt, `is_active` | `users` | Matrícula e Bcrypt mantidos; usuário inativo não autentica; cadastro público não escolhe privilégios |
| Enum `driver` / `administrator` | `user_types`: `driver` / `admin` / `passenger` | Normalização do papel administrativo; não migrar contas sem mapear os papéis |
| `user_token`, token aleatório, validade por data | JWT com `sub`, matrícula, papel e expiração | Tokens antigos não são reaproveitados; login novo obrigatório |
| `license_plate`, regex brasileira | `license_plates` | Mesmo padrão `ABC-1234` / `ABC-1D23`, unicidade e ativação consultadas no banco |
| `bus_line`, somente nome | `bus_lines`, código e nome | Linhas passam a ter UUID, código único e ativação; nenhum nome é inventado pelo importador |
| `bus_stop`, latitude e longitude Float | `bus_stops`, POINT SRID 4326 | Coordenadas do seed preservadas como double; ordem pública explícita `[longitude, latitude]` |
| Dicionário `BusLocation` indexado por placa | `bus_locations` + `driver_sessions` | Persistência, sessão exclusiva por motorista/veículo, validação e expiração automática |
| Status `circulating` / `notCirculating` | Mesmos valores | Vocabulário preservado; timeout passa a publicar offline |

Para migrar futuramente um dump de contas: preservar matrícula e hash Bcrypt compatível, mapear `administrator` para `admin`, preservar a ativação e invalidar os tokens legados. Não ativar todas as contas automaticamente. Placas e linhas exigem deduplicação e vínculo explícito às sessões novas. Esta entrega não importou contas privadas, tokens, placas ou linhas sem uma fonte de dados real.

## Contratos e compatibilidade

| Legado | V2 | Observação |
|---|---|---|
| `POST /register` | `/auth/register` e alias `/register` | Mesmos campos de entrada; resposta agora é cadastro pendente, sem JWT imediato |
| `POST /login` com Basic | `/auth/login` e alias `/login`, Basic ou JSON | JWT novo; papel administrativo retorna `admin` |
| `GET /bus-stop` | `/bus-stops` e alias `/bus-stop` | Nomes `longName`, `shortName`, `isActive` preservados; posição agora `[lng,lat]`; somente ativas no retorno público |
| `GET/POST/DELETE /bus-line` | Aliases e `/bus-lines`, também PUT | Criação exige código; DELETE desativa sem destruir relações |
| `GET/POST/DELETE /license-plate` | Aliases e `/license-plates`, também PUT | Placa única, imutável e ativa para transmitir; DELETE desativa |
| `GET /bus-location` | Mesmo endereço | Dicionário por placa preservado, somente sessões circulando e válidas |
| `POST /bus-location/:plate` | Mesmo endereço REST de fallback | Antes exige sessão; `busLine` textual vira `busLineId` UUID; unidade de velocidade é km/h |
| `POST /bus-location/:plate/close` | Mesmo endereço | Encerramento idempotente da própria sessão; persiste offline quando há posição |
| Porta 8080, polling | Porta 3000, Socket.io | Passageiro usa inscrição e eventos; REST continua disponível |

Aliases de endereço não significam compatibilidade integral de payload. O Flutter ainda usa `[lat,lng]`, Geolocator em m/s, papel `administrator` e nomes de linha. Adaptação do cliente continua necessária. O backend não inverte coordenadas por adivinhação nem cria sessões implicitamente.

O OpenAPI de `circular-api-schema` também estava incompleto: omite linhas/placas, `busLine` em telemetria e `userType` na resposta. Portanto, não foi tratado como fonte completa ou correta contra o código executável.

## Melhorias já aplicadas na v2

- Telemetria persistida e broadcast após commit, em vez de posição somente na memória.
- Frota ativa validada no banco; o middleware Swift verificava apenas o formato da placa.
- Posse explícita da viagem, com exclusividade no banco e vínculo ao socket.
- Geofence, limite de 80 km/h, direção válida, timestamp com fuso, tolerância temporal e rejeição de amostras repetidas/antigas.
- Heartbeat e expiração de 30 segundos, inclusive após reinício da API.
- Revalidação do usuário ativo em REST e WebSocket, além de autorização por papel.
- Queries parametrizadas, coordenadas com ordem explícita e proximidade em metros.
- CORS configurável com PUT/PATCH/DELETE; no Swift os métodos permitidos não cobriam DELETE.
- Erros de exclusão não são ignorados; remoção de cadastros referenciados passa a desativação.
- Testes do domínio e integração real. Os testes Swift ainda referenciavam `Todo`/`TodoDTO` ausentes e rotas de template.

## Importação das paradas

O novo importador oferece:

```sh
npm run seed:legacy-stops -- --dry-run
npm run seed:legacy-stops
```

A primeira execução escreve os registros novos em uma transação. Repetições preservam cadastros existentes, incluindo edições de coordenadas e ativações/desativações do operador. A comparação considera ID atual, ID histórico e nome curto sem distinção de acento/caixa. Um erro aborta a transação; não há exclusão nem atualização automática de dados já cadastrados. Não execute dois importadores simultaneamente.

Os IDs do seed Swift (`00000000-0000-0000-0000-...`) não têm versão/variante UUID válidas para os DTOs novos. Cada um recebe UUIDv5 estável, com mapeamento explícito para `legacyId`. Isso permite editar as paradas pela API e impede duplicação em reimportações. Favoritos associados aos IDs antigos precisarão usar esse mapeamento na migração do frontend.

Para importar pelo Workbench, selecione o banco correto e execute `sql/seed-legacy-stops.sql`. Ele tem o mesmo mapeamento, flags e verificação de existência. A origem e os motivos de revisão estão em comentários. O script é regenerado por `npm run schema:export:legacy-stops`.

### Política inicial de revisão

Os 25 registros são preservados. **16 entram ativos conforme o legado, e 9 entram inativos**, por uma política conservadora diante dos dados abaixo. Ativação não comprova levantamento de campo: os demais também precisam de validação operacional.

| Parada inativa | Motivo para revisão |
|---|---|
| Engenharia | Divergência de aproximadamente 350 m em relação ao exemplo Flutter |
| Odontologia | Coordenada arredondada e divergência de aproximadamente 590 m em relação ao Flutter |
| Enfermagem | Coordenada arredondada, sem confirmação independente |
| CBR | Coordenada arredondada, sem confirmação independente |
| CRITT | Coordenada arredondada, sem confirmação independente |
| IAD | Coordenada arredondada e divergência em relação ao Flutter |
| Represa | Coordenada arredondada, sem confirmação independente |
| HU | Seed fica próximo de Letras/Portão Norte; exemplo Flutter aponta para outro ponto a mais de 1 km |
| APES | Coordenada a cerca de 2 m do Portão Norte; possível duplicidade como parada |

O Flutter usa dados demonstrativos; seus valores não foram usados para corrigir automaticamente o seed. Não se pode concluir qual coordenada está correta só comparando esses arquivos. O seed do site repete as 25 coordenadas do Swift, portanto não é confirmação independente. As nove linhas padrão do app motorista são referências do frontend, não cadastros do backend, e não foram ativadas como serviço de transporte sem validação. Horários fictícios/simulados do site também não foram importados.

Use `GET /admin/bus-stops?limit=100` com JWT de administrador para consultar inclusive paradas inativas, seu `legacyId`, origem e notas históricas. Depois de conferir uma parada, use `PUT /bus-stops/:id` com os nomes, posição corrigida e `isActive:true`. As notas descrevem a origem histórica; não são removidas automaticamente ao editar.

## Pendências de operação

- Validar as coordenadas e quais locais realmente são paradas atendidas.
- Cadastrar frota real e linhas com códigos; vincular itinerários e horários somente após obter fonte operacional.
- Adaptar os frontends para o contrato v2 e substituir os mocks.
- Recuperar contas e dados do banco Swift apenas se houver um dump autorizado.
- Planejar retenção do histórico e operação com múltiplas instâncias conforme os limites descritos no README.
