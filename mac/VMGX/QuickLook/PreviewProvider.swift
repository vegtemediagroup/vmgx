// Copyright (c) 2026 Vegte Media Group. SPDX-License-Identifier: MIT
// PreviewProvider.swift — the Finder Quick Look preview for .vmgx files.
// Select a .vmgx file in Finder and press the space bar.

import Cocoa
import QuickLookUI
import UniformTypeIdentifiers

final class PreviewProvider: QLPreviewProvider, QLPreviewingController {

    func providePreview(for request: QLFilePreviewRequest) async throws -> QLPreviewReply {
        let url = request.fileURL
        let data = try Data(contentsOf: url)
        let text = String(decoding: data, as: UTF8.self)

        let engine = VMGXEngine()
        let analysis = engine.analyze(text, title: url.lastPathComponent, quickLook: true)
        let html = analysis.previewHTML

        return QLPreviewReply(dataOfContentType: .html, contentSize: CGSize(width: 860, height: 1000)) { reply in
            reply.stringEncoding = .utf8
            reply.title = url.lastPathComponent
            return Data(html.utf8)
        }
    }
}
