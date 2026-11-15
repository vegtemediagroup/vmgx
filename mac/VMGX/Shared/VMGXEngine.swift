// Copyright (c) 2026 Vegte Media Group. SPDX-License-Identifier: MIT
// VMGXEngine.swift — runs the shared VMGX JavaScript (vmgx.js + vmgx-render.js)
// through JavaScriptCore, which is built into macOS. Used by the app and the
// Quick Look extension, so both read files exactly like the website does.

import Foundation
import JavaScriptCore

struct VMGXToken: Decodable {
    let s: Int      // start, in UTF-16 units (same as NSString)
    let l: Int      // length
    let k: String   // kind: key, meta, str, text, num, date, link, kw, com, head, punc
}

struct VMGXProblem: Decodable {
    let message: String
    let reason: String
    let line: Int
    let column: Int
    let offset: Int
}

struct VMGXAnalysis: Decodable {
    let ok: Bool
    let error: VMGXProblem?
    let tokens: [VMGXToken]
    let json: String?
    let typedJson: String?
    let formatted: String?
    let previewHTML: String
    let jsonHTML: String
    let typedJsonHTML: String
    let summary: String
    let version: String

    static func failure(_ message: String) -> VMGXAnalysis {
        VMGXAnalysis(
            ok: false,
            error: VMGXProblem(message: message, reason: message, line: 1, column: 1, offset: 0),
            tokens: [], json: nil, typedJson: nil, formatted: nil,
            previewHTML: "<html><body style=\"font-family:-apple-system;padding:20px\">\(message)</body></html>",
            jsonHTML: "", typedJsonHTML: "", summary: message, version: "1.0")
    }
}

/// Not thread-safe: create one engine per thread. The app uses `VMGXEngine.shared`
/// from the main thread; the Quick Look extension makes its own.
final class VMGXEngine {
    static let shared = VMGXEngine()

    private let context: JSContext?
    private let render: JSValue?

    init() {
        let context = JSContext()
        let bundle = Bundle(for: VMGXEngine.self)
        for name in ["vmgx", "vmgx-render"] {
            if let url = bundle.url(forResource: name, withExtension: "js"),
               let source = try? String(contentsOf: url, encoding: .utf8) {
                context?.evaluateScript(source, withSourceURL: url)
            }
        }
        self.context = context
        let render = context?.objectForKeyedSubscript("VMGXRender")
        self.render = (render?.isUndefined ?? true) ? nil : render
    }

    func analyze(_ text: String, title: String = "", quickLook: Bool = false) -> VMGXAnalysis {
        guard let render else {
            return .failure("The VMGX engine could not be loaded.")
        }
        let options: [String: Any] = ["title": title, "quickLook": quickLook]
        guard let output = render.invokeMethod("analyzeJSON", withArguments: [text, options])?.toString(),
              let data = output.data(using: .utf8) else {
            return .failure("The VMGX engine did not return a result.")
        }
        do {
            return try JSONDecoder().decode(VMGXAnalysis.self, from: data)
        } catch {
            return .failure("The VMGX engine returned an unexpected result.")
        }
    }
}
