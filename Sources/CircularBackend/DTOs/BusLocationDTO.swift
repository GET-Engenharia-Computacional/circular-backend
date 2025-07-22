//
//  BusLocationDTO.swift
//  CircularBackend
//
//  Created by Sam Nascimento on 18/07/25.
//

import Vapor
import Fluent

struct BusLocationRequestDTO: Content {
    var position: [Float]
    var timestamp: Date
    var speed: Float
    var headingTowards: Float
    
    func toModel(busStatus: BusStatus) -> BusLocation {
        .init(
            busStatus: busStatus,
            position: self.position,
            timestamp: self.timestamp,
            speed: self.speed,
            headingTowards: self.headingTowards
        )
    }
}
