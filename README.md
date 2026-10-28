# LocalizaUFJF — backend v2

Backend NestJS/TypeScript com MySQL local e recursos espaciais nativos, JWT e Socket.io. Não depende de Docker. Branch de desenvolvimento: `v2_nodejs`.

O [checklist do motor](docs/checklist-motor.md) relaciona os requisitos do prompt técnico aos módulos implementados e registra as adaptações autorizadas para MySQL local.

## Requisitos e execução local

- Node.js 22 e npm.
- MySQL 8.0.22 ou superior instalado localmente (InnoDB). Não é necessário instalar PostgreSQL ou PostGIS.
- Um banco novo dedicado ao projeto. Use um banco novo MySQL; esta versão não usa PostGIS.

Crie o banco no MySQL Workbench, conectado ao seu servidor local:

```sql
CREATE DATABASE localizaufjf CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

No Workbench, configure host `127.0.0.1`, a porta do serviço MySQL (nesta máquina: `1433`) e um usuário MySQL válido. O nome da conexão no Workbench não cria usuário nem banco. O arquivo `sql/create-user.example.sql` mostra como provisionar um usuário de aplicação; substitua a senha de exemplo antes de executar.

Copie `.env.example` para `.env` caso ainda não exista e configure a conexão real. O `.env` é privado e ignorado pelo Git. Exemplo de conexão local:

```dotenv
DATABASE_HOST=localhost
DATABASE_PORT=1433
DATABASE_USERNAME=localizaufjf
DATABASE_PASSWORD=sua-senha-local
DATABASE_NAME=localizaufjf
JWT_SECRET=um-segredo-aleatorio-com-pelo-menos-32-caracteres
CORS_ORIGINS=http://localhost:5173,http://localhost:3001
```

Alternativamente, use `DATABASE_URL=mysql://usuario:senha@127.0.0.1:1433/localizaufjf`. Caracteres especiais na URL devem ser codificados. `DATABASE_URL` substitui as configurações individuais.

```sh
npm ci
npm run db:check
npm run migration:run
npm run seed:admin
npm run start:dev
```

Para criar o primeiro administrador, defina também `ADMIN_REGISTRATION` e `ADMIN_PASSWORD` (mínimo de 12 caracteres; máximo de 72 bytes) no `.env` antes de executar `seed:admin`. O comando não altera contas já existentes. Remova a senha de bootstrap do `.env` após criar a conta.

A migração cria tabelas MySQL, chaves estrangeiras, índices espaciais e colunas geradas para exclusividade das sessões. `synchronize` está desabilitado. MySQL faz commit implícito em DDL: uma falha de migração pode deixar tabelas já criadas; use um banco novo e corrija a causa antes de tentar novamente.

A API atende em `http://localhost:3000`. Verifique `GET /health`. Para executar a versão compilada:

```sh
npm run build
npm start
```

Não execute a migração sobre um banco legado esperando uma conversão automática: esta implementação cria um esquema novo. O volume/dados antigos não são apagados. `npm run migration:revert` remove as tabelas da última migração e seus dados, sendo destinado somente a ambientes descartáveis.

## Criar tabelas diretamente com SQL

Se preferir o Workbench, abra e execute `sql/schema.sql` em um banco novo. O arquivo cria o banco `localizaufjf`, as tabelas e registra a migração inicial. Depois execute `npm run db:check`, `npm run seed:admin` e `npm run start:dev`. A alternativa `npm run migration:run` cria o mesmo esquema automaticamente; escolha apenas uma dessas formas para a primeira criação.

`npm run schema:export` regenera o SQL a partir da mesma fonte usada pela migração. Nenhuma senha é escrita no arquivo exportado.

## Fluxo inicial

1. Autentique o administrador em `POST /auth/login`.
2. Cadastre linhas e placas autorizadas usando o Bearer token do administrador.
3. Cadastre um motorista em `POST /auth/register`. Ele nasce **inativo** e não recebe JWT antes da aprovação.
4. Liste as contas em `GET /admin/users` e ative o motorista com `PATCH /admin/users/:id/activation`, corpo `{"isActive":true}`.
5. Faça login do motorista, inicie a sessão de um veículo e comece a enviar GPS ou heartbeat.

O cadastro público cria apenas motoristas pendentes. Não aceita `userType`, `isActive` ou identidade escolhida pelo cliente. Os perfis `admin`, `driver` e `passenger` existem no banco; contas administrativas são provisionadas pelo bootstrap.

## REST

Rotas de leitura são públicas. Escritas em cadastros exigem administrador ativo. Escritas no fórum exigem usuário autenticado ativo. Operações de telemetria exigem motorista/administrador ativo e proprietário da sessão.

