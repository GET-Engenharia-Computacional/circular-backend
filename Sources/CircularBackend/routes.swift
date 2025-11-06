import Fluent
import Vapor

func routes(_ app: Application) throws {
    app.busLocation = .init()
    try app.register(collection: RegisterController())
    try app.register(collection: LoginController())
    try app.register(collection: BusLocationController())
}
