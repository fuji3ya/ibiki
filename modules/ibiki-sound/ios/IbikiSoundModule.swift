import ExpoModulesCore
import SoundAnalysis
import AVFoundation

// 端末内の睡眠音分類。録音ファイルを SNAudioFileAnalyzer + SNClassifySoundRequest(.version1)
// で時間ウィンドウごとに分類し、各ウィンドウの PCM ピーク音量(dBFS)を添えて返す。
// ネットワーク・アップロード一切なし（全て端末内）。
public class IbikiSoundModule: Module {
  public func definition() -> ModuleDefinition {
    Name("IbikiSound")

    // version1 分類器は iOS 15.0+。
    Function("isSupported") { () -> Bool in
      if #available(iOS 15.0, *) { return true }
      return false
    }

    // classifyFile(uri) -> [{label, startSec, endSec, peakDb, confidence}]
    // label は SoundAnalysis の生 identifier（アプリ語彙への変換は JS 側）。
    AsyncFunction("classifyFile") { (uri: String, promise: Promise) in
      guard #available(iOS 15.0, *) else {
        promise.reject("UNSUPPORTED_OS", "いびきの音分析は iOS 15 以上で動きます。")
        return
      }
      DispatchQueue.global(qos: .userInitiated).async {
        do {
          let results = try Self.classify(uri: uri)
          promise.resolve(results)
        } catch let err as AnalyzeError {
          promise.reject(err.code, err.message)
        } catch {
          promise.reject("ANALYZE_FAILED", error.localizedDescription)
        }
      }
    }
  }

  enum AnalyzeError: Error {
    case load, request, analyze
    var code: String {
      switch self {
      case .load: return "LOAD_FAILED"
      case .request: return "REQUEST_FAILED"
      case .analyze: return "ANALYZE_FAILED"
      }
    }
    var message: String {
      switch self {
      case .load: return "録音ファイルを読み込めませんでした。"
      case .request: return "音分析の準備に失敗しました。"
      case .analyze: return "音の分析に失敗しました。"
      }
    }
  }

  // 1 ウィンドウ分の分類結果（peakDb は後段で算出して埋める）。
  private struct Window {
    let label: String
    let startSec: Double
    let endSec: Double
    let confidence: Double
    var peakDb: Double
  }

  // SNResultsObserving 実装。各ウィンドウの最上位分類を収集する。
  @available(iOS 15.0, *)
  private final class Observer: NSObject, SNResultsObserving {
    var windows: [Window] = []
    func request(_ request: SNRequest, didProduce result: SNResult) {
      guard let cr = result as? SNClassificationResult,
            let top = cr.classifications.first else { return }
      windows.append(Window(
        label: top.identifier,
        startSec: cr.timeRange.start.seconds,
        endSec: (cr.timeRange.start + cr.timeRange.duration).seconds,
        confidence: top.confidence,
        peakDb: -120.0
      ))
    }
  }

  @available(iOS 15.0, *)
  private static func classify(uri: String) throws -> [[String: Any]] {
    let url = fileURL(from: uri)
    guard FileManager.default.fileExists(atPath: url.path) else { throw AnalyzeError.load }

    guard let analyzer = try? SNAudioFileAnalyzer(url: url) else { throw AnalyzeError.load }
    let request: SNClassifySoundRequest
    do {
      request = try SNClassifySoundRequest(classifierIdentifier: .version1)
    } catch {
      throw AnalyzeError.request
    }
    // 解析コスト削減: ウィンドウ重なりを無くす（既定 0.5 → 0.0 で推論回数を約半減）。
    // 一晩録音でも処理を現実的な時間に収める。睡眠音(いびき)は数秒持続するため、
    // 重なり無し・非重複ウィンドウでも検出に十分。後段のピーク算出も非重複前提で速い。
    request.overlapFactor = 0.0

    let observer = Observer()
    do {
      try analyzer.add(request, withObserver: observer)
    } catch {
      throw AnalyzeError.request
    }
    // 同期解析（このスレッドをブロックし、各ウィンドウで observer を呼ぶ）。
    analyzer.analyze()

    var windows = observer.windows
    // ウィンドウごとの PCM ピーク音量(dBFS)を、ファイルをチャンク読みして算出。
    fillPeakDb(url: url, windows: &windows)

    return windows.map { w in
      [
        "label": w.label,
        "startSec": w.startSec,
        "endSec": w.endSec,
        "peakDb": w.peakDb,
        "confidence": w.confidence,
      ]
    }
  }

  // file:// / data: / 素のパスを URL に正規化（録音は file:// 想定）。
  private static func fileURL(from uri: String) -> URL {
    if uri.hasPrefix("file://"), let u = URL(string: uri) { return u }
    return URL(fileURLWithPath: uri)
  }

  // 各ウィンドウ [startSec,endSec) のピーク振幅 → dBFS を埋める。
  // 全長を一度にメモリへ載せず、フレームをブロック読みして該当ウィンドウへ加算する
  // （一晩録音でもメモリ安全）。チャンネルは平均してモノラル化。
  //
  // 計算量: O(サンプル数 + ウィンドウ数)。サンプルもウィンドウも時系列順なので、
  // 単調増加カーソル(widx)で対応ウィンドウを追う。以前は各サンプルで全ウィンドウを
  // 線形探索しており O(サンプル数 × ウィンドウ数) = 一晩録音(約4.6億サンプル × 約1.9万
  // ウィンドウ)で実質ハングしていた。これがレポートが出ない原因だった。
  private static func fillPeakDb(url: URL, windows: inout [Window]) {
    guard !windows.isEmpty, let file = try? AVAudioFile(forReading: url) else { return }
    let format = file.processingFormat
    let sampleRate = format.sampleRate
    guard sampleRate > 0 else { return }

    // 防御的に開始時刻でソートした順序を作り、その順にカーソルを進める
    // （overlapFactor=0 で非重複だが、順不同で来ても安全に処理できるように）。
    let order = windows.indices.sorted { windows[$0].startSec < windows[$1].startSec }
    let count = order.count
    let starts = order.map { windows[$0].startSec }
    let ends = order.map { windows[$0].endSec }
    var peaks = [Float](repeating: 0, count: count)

    let blockFrames: AVAudioFrameCount = 65_536
    guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: blockFrames) else { return }
    let channelCount = Int(format.channelCount)

    var framePos: AVAudioFramePosition = 0
    var widx = 0 // 単調増加カーソル（戻らない）
    readLoop: while true {
      buffer.frameLength = 0
      do {
        try file.read(into: buffer, frameCount: blockFrames)
      } catch {
        break
      }
      let n = Int(buffer.frameLength)
      if n == 0 { break }
      guard let channels = buffer.floatChannelData else { break }

      for i in 0..<n {
        let t = Double(framePos + AVAudioFramePosition(i)) / sampleRate
        // 終わったウィンドウを飛ばす（t が終端以上）。カーソルは前進のみ。
        while widx < count && t >= ends[widx] { widx += 1 }
        if widx >= count { break readLoop } // 最後のウィンドウを過ぎた → 残りサンプル不要
        if t >= starts[widx] {
          // モノラル化（全チャンネル平均）。ウィンドウ内サンプルのみ計算。
          var sum: Float = 0
          for c in 0..<channelCount { sum += channels[c][i] }
          let amp = abs(sum / Float(channelCount))
          if amp > peaks[widx] { peaks[widx] = amp }
        }
        // t < starts[widx] はウィンドウ間ギャップ → スキップ
      }
      framePos += AVAudioFramePosition(n)
      if n < Int(blockFrames) { break }
    }

    for k in 0..<count {
      let p = max(peaks[k], 1e-6)
      windows[order[k]].peakDb = Double(20.0 * log10(p)) // dBFS（<= 0）
    }
  }
}
