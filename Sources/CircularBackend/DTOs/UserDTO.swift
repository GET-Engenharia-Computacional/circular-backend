//
//  UserDTO.swift
//  CircularBackend
//
//  Created by Sam Nascimento on 2025-10-14.
//

import Fluent
import Vapor

extension User {
    struct Request: Content, Validatable {
        var registrationNumber: String
        var password: String
        var passwordConfirmation: String
        
        func toModel() throws(Abort) -> User {
            guard self.password == self.passwordConfirmation else {
                throw Abort(.unprocessableEntity, reason: "Passwords must match")
            }
            
            guard let passwordHash = try? Bcrypt.hash(self.password) else {
                throw Abort(.internalServerError)
            }
            
            return .init(
                registrationNumber: registrationNumber,
                passwordHash: passwordHash,
                userType: .driver
            )
        }
        
        static func validations(_ validations: inout Validations) {
            validations.add("registrationNumber", as: String.self, is: !.empty)
            validations.add("password", as: String.self, is: .count(8...))
        }
    }
}
