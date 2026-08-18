import Fluent
import Vapor

extension UserToken {
    struct Response: Content {
        var token: String
        var userType: User.UserType
    }
}