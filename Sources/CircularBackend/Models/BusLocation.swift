//
//  BusLocation.swift
//  CircularBackend
//
//  Created by Sam Nascimento on 18/07/25.
//

import Vapor
import Fluent

enum BusStatus: String, Codable {
    case notCirculating
    case circulating
}

struct BusLocation: Content {
    var busStatus: BusStatus
    var busLine: String
    var position: [Float]
    var timestamp: Date
    var speed: Float
    var headingTowards: Float
}

struct BusLocationKey: StorageKey {
    typealias Value = Dictionary<String, BusLocation>
}

struct BusLocationLock: LockKey {}
