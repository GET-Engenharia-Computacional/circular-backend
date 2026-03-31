import Fluent
import Vapor

struct LoginController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        routes
            .grouped("login")
            .grouped(User.authenticator(), User.guardMiddleware(throwing: Abort(.unauthorized)))
            .post(use: self.login)
    }

    @Sendable
    func login(request: Request) async throws(Abort) -> UserToken.Response {
        guard let user = try? request.auth.require(User.self) else {
            throw Abort(.unauthorized)
        }
        
        guard let token = try? user.generateToken() else {
            throw Abort(.internalServerError)
        }
        
        do {
            try await token.create(on: request.db)
        } catch {
            try? await token.delete(on: request.db)
            throw Abort(.internalServerError)
        }
        
        return token.toResponse()
    }
}
