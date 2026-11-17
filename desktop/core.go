package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

var (
	appVersion = "1.0.0"
	githubRepo = ""
)

type HotManifest struct {
	SchemaVersion int            `json:"schemaVersion"`
	UpdatedAt     string         `json:"updatedAt"`
	SHA256        string         `json:"sha256"`
	Bytes         int            `json:"bytes"`
	Counts        map[string]int `json:"counts"`
	BundleFile    string         `json:"bundleFile"`
}

type AppMeta struct {
	AppVersion  string       `json:"appVersion"`
	HotManifest *HotManifest `json:"hotManifest"`
}

type HotDbUpdateResult struct {
	Status    string         `json:"status"`
	UpdatedAt string         `json:"updatedAt,omitempty"`
	Counts    map[string]int `json:"counts,omitempty"`
	Message   string         `json:"message,omitempty"`
}

type ScanModsFolderResult struct {
	Canceled                bool     `json:"canceled"`
	FolderPath              string   `json:"folderPath"`
	JarFiles                []string `json:"jarFiles"`
	HasConnectorFolder      bool     `json:"hasConnectorFolder"`
	HasEmbeddiumSodiumAlias bool     `json:"hasEmbeddiumSodiumAlias"`
}

type BundleMod struct {
	ID              string   `json:"id"`
	Name            string   `json:"name"`
	Status          string   `json:"status"`
	StatusLabel     string   `json:"statusLabel"`
	Platform        string   `json:"platform"`
	BestAlternative string   `json:"bestAlternative"`
	Tags            []string `json:"tags"`
}

type BundleRule struct {
	ID             string   `json:"id"`
	Severity       string   `json:"severity"`
	Title          string   `json:"title"`
	Description    string   `json:"description"`
	Recommendation string   `json:"recommendation"`
	ModIDs         []string `json:"modIds"`
}

type BundlePreset struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	ModIDs      []string `json:"modIds"`
}

type DbBundle struct {
	UpdatedAt string         `json:"updatedAt"`
	Mods      []BundleMod    `json:"mods"`
	Presets   []BundlePreset `json:"presets"`
	Rules     []BundleRule   `json:"rules"`
}

type AppPaths struct {
	DataDir      string
	StatePath    string
	HotDbDir     string
	ManifestPath string
	BundlePath   string
	WebViewData  string
}

func resolveAppPaths() AppPaths {
	baseDir, err := os.UserConfigDir()
	if err != nil || baseDir == "" {
		baseDir = os.TempDir()
	}
	dataDir := filepath.Join(baseDir, "ModOptimizer")
	hotDir := filepath.Join(dataDir, "hot-db")
	return AppPaths{
		DataDir:      dataDir,
		StatePath:    filepath.Join(dataDir, "app-state.json"),
		HotDbDir:     hotDir,
		ManifestPath: filepath.Join(hotDir, "manifest.json"),
		BundlePath:   filepath.Join(hotDir, "db-bundle.json"),
		WebViewData:  filepath.Join(dataDir, "webview2-data"),
	}
}

func ReadAppState(statePath string) json.RawMessage {
	data, err := os.ReadFile(statePath)
	if err != nil || len(data) == 0 {
		return nil
	}
	var js json.RawMessage
	if json.Unmarshal(data, &js) != nil {
		return nil
	}
	return js
}

func WriteAppState(statePath string, raw json.RawMessage) error {
	if !json.Valid(raw) {
		return fmt.Errorf("invalid JSON state")
	}
	if err := os.MkdirAll(filepath.Dir(statePath), 0o755); err != nil {
		return err
	}
	return os.WriteFile(statePath, raw, 0o644)
}

func ReadCachedHotManifest(paths AppPaths, embedded fs.FS) *HotManifest {
	if raw, err := os.ReadFile(paths.ManifestPath); err == nil {
		var m HotManifest
		if json.Unmarshal(raw, &m) == nil {
			return &m
		}
	}
	if raw, err := fs.ReadFile(embedded, "webui/data/manifest.json"); err == nil {
		var m HotManifest
		if json.Unmarshal(raw, &m) == nil {
			return &m
		}
	}
	return nil
}

func getHotManifestURL() string {
	repo := strings.TrimSpace(githubRepo)
	if repo == "" || !strings.Contains(repo, "/") {
		return ""
	}
	return "https://github.com/" + repo + "/releases/latest/download/manifest.json"
}