| Método | Rota | Operação |
|---|---|---|
| POST | `/auth/register` | `registrationNumber`, `password`, `passwordConfirmation` |
| POST | `/auth/login` | JSON com matrícula/senha ou HTTP Basic; retorna `token`, `accessToken`, `userType`, `expiresIn` |
| GET | `/bus-lines` | Linhas ativas |
| POST | `/bus-lines` | Cria linha: `code`, `name`, `isActive?` |
| PUT / DELETE | `/bus-lines/:id` | Atualiza / desativa linha |
| GET | `/license-plates` | Frota ativa |
| POST | `/license-plates` | Cria veículo: `licensePlate`, `isActive?` |
| PUT / DELETE | `/license-plates/:id` | Atualiza ativação / desativa veículo; placa é imutável |
| GET / POST | `/bus-stops` | Lista ativas / cria: `shortName`, `longName`, `position`, `isActive?` |
| PUT / DELETE | `/bus-stops/:id` | Atualiza / desativa parada |
| GET | `/bus-stops/nearest?lat=-21.77&lng=-43.37&radius=500` | Paradas ordenadas por distância em metros |
| GET | `/bus-location` | Dicionário de posições ativas, indexado por placa |
| POST | `/bus-location/sessions` | Inicia sessão REST: `licensePlate`, `busLineId` |
| POST | `/bus-location/:licensePlate` | Fallback GPS; sessão deve existir |
| POST | `/bus-location/:licensePlate/heartbeat` | Renova sessão própria |
| POST | `/bus-location/:licensePlate/close` | Encerra sessão própria; idempotente |
| GET / POST | `/campus-places` | Lista / cria: `name`, `category`, `position`, `description?` |
| GET | `/campus-places/nearest?lat=-21.77&lng=-43.37&radius=500` | Locais próximos |
| GET / POST | `/forum/posts` | Lista perguntas com respostas / cria pergunta |
| POST | `/forum/posts/:id/answers` | Adiciona resposta |
| GET | `/admin/users` | Lista contas e ativação, sem hash de senha |
| PATCH | `/admin/users/:id/activation` | `{ "isActive": true }` |

`GET /forum/posts`, `GET /campus-places` e `GET /admin/users` aceitam `limit` (1–100, padrão 20) e `offset` (padrão 0). Consultas por proximidade aceitam raio de 1–5000 metros e retornam até 100 resultados. `ST_Distance_Sphere` calcula a distância em metros entre pontos com SRID 4326. As tabelas têm índices espaciais R-tree; a consulta atual de proximidade calcula a distância nos candidatos e não promete usar o índice para o filtro radial.

Corpo da ingestão REST (a placa vem da URL):

```json
{
  "busLineId": "uuid-da-linha",
  "position": [-43.37, -21.77],
  "speed": 20,
  "headingTowards": 90,
  "timestamp": "2026-10-27T18:00:00.000Z"
}
```

Use um timestamp atual com fuso explícito. Velocidade é em **km/h**, direção em graus `[0,360)`, posição em **[longitude, latitude]**. O Geolocator legado fornece velocidade em m/s: converta multiplicando por 3,6 no cliente. Latitude: -21.80 a -21.70; longitude: -43.40 a -43.30. Amostras com mais de 30 segundos, mais de 5 segundos no futuro, repetidas ou fora de ordem são rejeitadas sem renovação do heartbeat.

Posts recebem `{ "title":"Pergunta", "content":"Texto", "is_anonymous":true }`; respostas recebem `content` e `is_anonymous`. O autor é determinado pelo JWT. Conteúdo anônimo retorna `author:null` e nunca expõe `author_id` ou matrícula, inclusive nas respostas. O vínculo interno do autor é preservado no banco.

## WebSocket / Socket.io

Use o endpoint padrão `/socket.io` e autentique o motorista com `auth: {token}`. O JWT é revalidado em cada operação, incluindo consulta do status ativo no banco. Passageiros podem se conectar sem JWT.

```ts
import { io } from 'socket.io-client';

const passenger = io('http://localhost:3000');
passenger.on('connect', () => {
  passenger.emit('passenger:subscribe', {}, console.log);
  // Ou { busLineId: 'uuid-da-linha' } para uma linha específica.
});
passenger.on('passenger:location-update', console.log);
passenger.on('passenger:bus-offline', console.log);

const driver = io('http://localhost:3000', { auth: { token: 'JWT' } });
driver.emit('driver:start-session', {
  licensePlate: 'ABC-1D23', busLineId: 'uuid-da-linha',
}, console.log);
// Aguarde {ok:true} antes de transmitir.
driver.emit('driver:send-location', {
  licensePlate: 'ABC-1D23', busLineId: 'uuid-da-linha',
  position: [-43.37, -21.77], speed: 20, headingTowards: 90,
  timestamp: new Date().toISOString(),
}, console.log);
// Mesmo parado, envie heartbeat a cada 10 segundos.
driver.emit('driver:heartbeat', { licensePlate: 'ABC-1D23' }, console.log);
driver.emit('driver:close-session', { licensePlate: 'ABC-1D23' }, console.log);
```

