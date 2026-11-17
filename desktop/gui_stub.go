//go:build !windows || cli

package main

import "os"

func pickDirectory() (string, bool, error) {
	return "", true, nil
}

func openExternalURL(_ string) {}

func runDesktop() int {
	return RunCLI(os.Args[1:], embeddedWebUI)
}