func CheckHotDbUpdate(paths AppPaths, embedded fs.FS) HotDbUpdateResult {
	manifestURL := getHotManifestURL()
	current := ReadCachedHotManifest(paths, embedded)
	if manifestURL == "" {
		res := HotDbUpdateResult{Status: "unconfigured"}
		if current != nil {
			res.UpdatedAt = current.UpdatedAt
		}
		return res
	}

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Get(manifestURL)
	if err != nil {
		return HotDbUpdateResult{Status: "error", Message: err.Error()}
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return HotDbUpdateResult{Status: "error", Message: fmt.Sprintf("HTTP %d", resp.StatusCode)}
	}

	manifestBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return HotDbUpdateResult{Status: "error", Message: err.Error()}
	}
	var remote HotManifest
	if err := json.Unmarshal(manifestBytes, &remote); err != nil {
		return HotDbUpdateResult{Status: "error", Message: err.Error()}
	}

	if current != nil && current.SHA256 != "" && current.SHA256 == remote.SHA256 {
		return HotDbUpdateResult{Status: "up-to-date", UpdatedAt: remote.UpdatedAt}
	}

	bundleName := remote.BundleFile
	if bundleName == "" {
		bundleName = "db-bundle.json"
	}
	baseU, err := url.Parse(manifestURL)
	if err != nil {
		return HotDbUpdateResult{Status: "error", Message: err.Error()}
	}
	relU, err := url.Parse(bundleName)
	if err != nil {
		return HotDbUpdateResult{Status: "error", Message: err.Error()}
	}
	bundleURL := baseU.ResolveReference(relU).String()

	bResp, err := client.Get(bundleURL)
	if err != nil {
		return HotDbUpdateResult{Status: "error", Message: err.Error()}
	}
	defer bResp.Body.Close()
	if bResp.StatusCode < 200 || bResp.StatusCode >= 300 {
		return HotDbUpdateResult{Status: "error", Message: fmt.Sprintf("Bundle HTTP %d", bResp.StatusCode)}
	}

	bundleBytes, err := io.ReadAll(bResp.Body)
	if err != nil {
		return HotDbUpdateResult{Status: "error", Message: err.Error()}
	}

	sum := sha256.Sum256(bundleBytes)
	actualSHA := hex.EncodeToString(sum[:])
	if remote.SHA256 != "" && !strings.EqualFold(remote.SHA256, actualSHA) {
		return HotDbUpdateResult{Status: "error", Message: "SHA-256 mismatch on remote db-bundle.json"}
	}

	if err := os.MkdirAll(paths.HotDbDir, 0o755); err != nil {
		return HotDbUpdateResult{Status: "error", Message: err.Error()}
	}
	if err := os.WriteFile(paths.BundlePath, bundleBytes, 0o644); err != nil {
		return HotDbUpdateResult{Status: "error", Message: err.Error()}
	}
	if err := os.WriteFile(paths.ManifestPath, manifestBytes, 0o644); err != nil {
		return HotDbUpdateResult{Status: "error", Message: err.Error()}
	}

	return HotDbUpdateResult{
		Status:    "updated",
		UpdatedAt: remote.UpdatedAt,
		Counts:    remote.Counts,
	}
}

func ScanModsFolderAt(folderPath string) (ScanModsFolderResult, error) {
	entries, err := os.ReadDir(folderPath)
	if err != nil {
		return ScanModsFolderResult{}, err
	}

	jarFiles := make([]string, 0)
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		if strings.HasSuffix(strings.ToLower(entry.Name()), ".jar") {
			jarFiles = append(jarFiles, entry.Name())
		}
	}
	sort.Strings(jarFiles)

	connectorDir := filepath.Join(folderPath, ".connector")
	_, connErr := os.Stat(connectorDir)
	hasConnector := connErr == nil

	hasAlias := false
	if hasConnector {
		if raw, err := os.ReadFile(filepath.Join(connectorDir, "connector.json")); err == nil {
			lower := strings.ToLower(string(raw))
			hasAlias = strings.Contains(lower, "embeddium") && strings.Contains(lower, "sodium")
		}
	}

	return ScanModsFolderResult{
		Canceled:                false,
		FolderPath:              folderPath,
		JarFiles:                jarFiles,
		HasConnectorFolder:      hasConnector,
		HasEmbeddiumSodiumAlias: hasAlias,
	}, nil
}

var (
	jarExtRe     = regexp.MustCompile(`(?i)\.jar(\.disabled)?$`)
	mcVersionRe  = regexp.MustCompile(`(?i)[-_+]mc?1\.\d+(\.\d+)?`)
	loaderTagRe  = regexp.MustCompile(`(?i)[-_+](forge|neoforge|fabric|quilt|universal)\b`)
	verSuffixRe  = regexp.MustCompile(`(?i)[-_+ ]v?\d+\.\d+.*$`)
	nonAlnumRe   = regexp.MustCompile(`[^a-z0-9]+`)
)

