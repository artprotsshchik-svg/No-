package main

import (
	"encoding/json"
	"io"
	"io/fs"
	"net"
	"net/http"
	"os"
	"strings"
)

func startLocalServer(paths AppPaths) (string, error) {
	webSub, err := fs.Sub(embeddedWebUI, "webui")
	if err != nil {
		return "", err
	}
	fileServer := http.FileServer(http.FS(webSub))

	mux := http.NewServeMux()

	mux.HandleFunc("/api/desktop/meta", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, AppMeta{
			AppVersion:  appVersion,
			HotManifest: ReadCachedHotManifest(paths, embeddedWebUI),
		})
	})

	mux.HandleFunc("/api/desktop/state", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			state := ReadAppState(paths.StatePath)
			w.Header().Set("Content-Type", "application/json; charset=utf-8")
			if len(state) == 0 {
				_, _ = w.Write([]byte("null"))
				return
			}
			_, _ = w.Write(state)
			return
		}
		if r.Method == http.MethodPost {
			body, err := io.ReadAll(io.LimitReader(r.Body, 4<<20))
			if err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false})
				return
			}
			if err := WriteAppState(paths.StatePath, json.RawMessage(body)); err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false})
				return
			}
			writeJSON(w, http.StatusOK, map[string]any{"ok": true})
			return
		}
		w.WriteHeader(http.StatusMethodNotAllowed)
	})

	mux.HandleFunc("/api/desktop/scan-mods", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		dir, canceled, err := pickDirectory()
		if err != nil || canceled || dir == "" {
			writeJSON(w, http.StatusOK, ScanModsFolderResult{
				Canceled: true,
				JarFiles: []string{},
			})
			return
		}
		res, err := ScanModsFolderAt(dir)
		if err != nil {
			writeJSON(w, http.StatusOK, ScanModsFolderResult{
				Canceled: true,
				JarFiles: []string{},
			})
			return
		}
		writeJSON(w, http.StatusOK, res)
	})

	mux.HandleFunc("/api/desktop/check-hot-db", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		writeJSON(w, http.StatusOK, CheckHotDbUpdate(paths, embeddedWebUI))
	})

	mux.HandleFunc("/api/desktop/open-external", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var req struct {
			URL string `json:"url"`
		}
		if json.NewDecoder(io.LimitReader(r.Body, 16384)).Decode(&req) == nil {
			if strings.HasPrefix(req.URL, "https://") || strings.HasPrefix(req.URL, "http://") {
				openExternalURL(req.URL)
			}
		}
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
	})

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/data/manifest.json" {
			if raw, err := os.ReadFile(paths.ManifestPath); err == nil {
				w.Header().Set("Content-Type", "application/json; charset=utf-8")
				_, _ = w.Write(raw)
				return
			}
		}
		if r.URL.Path == "/data/db-bundle.json" {
			if raw, err := os.ReadFile(paths.BundlePath); err == nil {
				w.Header().Set("Content-Type", "application/json; charset=utf-8")
				_, _ = w.Write(raw)
				return
			}
		}
		fileServer.ServeHTTP(w, r)
	})

	ln, err := net.Listen("tcp", "127.0.0.1:47291")
	if err != nil {
		ln, err = net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			return "", err
		}
	}

	go func() {
		_ = http.Serve(ln, mux)
	}()

	return "http://" + ln.Addr().String() + "/", nil
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}
