import Fluent

extension BusLine {
    struct Create: AsyncMigration {
        func prepare(on database: any Database) async throws {
            try await database.schema(BusLine.schema)
                .id()
                .field("name", .string, .required)
                .field("created_at", .datetime, .required)
                .field("updated_at", .datetime, .required)
                .create()
        }
        
        func revert(on database: any Database) async throws {
            try await database.schema(BusLine.schema)
                .delete()
        }
    }
}