func NormalizeJarToken(raw string) string {
	s := strings.ToLower(raw)
	s = jarExtRe.ReplaceAllString(s, "")
	s = mcVersionRe.ReplaceAllString(s, "")
	s = loaderTagRe.ReplaceAllString(s, "")
	s = verSuffixRe.ReplaceAllString(s, "")
	s = nonAlnumRe.ReplaceAllString(s, "")
	return s
}

var jarAliases = map[string]string{
	"embeddium":                   "embeddium",
	"emberbium":                   "emberbium",
	"nvidium":                     "nvidium",
	"alloyium":                    "alloyium",
	"oculus":                      "oculus",
	"emberlens":                   "emberlens",
	"flerovium":                   "flerovium",
	"immediatelyfast":             "immediatelyfast",
	"modernfix":                   "modernfix",
	"ferritecore":                 "ferritecore",
	"alltheleaks":                 "alltheleaks-memory-leak-fix",
	"badoptimizations":            "badoptimizations",
	"capabilityfixrevived":        "capability-fix-revived",
	"compactf3plus":               "compact-f3-plus",
	"culllessleavesreforged":      "culllessleaves-reforged",
	"culllessleaves":              "culllessleaves-reforged",
	"eber":                        "enhanced-block-entities-reloaded",
	"enhancedblockentitiesreloaded": "enhanced-block-entities-reloaded",
	"enhancedblockentities":       "enhanced-block-entities-reloaded",
	"fastsounds":                  "fast-sounds",
	"soundgc":                     "soundgc",
	"particlecore":                "particle-core",
	"fzzyconfig":                  "fzzy-config",
	"kotlinforforge":              "kotlin-for-forge",
	"kffmod":                      "kotlin-for-forge",
	"matlib":                      "matlib",
	"immersiveoptimization":       "immersive-optimization",
	"ixeris":                      "ixeris",
	"jasione":                     "jasione",
	"kerria":                      "kerria",
	"noisiumed":                   "noisiumed",
	"packetfixer":                 "packet-fixer",
	"radiumrereforged":            "radium-re-reforged",
	"radium":                      "radium-re-reforged",
	"resourcefulconfig":           "resourceful-config",
	"connectorextras":             "connector-extras",
	"connector":                   "sinytra-connector",
	"sinytraconnector":            "sinytra-connector",
	"forgifiedfabricapi":          "forgified-fabric-api",
	"fabricapi":                   "forgified-fabric-api",
	"sodiumdynamiclights":         "sodium-embeddium-dynamic-lights",
	"sodiumoptionsapi":            "sodium-embeddium-options-api",
	"solix":                       "solix",
	"structurelayoutoptimizer":    "structure-layout-optimizer",
	"c2mef":                       "concurrent-chunk-management-engine-forge-c2me",
	"c2me":                        "concurrent-chunk-management-engine-forge-c2me",
	"connectivity":                "connectivity",
	"cupboard":                    "cupboard",
	"kryptonreno":                 "krypton-reno",
	"servercore":                  "servercore",
	"entityculling":               "entity-culling",
	"morecullingreforged":         "more-culling-reforged",
	"clumps":                      "clumps",
	"dynamicfps":                  "dynamic-fps",
	"acceleratedrendering":        "accelerated-rendering",
	"threadtweak":                 "threadtweak-reforged",
}

