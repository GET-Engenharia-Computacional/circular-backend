//
//  BusStopController.swift
//  CircularBackend
//
//  Created by Sam Nascimento on 23/07/25.
//

import Fluent
import Vapor

struct BusStopController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        let busStop = routes.grouped("bus-stop")
    }

    @Sendable
    func get(request: Request) async throws -> [BusStopResponseDTO] {
        return try await BusStop.query(on: request.db).all().map { busStop in
            return busStop.toResponseDTO()!
        }
    }
}
