// Copyright (c) 2026 Vegte Media Group. SPDX-License-Identifier: MIT
// ContentView.swift — editor on the left, live preview on the right, status bar below.

import SwiftUI
import AppKit
import UniformTypeIdentifiers

enum PreviewMode: String, CaseIterable, Identifiable {
    case record = "Record"
    case json = "JSON"
    case typed = "Typed JSON"
    var id: String { rawValue }
}

struct ContentView: View {
    @Binding var document: VMGXDocument
    var fileURL: URL?

    @State private var analysis: VMGXAnalysis?
    @State private var analyzedText = ""
    @State private var mode: PreviewMode = .record
    @State private var pendingWork: DispatchWorkItem?
    @State private var jumpRequest = 0

    private var fileName: String { fileURL?.lastPathComponent ?? "Untitled.vmgx" }

    var body: some View {
        VStack(spacing: 0) {
            HSplitView {
                CodeEditor(
                    text: $document.text,
                    tokens: analysis?.tokens ?? [],
                    tokensSource: analyzedText,
                    errorOffset: analysis?.error?.offset,
                    jumpRequest: jumpRequest
                )
                .frame(minWidth: 340, idealWidth: 520)

                VStack(spacing: 0) {
                    Picker("Preview", selection: $mode) {
                        ForEach(PreviewMode.allCases) { Text($0.rawValue).tag($0) }
                    }
                    .pickerStyle(.segmented)
                    .labelsHidden()
                    .padding(8)
                    Divider()
                    HTMLView(html: previewHTML)
                }
                .frame(minWidth: 300, idealWidth: 440)
            }
            Divider()
            statusBar
        }
        .toolbar {
            ToolbarItemGroup {
                Button(action: format) {
                    Label("Format", systemImage: "text.alignleft")
                }
                .help("Tidy the layout of the document")
                .disabled(analysis?.ok != true)

                Button(action: copyJSON) {
                    Label("Copy JSON", systemImage: "doc.on.doc")
                }
                .help(mode == .typed ? "Copy as typed JSON" : "Copy as plain JSON")
                .disabled(analysis?.ok != true)

                Button(action: exportJSON) {
                    Label("Export JSON", systemImage: "square.and.arrow.up")
                }
                .help(mode == .typed ? "Save as a typed JSON file" : "Save as a plain JSON file")
                .disabled(analysis?.ok != true)
            }
        }
        .onAppear { analyzeNow() }
        .onChange(of: document.text) { _ in scheduleAnalysis() }
    }

    // MARK: - Status bar

    private var statusBar: some View {
        HStack(spacing: 8) {
            if let analysis {
                Circle()
                    .fill(analysis.ok ? Color.green : Color.red)
                    .frame(width: 8, height: 8)
                if analysis.ok {
                    Text(analysis.summary)
                } else if let error = analysis.error {
                    Button {
                        jumpRequest += 1
                    } label: {
                        Text("Line \(error.line), column \(error.column): \(error.reason)")
                            .foregroundColor(.red)
                    }
                    .buttonStyle(.plain)
                    .help("Go to the problem")
                }
            } else {
                Text("Reading…")
            }
            Spacer()
            Text("VMGX")
                .foregroundColor(.secondary)
        }
        .font(.system(size: 11.5))
        .lineLimit(1)
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
    }

    // MARK: - Preview

    private var previewHTML: String {
        guard let analysis else { return "" }
        switch mode {
        case .record: return analysis.previewHTML
        case .json: return analysis.jsonHTML
        case .typed: return analysis.typedJsonHTML
        }
    }

    private func scheduleAnalysis() {
        pendingWork?.cancel()
        let work = DispatchWorkItem { analyzeNow() }
        pendingWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25, execute: work)
    }

    private func analyzeNow() {
        let text = document.text
        analysis = VMGXEngine.shared.analyze(text, title: fileName)
        analyzedText = text
    }

    // MARK: - Actions

    private func format() {
        if analyzedText != document.text { analyzeNow() }
        guard let formatted = analysis?.formatted, formatted != document.text else { return }
        document.text = formatted
    }

    private var currentJSON: String? {
        if analyzedText != document.text { analyzeNow() }
        return mode == .typed ? analysis?.typedJson : analysis?.json
    }

    private func copyJSON() {
        guard let json = currentJSON else { return }
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(json, forType: .string)
    }

    private func exportJSON() {
        guard let json = currentJSON else { return }
        let panel = NSSavePanel()
        panel.allowedContentTypes = [.json]
        let base = (fileName as NSString).deletingPathExtension
        panel.nameFieldStringValue = base + (mode == .typed ? ".typed.json" : ".json")
        guard panel.runModal() == .OK, let url = panel.url else { return }
        do {
            try Data((json + "\n").utf8).write(to: url, options: .atomic)
        } catch {
            NSAlert(error: error).runModal()
        }
    }
}