Todas as mensagens têm acknowledgement `{ok:true,data}` ou `{ok:false,error:{status,detail}}`; erros também são emitidos em `operation:error`. Há limite de 20 mensagens por segundo por socket e 16 KiB por pacote.

`passenger:subscribe` troca a inscrição anterior por `all_busses` ou `line_{busLineId}` e devolve snapshot em `data.buses`. Em reconexões, reinscreva o passageiro e substitua seu estado pelo snapshot. Use o timestamp para não aplicar atualizações antigas. Eventos não contêm a identidade do motorista.

A sessão é exclusiva por veículo e por motorista, garantida por índices únicos em colunas geradas no MySQL (somente sessões abertas têm chave não nula). Escritas são serializadas com bloqueio de linha. O socket proprietário deve ser o mesmo que iniciou a sessão; outro socket não pode tomar sua posse. REST pode atuar como fallback autenticado do mesmo motorista.

Após 30 segundos sem GPS/heartbeat, a sessão expira. O monitor roda a cada segundo: o evento de offline costuma chegar em até aproximadamente 31 segundos, conforme a carga. `GET /bus-location` já filtra sessões vencidas, independentemente do monitor. Desconectar o socket não renova nem encerra antecipadamente a sessão. Um socket novo deve aguardar a expiração ou encerrar a sessão antiga pelo fallback REST antes de iniciar outra.

O encerramento grava uma amostra `notCirculating` quando há posição conhecida. Sessões que nunca enviaram GPS são encerradas na tabela `driver_sessions`, sem inventar uma coordenada. O monitor também encerra sessões de usuários, veículos ou linhas desativados. Eventos são publicados após o commit.

## Compatibilidade com o Flutter legado

Há aliases `/login`, `/register`, `/bus-line`, `/license-plate` e `/bus-stop`. A migração exige adaptação do cliente nos seguintes pontos:

- A ordem antiga `[lat,lng]` mudou para `[lng,lat]`, como solicitado para a v2.
- GPS referencia `busLineId` (UUID), não o texto `busLine`.
- É obrigatório iniciar uma sessão antes de transmitir.
- Cadastro deixa o motorista pendente de ativação; não retorna uma sessão imediata.
- O papel administrativo agora se chama `admin`, conforme o esquema v2, e não `administrator`.
- Criar uma linha exige `code` e `name`.
- Velocidade deve ser convertida de m/s para km/h quando necessário.

Os frontends Flutter não foram modificados nesta tarefa.

## Verificações

```sh
npm run build
npm test
npm run format:check
```

A suíte de integração usa MySQL real, HTTP e clientes Socket.io. Crie um banco **separado** terminado em `_test`, configure a conexão para ele e defina `ALLOW_INTEGRATION_DB_RESET=true` antes de executar:

```sh
npm run test:integration
```

Essa suíte limpa as tabelas do banco de teste com `DELETE`, em ordem de dependência. Ela recusa execução sem a autorização de reset e o sufixo `_test`. As variáveis do processo têm precedência sobre `.env`. O workflow do GitHub inicia MySQL nativo, sem containers.

## Limites operacionais

Esta versão usa um único processo de API. Sessões e telemetria sobrevivem a reinícios, mas Socket.io e o canal de eventos são locais ao processo; múltiplas instâncias exigem adapter/broker compartilhado e entrega durável de eventos. Um crash entre commit e broadcast pode perder um evento; o snapshot permite recuperar o estado. Não há promessa de entrega exatamente uma vez.

O histórico de telemetria ainda não tem retenção automática, particionamento ou exportação. A lista de respostas do fórum não tem paginação separada. Estimativa de chegada, itinerários ordenados, moderação e testes de carga permanecem fora deste motor inicial. Em produção, configure HTTPS/WSS e as origens reais do frontend.

## Dados e regras recuperados do Swift

O relatório completo está em [docs/reaproveitamento-swift.md](docs/reaproveitamento-swift.md), com inventário das fontes, contratos e divergências de coordenadas. O seed histórico contém 25 candidatos a paradas; o importador novo preserva registros existentes e deixa nove candidatos inativos para revisão.

```sh
npm run seed:legacy-stops -- --dry-run
npm run seed:legacy-stops
```

Alternativa para Workbench: `sql/seed-legacy-stops.sql`. Administradores podem consultar ativas e inativas em `GET /admin/bus-stops?limit=100`. As coordenadas recuperadas não foram confirmadas por levantamento de campo.
