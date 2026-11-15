// Copyright (c) 2026 Vegte Media Group. SPDX-License-Identifier: MIT
// HTMLView.swift — shows the rendered preview. Keeps the scroll position while you type,
// and opens web links in your browser instead of inside the preview.

import SwiftUI
import WebKit

struct HTMLView: NSViewRepresentable {
    var html: String

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeNSView(context: Context) -> WKWebView {
        let webView = WKWebView(frame: .zero, configuration: WKWebViewConfiguration())
        webView.navigationDelegate = context.coordinator
        webView.setValue(false, forKey: "drawsBackground")
        return webView
    }

    func updateNSView(_ webView: WKWebView, context: Context) {
        let coordinator = context.coordinator
        guard coordinator.lastHTML != html else { return }
        coordinator.lastHTML = html
        let page = html
        webView.evaluateJavaScript("window.scrollY") { value, _ in
            coordinator.restoreY = (value as? NSNumber)?.doubleValue ?? 0
            webView.loadHTMLString(page, baseURL: nil)
        }
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
        var lastHTML: String?
        var restoreY: Double = 0

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            if restoreY > 0 {
                webView.evaluateJavaScript("window.scrollTo(0, \(restoreY))", completionHandler: nil)
            }
        }

        func webView(_ webView: WKWebView,
                     decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if navigationAction.navigationType == .linkActivated, let url = navigationAction.request.url {
                NSWorkspace.shared.open(url)
                decisionHandler(.cancel)
            } else {
                decisionHandler(.allow)
            }
        }
    }
}
