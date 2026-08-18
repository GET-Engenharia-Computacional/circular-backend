import Fluent
import Vapor

final class BusLine: Model, @unchecked Sendable {
    static let schema = "bus_line"

    @ID(key: .id)
    var id: UUID?

    @Field(key: "name")
    var name: String

    @Timestamp(key: "created_at", on: .create)
    var createdAt: Date?

    @Timestamp(key: "updated_at", on: .update)
    var updatedAt: Date?

    required init() {}

    init(id: UUID? = nil, name: String) {
        self.id = id
        self.name = name
    }
}