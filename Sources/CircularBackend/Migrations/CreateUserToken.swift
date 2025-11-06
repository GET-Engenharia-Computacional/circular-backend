//
//  CreateUserToken.swift
//  CircularBackend
//
//  Created by Sam Nascimento on 2025-10-14.
//

import Fluent

extension UserToken {
    struct Create: AsyncMigration {
        func prepare(on database: any Database) async throws {
            try await database.schema("user_token")
                .id()
                .field("value", .string, .required)
                .field("expires_on", .date, .required)
                .field("user_id", .uuid, .references("user", "id"))
                .field("created_at", .datetime, .required)
                .field("updated_at", .datetime, .required)
                .unique(on: "value")
                .create()
        }
        
        func revert(on database: any Database) async throws {
            try await database.schema("user_token")
                .delete()
        }
    }
}
