import Vapor

struct EnsureAdminMiddleware: AsyncMiddleware {
    func respond(to request: Request, chainingTo next: any AsyncResponder) async throws -> Response {
        // Pega o usuário logado a partir do token
        let user = try request.auth.require(User.self)
        
        // Verifica se o tipo do usuário é administrador
        guard user.userType == .administrator else {
            throw Abort(.forbidden, reason: "Acesso negado. Apenas administradores podem executar esta ação.")
        }
        
        // Se for admin, deixa a requisição passar
        return try await next.respond(to: request)
    }
}