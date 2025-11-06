//
//  UserToken.swift
//  CircularBackend
//
//  Created by Sam Nascimento on 2025-10-14.
//

import Fluent
import Vapor

final class UserToken: Model, @unchecked Sendable {
    static let schema = "user_token"
    
    @ID(key: .id)
    var id: UUID?
    
    @Field(key: "value")
    var value: String
    
    @Field(key: "expires_on")
    var expiresOn: Date
    
    @Parent(key: "user_id")
    var user: User
    
    @Timestamp(key: "created_at", on: .create)
    var createdAt: Date?

    @Timestamp(key: "updated_at", on: .update)
    var updatedAt: Date?
    
    required init() { }
    
    init(
        id: UUID? = nil,
        value: String,
        userId: User.IDValue,
        expiresOn: Date? = nil
    ) {
        self.id = id
        self.value = value
        self.$user.id = userId
        self.expiresOn = .init(timeIntervalSinceNow: 60 * 60 * 24) // expires on the next day, the comparison function and database both ignore the time
    }
}

extension User {
    func generateToken() throws -> UserToken {
        return .init(
            value: [UInt8].random(count: 64).base64,
            userId: try self.requireID()
        )
    }
}

extension UserToken: ModelTokenAuthenticatable {
    static var valueKey: KeyPath<UserToken, Field<String>> { \.$value }
    static var userKey: KeyPath<UserToken, Parent<User>> { \.$user }

    var isValid: Bool {
        let result = Calendar.current.compare(self.expiresOn, to: .now, toGranularity: .day)
        
        return result != .orderedAscending // return true if the date it expires is before the current date
    }
}
