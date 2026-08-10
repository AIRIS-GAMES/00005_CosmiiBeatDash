import Foundation
import Capacitor
import AVFoundation

@objc(NativeBgmPlugin)
public class NativeBgmPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeBgmPlugin"
    public let jsName = "NativeBgm"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "play", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise)
    ]

    private var player: AVAudioPlayer?

    @objc func play(_ call: CAPPluginCall) {
        guard let file = call.getString("file") else {
            call.reject("Missing file")
            return
        }

        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [.mixWithOthers])
            try AVAudioSession.sharedInstance().setActive(true)

            guard let url = resolveAssetUrl(file) else {
                call.reject("Audio asset not found: \(file)")
                return
            }

            let nextPlayer = try AVAudioPlayer(contentsOf: url)
            nextPlayer.numberOfLoops = 0
            nextPlayer.volume = Float(call.getDouble("volume") ?? 0.9)
            nextPlayer.currentTime = max(0, call.getDouble("offset") ?? 0)
            nextPlayer.prepareToPlay()
            nextPlayer.play()

            player?.stop()
            player = nextPlayer
            call.resolve([
                "duration": nextPlayer.duration,
                "currentTime": nextPlayer.currentTime
            ])
        } catch {
            call.reject("Native BGM play failed: \(error.localizedDescription)")
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        player?.stop()
        player = nil
        call.resolve()
    }

    private func resolveAssetUrl(_ file: String) -> URL? {
        let nsFile = file as NSString
        let ext = nsFile.pathExtension
        let base = nsFile.deletingPathExtension
        let directory = nsFile.deletingLastPathComponent
        let candidates = [
            "public",
            directory,
            "public/\(directory)"
        ]

        for subdirectory in candidates {
            let name = (base as NSString).lastPathComponent
            if let url = Bundle.main.url(forResource: name, withExtension: ext, subdirectory: subdirectory), FileManager.default.fileExists(atPath: url.path) {
                return url
            }
        }

        return Bundle.main.url(forResource: nsFile.lastPathComponent, withExtension: nil)
    }
}
