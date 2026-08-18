import Vapor
import Fluent

extension LicensePlate {
    struct Request: Content {
        var licensePlate: String
    }

    struct Response: Content {
        var id: UUID
        var licensePlate: String
    }

    func toResponse() -> LicensePlate.Response? {
        guard let id = self.id else { return nil }
        return .init(id: id, licensePlate: self.licensePlate)
    }
}