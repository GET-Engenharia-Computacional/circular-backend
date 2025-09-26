//
//  BusStopDTO.swift
//  CircularBackend
//
//  Created by Sam Nascimento on 23/07/25.
//

import Vapor
import Fluent

extension BusStop {
    struct Response: Content {
        var id: UUID
        
        var longName: String
        var shortName: String
        var position: [Float]
        var isActive: Bool
    }
}
