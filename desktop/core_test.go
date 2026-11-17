package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestAppStateRoundTrip(t *testing.T) {
	tmp := t.TempDir()
	stateFile := filepath.Join(tmp, "app-state.json")

	payload := json.RawMessage(`{"schemaVersion":2,"activeTab":"checker","lastSavedDate":"17.11.2026"}`)
	if err := WriteAppState(stateFile, payload); err != nil {
		t.Fatalf("WriteAppState failed: %v", err)
	}

	got := ReadAppState(stateFile)
	if string(got) != string(payload) {
		t.Fatalf("expected %s, got %s", string(payload), string(got))
	}
}

func TestScanModsFolderAndMatch(t *testing.T) {
	tmp := t.TempDir()
	for _, name := range []string{"embeddium-0.3.31+mc1.20.1.jar", "nvidium-1.20.1.jar", "readme.txt"} {
		if err := os.WriteFile(filepath.Join(tmp, name), []byte("stub"), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	connDir := filepath.Join(tmp, ".connector")
	if err := os.MkdirAll(connDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(connDir, "connector.json"), []byte(`{"embeddium":"sodium"}`), 0o644); err != nil {
		t.Fatal(err)
	}

	res, err := ScanModsFolderAt(tmp)
	if err != nil {
		t.Fatalf("ScanModsFolderAt failed: %v", err)
	}
	if len(res.JarFiles) != 2 || !res.HasConnectorFolder || !res.HasEmbeddiumSodiumAlias {
		t.Fatalf("unexpected scan result: %+v", res)
	}

	bundle := DbBundle{
		Mods: []BundleMod{
			{ID: "embeddium", Name: "Embeddium", Status: "recommended", StatusLabel: "Эталон"},
			{ID: "nvidium", Name: "Nvidium", Status: "recommended", StatusLabel: "Эталон"},
		},
	}
	matched, unmatched := MatchJarsToBundle(res.JarFiles, bundle)
	if len(matched) != 2 || len(unmatched) != 0 {
		t.Fatalf("expected 2 matched and 0 unmatched, got matched=%d unmatched=%v", len(matched), unmatched)
	}
}
