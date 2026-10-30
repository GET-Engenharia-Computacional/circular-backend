import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

// SQL migrations own foreign keys and expression indexes; synchronize is disabled.
type Point = { type: 'Point'; coordinates: [number, number] };
abstract class Identified {
  @PrimaryColumn({ type: 'char', length: 36 }) id!: string;
}
@Entity('user_types')
export class UserTypeEntity extends Identified {
  @Column({ length: 20, unique: true }) name!: string;
}
@Entity('users')
export class UserEntity extends Identified {
  @Column({ type: 'char', length: 36 }) user_type_id!: string;
  @Column({ length: 50, unique: true }) registration_number!: string;
  @Column({ length: 255, select: false }) password_hash!: string;
  @Column({ default: false }) is_active!: boolean;
  @CreateDateColumn({ type: 'datetime', precision: 3 }) created_at!: Date;
}
@Entity('license_plates')
export class LicensePlateEntity extends Identified {
  @Column({ length: 8, unique: true }) plate!: string;
  @Column({ default: true }) is_active!: boolean;
}
@Entity('bus_lines')
export class BusLineEntity extends Identified {
  @Column({ length: 20, unique: true }) code!: string;
  @Column({ length: 100 }) name!: string;
  @Column({ default: true }) is_active!: boolean;
}
@Entity('bus_stops')
export class BusStopEntity extends Identified {
  @Column({ length: 50 }) short_name!: string;
  @Column({ length: 150 }) long_name!: string;
  @Column({ type: 'point', srid: 4326 }) location!: Point;
  @Column({ default: true }) is_active!: boolean;
}
@Entity('bus_line_stops')
@Index('line_stop_unique', ['busLineId', 'busStopId', 'stopSequence'], { unique: true })
export class BusLineStop {
  @PrimaryColumn({ name: 'bus_line_id', type: 'char', length: 36 }) busLineId!: string;
  @PrimaryColumn({ name: 'stop_sequence', type: 'int' }) stopSequence!: number;
  @Column({ name: 'bus_stop_id', type: 'char', length: 36 }) busStopId!: string;
  @Column({ name: 'estimated_minutes_from_previous', type: 'int', nullable: true })
  estimatedMinutesFromPrevious!: number | null;
}
@Entity('driver_sessions')
@Index('one_session_per_vehicle', ['active_vehicle'], { unique: true })
@Index('one_session_per_driver', ['active_driver'], { unique: true })
export class DriverSessionEntity extends Identified {
  @Column({
    type: 'varchar',
    length: 8,
    nullable: true,
    asExpression: 'IF(closed_at IS NULL,license_plate,NULL)',
    generatedType: 'STORED',
    select: false,
    insert: false,
    update: false,
  })
  active_vehicle!: string | null;
  @Column({
    type: 'char',
    length: 36,
    nullable: true,
    asExpression: 'IF(closed_at IS NULL,driver_id,NULL)',
    generatedType: 'STORED',
    select: false,
    insert: false,
    update: false,
  })
  active_driver!: string | null;
  @Column({ type: 'char', length: 36 }) driver_id!: string;
  @Column({ length: 8 }) license_plate!: string;
  @Column({ type: 'char', length: 36 }) bus_line_id!: string;
  @Column({ type: 'varchar', length: 100, nullable: true }) socket_id!: string | null;
  @CreateDateColumn({ type: 'datetime', precision: 3 }) started_at!: Date;
  @Column({ type: 'datetime', precision: 3, default: () => 'CURRENT_TIMESTAMP(3)' })
  last_seen_at!: Date;
  @Column({ type: 'datetime', precision: 3, nullable: true }) last_sample_at!: Date | null;
  @Column({ type: 'datetime', precision: 3, nullable: true }) closed_at!: Date | null;
}
@Entity('bus_locations')
@Index('telemetry_sample_once', ['session_id', 'timestamp', 'bus_status'], { unique: true })
export class BusLocationEntity extends Identified {
  @Column({ type: 'char', length: 36 }) session_id!: string;
  @Column({ length: 8 }) license_plate!: string;
  @Column({ type: 'char', length: 36 }) bus_line_id!: string;
  @Column({ type: 'char', length: 36 }) driver_id!: string;
  @Column({ length: 20 }) bus_status!: 'circulating' | 'notCirculating';
  @Column({ type: 'point', srid: 4326 }) location!: Point;
  @Column({ type: 'numeric', precision: 5, scale: 2 }) speed!: string;
  @Column({ type: 'numeric', precision: 5, scale: 2 }) heading_towards!: string;
  @Column({ type: 'datetime', precision: 3 }) timestamp!: Date;
  @CreateDateColumn({ type: 'datetime', precision: 3 }) received_at!: Date;
}
@Entity('campus_places')
export class CampusPlaceEntity extends Identified {
  @Column({ default: true }) is_active!: boolean;
  @Column({ length: 150 }) name!: string;
  @Column({ length: 50 }) category!: string;
  @Column({ type: 'point', srid: 4326 }) location!: Point;
  @Column({ type: 'text', nullable: true }) description!: string | null;
}
@Entity('forum_posts')
export class ForumPostEntity extends Identified {
  @Column({ type: 'char', length: 36, nullable: true }) author_id!: string | null;
  @Column({ default: false }) is_anonymous!: boolean;
  @Column({ length: 255 }) title!: string;
  @Column('text') content!: string;
  @CreateDateColumn({ type: 'datetime', precision: 3 }) created_at!: Date;
}
@Entity('forum_answers')
export class ForumAnswerEntity extends Identified {
  @Column({ type: 'char', length: 36 }) post_id!: string;
  @Column({ type: 'char', length: 36, nullable: true }) author_id!: string | null;
  @Column({ default: false }) is_anonymous!: boolean;
  @Column('text') content!: string;
  @CreateDateColumn({ type: 'datetime', precision: 3 }) created_at!: Date;
}
export const entities = [
  UserTypeEntity,
  UserEntity,
  LicensePlateEntity,
  BusLineEntity,
  BusStopEntity,
  BusLineStop,
  DriverSessionEntity,
  BusLocationEntity,
  CampusPlaceEntity,
  ForumPostEntity,
  ForumAnswerEntity,
];
