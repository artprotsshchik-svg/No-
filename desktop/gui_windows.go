//go:build windows && !cli

package main

import (
	"errors"
	"log"
	"os/exec"

	"github.com/jchv/go-webview2"
	"github.com/ncruces/zenity"
)

func pickDirectory() (string, bool, error) {
	dir, err := zenity.SelectFile(
		zenity.Title("Выберите папку mods (Minecraft / Prism Launcher)"),
		zenity.Directory(),
	)
	if err != nil {
		if errors.Is(err, zenity.ErrCanceled) {
			return "", true, nil
		}
		return "", false, err
	}
	return dir, false, nil
}

func openExternalURL(rawURL string) {
	_ = exec.Command("rundll32.exe", "url.dll,FileProtocolHandler", rawURL).Start()
}

func runDesktop() int {
	paths := resolveAppPaths()
	url, err := startLocalServer(paths)
	if err != nil {
		log.Printf("failed to start local server: %v", err)
		return 1
	}

	w := webview2.NewWithOptions(webview2.WebViewOptions{
		Debug:     false,
		AutoFocus: true,
		DataPath:  paths.WebViewData,
		WindowOptions: webview2.WindowOptions{
			Title:  "Mod Optimizer",
			Width:  1440,
			Height: 920,
			Center: true,
		},
	})
	if w == nil {
		log.Println("failed to initialize WebView2 runtime")
		return 1
	}
	defer w.Destroy()

	w.Init("window.__GO_DESKTOP_API__ = true;")
	w.Navigate(url)
	w.Run()
	return 0
}
