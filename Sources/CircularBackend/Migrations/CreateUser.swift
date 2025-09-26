//
//  CreateUser.swift
//  CircularBackend
//
//  Created by Sam Nascimento on 23/07/25.
//

import Fluent

extension User {
    struct Create: AsyncMigration {
        func prepare(on database: any FluentKit.Database) async throws {
            try await database.schema(User.schema)
                .id()
                .field("registration_number", .string, .required)
                .field("password_hash", .string, .required)
                .field("user_type", database.enum(User.UserType.schema).read(), .required, .sql(.default("driver")))
                .field("is_enabled", .bool, .required, .sql(.default(false)))
                .field("created_at", .datetime, .required)
                .field("updated_at", .datetime, .required)
                .unique(on: "registration_number")
                .create()
        }
        
        func revert(on database: any Database) async throws {
            try await database.schema(User.schema)
                .delete()
        }
    }
}
