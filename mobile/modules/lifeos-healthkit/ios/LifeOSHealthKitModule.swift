import ExpoModulesCore
import HealthKit

public final class LifeOSHealthKitModule: Module {
  private let healthStore = HKHealthStore()

  public func definition() -> ModuleDefinition {
    Name("LifeOSHealthKit")

    AsyncFunction("isAvailable") { () -> Bool in
      HKHealthStore.isHealthDataAvailable()
    }

    AsyncFunction("requestReadAuthorization") { (metrics: [String]) async throws -> Bool in
      guard HKHealthStore.isHealthDataAvailable() else {
        throw HealthKitBridgeError.unavailable
      }

      let readTypes = try Set(metrics.map { try self.objectType(for: $0) })
      try await self.healthStore.requestAuthorization(toShare: [], read: readTypes)
      return true
    }

    AsyncFunction("getChanges") { (metric: String, anchorValue: String?, limit: Int) async throws -> [String: Any] in
      guard HKHealthStore.isHealthDataAvailable() else {
        throw HealthKitBridgeError.unavailable
      }

      let type = try self.sampleType(for: metric)
      let anchor = try self.decodeAnchor(anchorValue)

      return try await withCheckedThrowingContinuation { continuation in
        let query = HKAnchoredObjectQuery(
          type: type,
          predicate: nil,
          anchor: anchor,
          limit: max(1, min(limit, 5000))
        ) { _, samples, deletedObjects, newAnchor, error in
          if let error {
            continuation.resume(throwing: error)
            return
          }

          guard let newAnchor else {
            continuation.resume(throwing: HealthKitBridgeError.missingAnchor)
            return
          }

          do {
            let encodedAnchor = try NSKeyedArchiver.archivedData(
              withRootObject: newAnchor,
              requiringSecureCoding: true
            ).base64EncodedString()
            let mappedSamples = try (samples ?? []).compactMap {
              try Self.mapSample($0, metric: metric)
            }
            let deletedIds = (deletedObjects ?? []).map { $0.uuid.uuidString }
            continuation.resume(returning: [
              "added": mappedSamples,
              "deletedIds": deletedIds,
              "anchor": encodedAnchor,
            ])
          } catch {
            continuation.resume(throwing: error)
          }
        }

        self.healthStore.execute(query)
      }
    }
  }

  private func objectType(for metric: String) throws -> HKObjectType {
    switch metric {
    case "steps":
      return try quantityType(.stepCount)
    case "weight":
      return try quantityType(.bodyMass)
    case "sleep":
      guard let type = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else {
        throw HealthKitBridgeError.unsupportedMetric(metric)
      }
      return type
    case "workouts":
      return HKObjectType.workoutType()
    default:
      throw HealthKitBridgeError.unsupportedMetric(metric)
    }
  }

  private func sampleType(for metric: String) throws -> HKSampleType {
    guard let type = try objectType(for: metric) as? HKSampleType else {
      throw HealthKitBridgeError.unsupportedMetric(metric)
    }
    return type
  }

  private func quantityType(_ identifier: HKQuantityTypeIdentifier) throws -> HKQuantityType {
    guard let type = HKObjectType.quantityType(forIdentifier: identifier) else {
      throw HealthKitBridgeError.unsupportedMetric(identifier.rawValue)
    }
    return type
  }

  private func decodeAnchor(_ value: String?) throws -> HKQueryAnchor? {
    guard let value else {
      return nil
    }
    guard let data = Data(base64Encoded: value) else {
      throw HealthKitBridgeError.invalidAnchor
    }
    return try NSKeyedUnarchiver.unarchivedObject(ofClass: HKQueryAnchor.self, from: data)
  }

  private static func mapSample(_ sample: HKSample, metric: String) throws -> [String: Any]? {
    let value: Double
    let unit: String
    var metadata: [String: Any] = [
      "source_name": sample.sourceRevision.source.name,
      "source_bundle_id": sample.sourceRevision.source.bundleIdentifier,
    ]
    if let deviceName = sample.device?.name {
      metadata["device_name"] = deviceName
    }

    switch metric {
    case "steps":
      guard let quantitySample = sample as? HKQuantitySample else { return nil }
      value = quantitySample.quantity.doubleValue(for: .count())
      unit = "count"
    case "weight":
      guard let quantitySample = sample as? HKQuantitySample else { return nil }
      value = quantitySample.quantity.doubleValue(for: .gramUnit(with: .kilo))
      unit = "kg"
    case "sleep":
      guard let categorySample = sample as? HKCategorySample else { return nil }
      value = Double(categorySample.value)
      unit = "stage"
      metadata["category_value"] = categorySample.value
    case "workouts":
      guard let workout = sample as? HKWorkout else { return nil }
      value = workout.duration / 60
      unit = "min"
      metadata["activity_type"] = workout.workoutActivityType.rawValue
      if let energy = workout.totalEnergyBurned {
        metadata["energy_kcal"] = energy.doubleValue(for: .kilocalorie())
      }
    default:
      return nil
    }

    return [
      "id": sample.uuid.uuidString,
      "value": value,
      "unit": unit,
      "recordedAt": iso8601.string(from: sample.startDate),
      "endedAt": iso8601.string(from: sample.endDate),
      "metadata": metadata,
    ]
  }

  private static var iso8601: ISO8601DateFormatter {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
  }
}

private enum HealthKitBridgeError: LocalizedError {
  case unavailable
  case unsupportedMetric(String)
  case invalidAnchor
  case missingAnchor

  var errorDescription: String? {
    switch self {
    case .unavailable:
      return "Apple Health is not available on this device."
    case .unsupportedMetric(let metric):
      return "Unsupported Apple Health category: \(metric)."
    case .invalidAnchor:
      return "The saved Apple Health sync cursor is invalid."
    case .missingAnchor:
      return "Apple Health did not return a sync cursor."
    }
  }
}
