import 'dotenv/config';
import { io, Socket } from 'socket.io-client';
import { setTimeout as delay } from 'node:timers/promises';
import { resumeSimulationPath, simulationRoute } from './simulation-route';
function ack(socket: Socket, event: string, payload: object): Promise<unknown> {
  return new Promise((resolve, reject) => {
    socket
      .timeout(8000)
      .emit(
        event,
        payload,
        (error: Error | null, result: { ok: boolean; data?: unknown; error?: unknown }) => {
          if (error) reject(error);
          else if (!result?.ok) reject(new Error(JSON.stringify(result?.error)));
          else resolve(result.data);
        },
      );
  });
}
async function main() {
  const token = process.env.DRIVER_TOKEN;
  const licensePlate = process.env.LICENSE_PLATE;
  if (!token || !licensePlate)
    throw new Error('Configure DRIVER_TOKEN (JWT de motorista/admin ativo) e LICENSE_PLATE.');
  const apiUrl = (process.env.API_URL || 'http://localhost:3000').replace(/\/$/, '');
  const { busLineId, path: initialPath } = await simulationRoute(
    apiUrl,
    process.env.BUS_LINE_ID,
    process.env.BUS_LINE_CODE,
  );
  console.log(
    `Linha ${process.env.BUS_LINE_CODE || busLineId}: ${initialPath.length} pontos pelas vias.`,
  );
  const socket = io(apiUrl, {
    auth: { token },
    autoConnect: false,
    reconnection: false,
    timeout: 8000,
  });
  let stopped = false,
    started = false;
  let routeRevision = 0;
  socket.on('passenger:route-updated', (event: { busLineId?: string }) => {
    if (event?.busLineId === busLineId) routeRevision++;
  });
  const stop = () => {
    stopped = true;
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  try {
    await new Promise<void>((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
      socket.connect();
    });
    await ack(socket, 'driver:start-session', { busLineId, licensePlate });
    started = true;
    console.log('Viagem simulada iniciada; Ctrl+C para encerrar.');
    await ack(socket, 'passenger:subscribe', { busLineId });
    let path = initialPath,
      appliedRevision = routeRevision,
      laps = 0;
    let lastPosition: [number, number] | undefined;
    const maxLaps = Number(process.env.SIMULATION_LAPS || 0);
    if (!Number.isInteger(maxLaps) || maxLaps < 0)
      throw new Error('SIMULATION_LAPS deve ser inteiro >= 0 (0 = contínuo).');
    while (!stopped) {
      if (laps > 0 || appliedRevision !== routeRevision) {
        const loadingRevision = routeRevision;
        const updated = await simulationRoute(apiUrl, busLineId);
        path = resumeSimulationPath(updated.path, lastPosition);
        appliedRevision = loadingRevision;
        console.log('Simulação atualizada para o itinerário cadastrado.');
      }
      for (let i = 0; i < path.length - 1 && !stopped && routeRevision === appliedRevision; i++) {
        const a = path[i],
          b = path[i + 1];
        const dx = (b[0] - a[0]) * Math.cos((a[1] * Math.PI) / 180),
          dy = b[1] - a[1];
        const meters = Math.hypot(dx, dy) * 111195;
        const steps = Math.max(1, Math.ceil(meters / ((20 / 3.6) * 3)));
        const headingTowards = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
        for (
          let j = i === 0 ? 0 : 1;
          j <= steps && !stopped && routeRevision === appliedRevision;
          j++
        ) {
          const t = j / steps;
          const position: [number, number] = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
          await ack(socket, 'driver:send-location', {
            busLineId,
            licensePlate,
            position,
            speed: Number(((meters / steps / 3) * 3.6).toFixed(2)),
            headingTowards,
            timestamp: new Date().toISOString(),
          });
          lastPosition = position;
          await delay(3000);
        }
      }
      if (appliedRevision === routeRevision) {
        laps++;
        if (maxLaps > 0 && laps >= maxLaps) break;
      }
    }
  } finally {
    if (started && socket.connected) {
      try {
        await ack(socket, 'driver:close-session', { licensePlate });
      } catch (error) {
        console.error('Could not close session:', error);
      }
    }
    socket.disconnect();
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
