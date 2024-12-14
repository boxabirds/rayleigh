package generate

import (
	"log"
	"os/exec"

	"github.com/joho/godotenv"
)

// LoadEnv loads environment variables from a .env file
func LoadEnv() error {
	return godotenv.Load()
}

// CheckSQLC checks if the sqlc command is available
func CheckSQLC() (bool, string) {
	_, err := exec.LookPath("sqlc")
	if err != nil {
		instruction := "SQLC required. Please install sqlc by following the instructions at https://docs.sqlc.dev/en/latest/overview/install.html"
		return false, instruction
	}
	return true, ""
}

// GenerateSQLC runs sqlc generate to update SQLC bindings
func GenerateSQLC() {
	log.Println("Generating SQLC bindings...")
	present, instruction := CheckSQLC()
	if !present {
		log.Fatalf("sqlc command not found. %s", instruction)
	}
	cmd := exec.Command("sqlc", "generate")
	cmd.Dir = "db" // Set the working directory to firehose/db
	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Fatalf("sqlc generate failed: %v\nOutput: %s", err, string(output))
	}
	log.Printf("SQLC bindings generated successfully.\nOutput: %s", string(output))
}
