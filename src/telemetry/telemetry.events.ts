import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export interface LocationUpdate {
  licensePlate: string;
  busLineId: string;
  busStatus: 'circulating';
  position: [number, number];
  speed: number;
  headingTowards: number;
  timestamp: string;
}
export interface BusOffline {
  licensePlate: string;
  busLineId: string;
  busStatus: 'notCirculating';
  reason: 'closed' | 'timeout' | 'authorization-revoked';
}
export type TelemetryEvent =
  | { name: 'passenger:location-update'; data: LocationUpdate }
  | { name: 'passenger:bus-offline'; data: BusOffline };

@Injectable()
export class TelemetryEvents {
  readonly stream = new Subject<TelemetryEvent>();
  emit(event: TelemetryEvent) {
    this.stream.next(event);
  }
}