func MatchJarsToBundle(jarFiles []string, bundle DbBundle) ([]BundleMod, []string) {
	tokenIndex := make(map[string]BundleMod)
	byID := make(map[string]BundleMod, len(bundle.Mods))
	for _, m := range bundle.Mods {
		byID[m.ID] = m
		idNorm := nonAlnumRe.ReplaceAllString(strings.ToLower(m.ID), "")
		nameNorm := nonAlnumRe.ReplaceAllString(strings.ToLower(m.Name), "")
		if len(idNorm) >= 4 {
			if _, ok := tokenIndex[idNorm]; !ok {
				tokenIndex[idNorm] = m
			}
		}
		if len(nameNorm) >= 4 {
			if _, ok := tokenIndex[nameNorm]; !ok {
				tokenIndex[nameNorm] = m
			}
		}
	}

	seen := make(map[string]bool)
	matched := make([]BundleMod, 0)
	unmatched := make([]string, 0)

	addMod := func(id string) bool {
		m, ok := byID[id]
		if !ok {
			return false
		}
		if !seen[id] {
			seen[id] = true
			matched = append(matched, m)
		}
		return true
	}

	for _, jar := range jarFiles {
		lower := strings.ToLower(jar)
		if strings.Contains(lower, "c2me") && strings.Contains(lower, "fabric") {
			if addMod("c2me-concurrent-chunk-management-engine") {
				continue
			}
		}
		if strings.Contains(lower, "vmp") && strings.Contains(lower, "fabric") {
			if addMod("very-many-players-vmp") {
				continue
			}
		}

		token := NormalizeJarToken(jar)
		if token == "" {
			unmatched = append(unmatched, jar)
			continue
		}

		if id, ok := jarAliases[token]; ok && addMod(id) {
			continue
		}
		if m, ok := tokenIndex[token]; ok && addMod(m.ID) {
			continue
		}

		foundPartial := false
		for key, id := range jarAliases {
			if strings.HasPrefix(token, key) && len(token)-len(key) <= 6 {
				if addMod(id) {
					foundPartial = true
					break
				}
			}
		}
		if !foundPartial {
			unmatched = append(unmatched, jar)
		}
	}

	sort.Slice(matched, func(i, j int) bool {
		return matched[i].Name < matched[j].Name
	})
	return matched, unmatched
}

func LoadBundle(paths AppPaths, embedded fs.FS) (DbBundle, error) {
	var raw []byte
	var err error
	if paths.BundlePath != "" {
		raw, err = os.ReadFile(paths.BundlePath)
	}
	if len(raw) == 0 || err != nil {
		raw, err = fs.ReadFile(embedded, "webui/data/db-bundle.json")
	}
	if err != nil {
		return DbBundle{}, err
	}
	var b DbBundle
	if err := json.Unmarshal(raw, &b); err != nil {
		return DbBundle{}, err
	}
	return b, nil
}

func RunCLI(args []string, embedded fs.FS) int {
	if len(args) > 0 && args[0] == "cli" {
		args = args[1:]
	}
	if len(args) == 0 || args[0] == "help" || args[0] == "--help" || args[0] == "-h" {
		fmt.Println("Mod Optimizer CLI (Go)")
		fmt.Println("Команды:")
		fmt.Println("  scan <путь_к_mods>   Проверить папку .minecraft/mods на конфликты и дубликаты")
		fmt.Println("  presets              Показать основные сборки Nvidium и Alloyium")
		return 0
	}

	paths := resolveAppPaths()
	bundle, err := LoadBundle(paths, embedded)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Не удалось загрузить базу модов: %v\n", err)
		return 1
	}

	switch args[0] {
	case "presets":
		fmt.Printf("Основные сборки (база от %s):\n", bundle.UpdatedAt)
		for i, p := range bundle.Presets {
			fmt.Printf("  %d. %s (%d модов)\n     %s\n", i+1, p.Name, len(p.ModIDs), p.Description)
		}
		return 0

	case "scan":
		if len(args) < 2 {
			fmt.Fprintln(os.Stderr, "Укажите путь к папке mods: modopt scan \"C:\\...\\.minecraft\\mods\"")
			return 1
		}
		scanRes, err := ScanModsFolderAt(args[1])
		if err != nil {
			fmt.Fprintf(os.Stderr, "Ошибка чтения папки %s: %v\n", args[1], err)
			return 1
		}
		matched, unmatched := MatchJarsToBundle(scanRes.JarFiles, bundle)
		fmt.Printf("Папка: %s | .jar: %d | Распознано: %d | Прочих модов: %d\n",
			scanRes.FolderPath, len(scanRes.JarFiles), len(matched), len(unmatched))

		selectedSet := make(map[string]bool, len(matched))
		for _, m := range matched {
			selectedSet[m.ID] = true
			tag := "OK"
			if m.Status == "outdated" || m.Status == "duplicate" || m.Status == "placebo" || m.Status == "broken" {
				tag = "BAD"
			}
			fmt.Printf("  [%s] %s (%s)\n", tag, m.Name, m.StatusLabel)
		}

		conflictCount := 0
		for _, r := range bundle.Rules {
			hits := 0
			for _, id := range r.ModIDs {
				if selectedSet[id] {
					hits++
				}
			}
			if hits >= 2 {
				conflictCount++
				fmt.Printf("\n[КОНФЛИКТ] %s\n  %s\n  Решение: %s\n", r.Title, r.Description, r.Recommendation)
			}
		}
		if conflictCount == 0 {
			fmt.Println("\nЯвных конфликтов по базе правил не найдено.")
		}
		return 0

	default:
		fmt.Fprintf(os.Stderr, "Неизвестная команда: %s\n", args[0])
		return 1
	}
}
