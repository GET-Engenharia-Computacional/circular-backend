//
//  UserToken.swift
//  CircularBackend
//
//  Created by Sam Nascimento on 2025-10-14.
//

import Fluent
import Vapor

extension UserToken {
    struct Response: Content {
        var token: String
    }
    
    func toResponse() -> UserToken.Response {
        return .init(token: self.value)
    }
}
