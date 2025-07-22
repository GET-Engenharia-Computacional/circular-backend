import Fluent
import Vapor

func routes(_ app: Application) throws {
    app.busLocation = .init()
    try app.register(collection: BusLocationController())
}
