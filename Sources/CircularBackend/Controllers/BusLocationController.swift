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
        
        busLocations.get(use: self.get)
        busLocations.group(":license-plate") { busLocation in
            busLocation.webSocket(onUpgrade: self.webSocket)
        }
    }
    
    @Sendable
    func get(request: Request) -> Dictionary<String, BusLocation> {
        return request.application.busLocation
    }
    
    @Sendable
    func webSocket(request: Request, webSocket: WebSocket) {
        let licensePlate = request.parameters.get("license-plate")!
        let lock = request.application.locks.lock(for: BusLocationLock.self)
        
        webSocket.onText { webSocket, text in
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            
            guard let busLocationRequest = try? decoder.decode(
                BusLocationRequestDTO.self,
                from: text.data(using: .utf8, allowLossyConversion: false) ?? Data()
            ) else {
                webSocket.close(code: .init(codeNumber: 4000), promise: nil)
                return
            }
            
            lock.withLock {
                request.application.busLocation[licensePlate] = busLocationRequest.toModel(busStatus: .circulating)
            }
        }
        
        webSocket.onClose.whenComplete { result in
            if webSocket.closeCode == .normalClosure {
                lock.withLock {
                    request.application.busLocation[licensePlate]?.busStatus = .notCirculating
                }
            } else if webSocket.closeCode != .init(codeNumber: 4000) {
                lock.withLock {
                    request.application.busLocation[licensePlate]?.busStatus = .disconnected
                }
            }
        }
    }
}
