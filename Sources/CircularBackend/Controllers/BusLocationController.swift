//
//  BusLocationController.swift
//  CircularBackend
//
//  Created by Sam Nascimento on 18/07/25.
//

import Vapor
import Fluent

extension Application {
    var busLocation: Dictionary<String, BusLocation> {
        get {
            guard let busLocation = self.storage[BusLocationKey.self] else {
                fatalError("Tried to access BusLocation before it is initialized")
            }
            
            return busLocation
        }
        set {
            self.storage[BusLocationKey.self] = newValue
        }
    }
}

struct BusLocationController: RouteCollection {
    func boot(routes: any RoutesBuilder) {
        let busLocations = routes.grouped("bus-location")
        
        busLocations.get(use: self.index)
        busLocations
            .grouped(":license-plate")
            .group(
                LicensePlate.EnsureValidLicensePlateMiddleware(),
                UserToken.authenticator(),
                UserToken.guardMiddleware(throwing: Abort(.unauthorized, reason: "Unauthorized"))
            ) { busLocation in
                busLocation.post(use: self.update)
                busLocation.post("close", use: self.close)
            }
    }
    
    @Sendable
    func index(request: Request) -> Dictionary<String, BusLocation> {
        return request.application.busLocation
    }
    
    @Sendable
    func update(request: Request) throws -> HTTPStatus {
        let licensePlate = request.parameters.get("license-plate")!
        guard let busLocation = try? request.content.decode(BusLocation.Request.self) else {
            throw Abort(.badRequest, reason: "Invalid request format")
        }
        let lock = request.application.locks.lock(for: BusLocationLock.self)
        
        lock.withLock {
            request.application.busLocation[licensePlate] = busLocation.toModel(busStatus: .circulating)
        }
        
        return .ok
    }
    
    @Sendable
    func close(request: Request) -> HTTPStatus {
        let licensePlate = request.parameters.get("license-plate")!
        let lock = request.application.locks.lock(for: BusLocationLock.self)
        
        lock.withLock {
            request.application.busLocation[licensePlate]?.timestamp = .now
            request.application.busLocation[licensePlate]?.busStatus = .notCirculating
        }
        
        return .ok
    }
}
