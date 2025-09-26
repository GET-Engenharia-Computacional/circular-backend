//
//  UserType.swift
//  CircularBackend
//
//  Created by Sam Nascimento on 23/07/25.
//

extension User {
    enum UserType: String, Codable {
        static let schema = "user_type"
        
        case driver
        case administrator
    }
}
