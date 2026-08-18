import Vapor
import Fluent

struct LicensePlateController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        let plates = routes.grouped("license-plate")

        // Rota pública
        plates.get(use: self.index)

        // Rotas protegidas (Admin)
        let adminRoutes = plates.grouped(
            UserToken.authenticator(),
            UserToken.guardMiddleware(throwing: Abort(.unauthorized)),
            EnsureAdminMiddleware()
        )
        
        adminRoutes.post(use: self.create)
        adminRoutes.delete(":id", use: self.delete)
    }

    @Sendable
    func index(request: Request) async throws(Abort) -> [LicensePlate.Response] {
        guard let plates = try? await LicensePlate.query(on: request.db).all().compactMap({ $0.toResponse() }) else {
            throw Abort(.internalServerError)
        }
        return plates
    }

    @Sendable
    func create(request: Request) async throws(Abort) -> LicensePlate.Response {
        guard let data = try? request.content.decode(LicensePlate.Request.self) else {
            throw Abort(.badRequest, reason: "Malformed request")
        }

        // Usa a sua função de Regex para garantir que a placa é válida antes de salvar no banco!
        guard LicensePlate.isValidLicensePlateFormat(data.licensePlate) else {
            throw Abort(.badRequest, reason: "Invalid license plate format")
        }

        let plate = LicensePlate(licensePlate: data.licensePlate)
        guard let _ = try? await plate.save(on: request.db) else {
            throw Abort(.internalServerError)
        }

        return plate.toResponse()!
    }

    @Sendable
    func delete(request: Request) async throws(Abort) -> HTTPStatus {
        guard let id = request.parameters.get("id", as: UUID.self),
              let plate = try? await LicensePlate.find(id, on: request.db) else {
            throw Abort(.notFound)
        }

        try? await plate.delete(on: request.db)
        return .ok
    }
}