//
//  EnsureValidLicensePlate.swift
//  CircularBackend
//
//  Created by Sam Nascimento on 04/08/25.
//

import Vapor

extension LicensePlate {
    struct EnsureValidLicensePlateMiddleware: AsyncMiddleware {
        func respond(to request: Request, chainingTo next: any AsyncResponder) async throws -> Response {
            guard
                let licensePlate = request.parameters.get("license-plate"),
                LicensePlate.isValidLicensePlateFormat(licensePlate)
            else {
                throw Abort(.badRequest, reason: "Invalid license plate")
            }
            
            return try await next.respond(to: request)
        }
    }
}
