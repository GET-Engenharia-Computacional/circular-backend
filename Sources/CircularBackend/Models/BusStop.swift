//
//  BusStop.swift
//  CircularBackend
//
//  Created by Sam Nascimento on 23/07/25.
//

import Fluent
import Vapor

final class BusStop: Model, @unchecked Sendable {
    static let schema = "bus_stop"

    @ID(key: .id)
    var id: UUID?

    @Field(key: "long_name")
    var longName: String

    @Field(key: "short_name")
    var shortName: String

    @Field(key: "latitude")
    var latitude: Float

    @Field(key: "longitude")
    var longitude: Float

    @Field(key: "is_active")
    var isActive: Bool

    @Timestamp(key: "created_at", on: .create)
    var createdAt: Date?

    @Timestamp(key: "updated_at", on: .update)
    var updatedAt: Date?

    required init() {}

    init(
        id: UUID? = nil,
        longName: String,
        shortName: String,
        latitude: Float,
        longitude: Float,
        isActive: Bool,
        createdAt: Date? = nil,
        updatedAt: Date? = nil
    ) {
        self.id = id
        self.longName = longName
        self.shortName = shortName
        self.latitude = latitude
        self.longitude = longitude
        self.isActive = isActive
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    func toResponse() -> BusStop.Response? {        
        guard let id = self.id else {
            return nil
        }
        
        return .init(
            id: id,
            longName: self.longName,
            shortName: self.shortName,
            position: [self.latitude, self.longitude],
            isActive: self.isActive
        )
    }
}
