import Vapor
import Fluent

struct BusLineController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        let busLines = routes.grouped("bus-line")

        // Rota pública para os motoristas (popula o Dropdown)
        busLines.get(use: self.index)

        // Rotas protegidas (Apenas Administradores logados)
        let adminRoutes = busLines.grouped(
            UserToken.authenticator(),
            UserToken.guardMiddleware(throwing: Abort(.unauthorized)),
            EnsureAdminMiddleware()
        )
        
        adminRoutes.post(use: self.create)
        adminRoutes.delete(":id", use: self.delete)
    }

    @Sendable
    func index(request: Request) async throws(Abort) -> [BusLine.Response] {
        guard let lines = try? await BusLine.query(on: request.db).all().compactMap({ $0.toResponse() }) else {
            throw Abort(.internalServerError)
        }
        return lines
    }

    @Sendable
    func create(request: Request) async throws(Abort) -> BusLine.Response {
        guard let data = try? request.content.decode(BusLine.Request.self) else {
            throw Abort(.badRequest, reason: "Malformed request")
        }

        let line = BusLine(name: data.name)
        guard let _ = try? await line.save(on: request.db) else {
            throw Abort(.internalServerError)
        }

        return line.toResponse()!
    }

    @Sendable
    func delete(request: Request) async throws(Abort) -> HTTPStatus {
        guard let id = request.parameters.get("id", as: UUID.self),
              let line = try? await BusLine.find(id, on: request.db) else {
            throw Abort(.notFound)
        }

        try? await line.delete(on: request.db)
        return .ok
    }
}