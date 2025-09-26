//
//  LicensePlate.swift
//  CircularBackend
//
//  Created by Sam Nascimento on 04/08/25.
//

import Fluent
import Vapor

final class LicensePlate: Model, @unchecked Sendable {
    static let schema = "license_plate"

    @ID(key: .id)
    var id: UUID?

    @Field(key: "license_plate")
    var licensePlate: String
    
    @Timestamp(key: "created_at", on: .create)
    var createdAt: Date?

    @Timestamp(key: "updated_at", on: .update)
    var updatedAt: Date?

    required init() {}
    
    init(licensePlate: String) {
        self.licensePlate = licensePlate
    }
}

extension LicensePlate {
    static func isValidLicensePlateFormat(_ licensePlate: String) -> Bool {
        let licensePlateRegex = /[A-Z]{3}-\d(?:\d|[A-Z])\d{2}/
        
        if let _ = try? licensePlateRegex.wholeMatch(in: licensePlate) {
            return true
        } else {
            return false
        }
    }
}
