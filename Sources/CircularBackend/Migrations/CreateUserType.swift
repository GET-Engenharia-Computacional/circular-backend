//
//  CreateUserType.swift
//  CircularBackend
//
//  Created by Sam Nascimento on 23/07/25.
//

import Fluent

extension User.UserType {
    struct Create: AsyncMigration {
        func prepare(on database: any Database) async throws {
            let _ = try await database.enum(User.UserType.schema)
                .case("driver")
                .case("administrator")
                .create()
        }

        func revert(on database: any Database) async throws {
            try await database.enum(User.UserType.schema)
                .delete()
        }
    }
}
