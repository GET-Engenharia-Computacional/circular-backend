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
        
        busStop.get(use: self.get)
    }

    @Sendable
    func get(request: Request) async throws -> [BusStop.Response] {
        return try await BusStop.query(on: request.db).all().map { busStop in
            return busStop.toResponseDTO()! // this function only returns nil if id is nil, since we are fetching from the database directly id will never be nil
        }
    }
}
