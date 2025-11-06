//
//  User.swift
//  CircularBackend
//
//  Created by Sam Nascimento on 23/07/25.
//

import Fluent
import Vapor

final class User: Model, @unchecked Sendable {
    static let schema = "user"

    @ID(key: .id)
    var id: UUID?

    @Field(key: "registration_number")
    var registrationNumber: String

    @Field(key: "password_hash")
    var passwordHash: String

    @Enum(key: "user_type")
    var userType: User.UserType
    
    @Field(key: "is_active")
    var isActive: Bool

    @Timestamp(key: "created_at", on: .create)
    var createdAt: Date?

    @Timestamp(key: "updated_at", on: .update)
    var updatedAt: Date?

    required init() {}

    init(
        id: UUID? = nil,
        registrationNumber: String,
        passwordHash: String,
        userType: User.UserType,
    ) {
        self.id = id
        self.registrationNumber = registrationNumber
        self.passwordHash = passwordHash
        self.userType = userType
        self.isActive = false
    }
}

extension User: ModelAuthenticatable {
    static let usernameKey: KeyPath<User, Field<String>> = \User.$registrationNumber
    static let passwordHashKey: KeyPath<User, Field<String>> = \User.$passwordHash

    func verify(password: String) throws -> Bool {
        return try Bcrypt.verify(password, created: self.passwordHash)
    }
}
