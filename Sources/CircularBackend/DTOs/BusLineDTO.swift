import Vapor
import Fluent

extension BusLine {
    struct Request: Content {
        var name: String
    }

    struct Response: Content {
        var id: UUID
        var name: String
    }

    func toResponse() -> BusLine.Response? {
        guard let id = self.id else { return nil }
        return .init(id: id, name: self.name)
    }
}