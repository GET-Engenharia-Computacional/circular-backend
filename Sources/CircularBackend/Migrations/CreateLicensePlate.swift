//
//  CreateLicensePlate.swift
//  CircularBackend
//
//  Created by Sam Nascimento on 04/08/25.
//

import Fluent

extension LicensePlate {
    struct Create: AsyncMigration {
        func prepare(on database: any Database) async throws {
            try await database.schema(LicensePlate.schema)
                .id()
                .field("license_plate", .string, .required)
                .field("created_at", .datetime, .required)
                .field("updated_at", .datetime, .required)
                .create()
        }
        
        func revert(on database: any Database) async throws {
            try await database.schema(LicensePlate.schema)
                .delete()
        }
    }
}
