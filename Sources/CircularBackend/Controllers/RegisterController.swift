import Fluent
import Vapor

struct RegisterController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        routes.post("register", use: self.post)
    }
    
    @Sendable
    func post(request: Request) async throws(Abort) -> UserToken.Response  {
        guard let requestUser = try? request.content.decode(User.Request.self) else {
            throw Abort(.badRequest, reason: "Malformed request")
        }
        
        guard (try? User.Request.validate(content: request)) != nil else {
            throw Abort(.unprocessableEntity, reason: "Invalid value(s)")
        }
        
        var user: User
        do {
            user = try requestUser.toModel()
        } catch let error where error.status == .unprocessableEntity {
            throw Abort(.unprocessableEntity, reason: "Invalid value(s)")
        } catch {
            throw Abort(.internalServerError)
        }
        
        do {
            try await user.save(on: request.db)
        } catch let error as any DatabaseError where error.isConstraintFailure {
            throw Abort(.unprocessableEntity, reason: "A user with that identification number already exists")
        } catch {
            throw Abort(.internalServerError)
        }
        
        var token: UserToken
        do {
            token = try user.generateToken()
            try await token.create(on: request.db)
        } catch {
            try? await user.delete(on: request.db)
            throw Abort(.internalServerError)
        }
        
        return .init(token: token.value, userType: user.userType)
    }
}
