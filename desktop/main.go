package main

import (
	"os"
	"strings"
)

func main() {
	if len(os.Args) > 1 {
		arg := strings.ToLower(os.Args[1])
		if arg == "cli" || arg == "scan" || arg == "presets" || arg == "help" || arg == "--help" || arg == "-h" {
			os.Exit(RunCLI(os.Args[1:], embeddedWebUI))
		}
	}
	os.Exit(runDesktop())
}
