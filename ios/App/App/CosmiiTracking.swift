import UIKit
import Capacitor
import AppTrackingTransparency

/// Asks the App Tracking Transparency question once and reports the answer to
/// the web layer, which only lets AppsFlyer read the IDFA when it is
/// "authorized". Registered from MainViewController (app-local plugin).
@objc(CosmiiTrackingPlugin)
public class CosmiiTrackingPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CosmiiTrackingPlugin"
    public let jsName = "CosmiiTracking"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise)
    ]

    private var waiting: [CAPPluginCall] = []
    private var prompting = false
    private var retried = false

    public override func load() {
        NotificationCenter.default.addObserver(self, selector: #selector(becameActive),
                                               name: UIApplication.didBecomeActiveNotification, object: nil)
    }

    deinit { NotificationCenter.default.removeObserver(self) }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if ATTrackingManager.trackingAuthorizationStatus != .notDetermined {
                call.resolve(["status": Self.name(ATTrackingManager.trackingAuthorizationStatus)])
                return
            }
            self.waiting.append(call)
            self.becameActive()
        }
    }

    /// iOS only shows the prompt while the app is active; a request made earlier
    /// returns .notDetermined without a prompt, so it is retried on activation.
    @objc private func becameActive() {
        guard !waiting.isEmpty, !prompting, UIApplication.shared.applicationState == .active else { return }
        prompting = true
        ATTrackingManager.requestTrackingAuthorization { _ in
            DispatchQueue.main.async {
                self.prompting = false
                let status = ATTrackingManager.trackingAuthorizationStatus
                if status == .notDetermined && !self.retried {
                    // Retry once: on the next activation, or after a moment if
                    // the app simply stays active.
                    self.retried = true
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1) { self.becameActive() }
                    return
                }
                let calls = self.waiting
                self.waiting.removeAll()
                calls.forEach { $0.resolve(["status": Self.name(status)]) }
            }
        }
    }

    private static func name(_ status: ATTrackingManager.AuthorizationStatus) -> String {
        switch status {
        case .authorized: return "authorized"
        case .denied: return "denied"
        case .restricted: return "restricted"
        case .notDetermined: return "notDetermined"
        @unknown default: return "denied"
        }
    }
}
