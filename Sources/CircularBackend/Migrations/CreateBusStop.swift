//
//  CreateBusStop.swift
//  CircularBackend
//
//  Created by Sam Nascimento on 23/07/25.
//

import Fluent

extension BusStop {
    struct Create: AsyncMigration {
        func prepare(on database: any Database) async throws {
            try await database.schema(BusStop.schema)
                .id()
                .field("long_name", .string, .required)
                .field("short_name", .string, .required)
                .field("latitude", .float, .required)
                .field("longitude", .float, .required)
                .field("is_active", .bool, .required)
                .field("created_at", .datetime, .required)
                .field("updated_at", .datetime, .required)
                .create()
        }
        
        func revert(on database: any Database) async throws {
            try await database.schema(BusStop.schema)
                .delete()
        }
    }
}
