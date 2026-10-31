# install-agency-agents.ps1
# Principal Multi-Agent Systems Architect for P-NEXA
# Converts and installs the COMPLETE available Agency Agents catalog into Google Antigravity

$ErrorActionPreference = "Stop"

$scratchRepo = "C:\Users\dhanu\.gemini\antigravity\brain\126c7b7b-b575-4b75-951f-8c540e03dfff\scratch\agency-agents"
$workspaceRoot = "C:\Users\dhanu\OneDrive\Desktop\Mern"
$workspaceSkillsDir = "$workspaceRoot\.agents\skills"
$globalSkillsDir = "C:\Users\dhanu\.gemini\config\skills"
$divisionsFile = "$scratchRepo\divisions.json"

if (-not (Test-Path $divisionsFile)) {
    Write-Error "divisions.json not found at $divisionsFile"
    exit 1
}

$divisionsJson = Get-Content $divisionsFile -Raw | ConvertFrom-Json
$divisions = $divisionsJson.divisions.PSObject.Properties.Name

Write-Host "Discovered $($divisions.Count) official Agency Agents divisions." -ForegroundColor Cyan

function Slugify([string]$text) {
    $clean = $text.ToLower() -replace '[^a-z0-9]+', '-'
    $clean = $clean -replace '^-+|-+$', ''
    return $clean
}

$allAgents = @()
$divisionCounts = @{}

foreach ($div in $divisions) {
    $divPath = Join-Path $scratchRepo $div
    if (-not (Test-Path $divPath)) {
        Write-Warning "Division directory $divPath does not exist on disk, skipping."
        continue
    }

    $files = Get-ChildItem -Path $divPath -Filter "*.md" -Recurse | Where-Object { $_.Name -ne "README.md" }
    $divisionCounts[$div] = $files.Count

    foreach ($file in $files) {
        $raw = Get-Content $file.FullName -Raw

        # Split frontmatter and body
        if ($raw -match "(?s)^---\s*\r?\n(.*?)\r?\n---\s*\r?\n(.*)$") {
            $frontmatter = $matches[1]
            $body = $matches[2]

            # Extract name
            $name = ""
            if ($frontmatter -match "(?m)^name:\s*(.+)$") {
                $name = $matches[1].Trim().Trim('"').Trim("'")
            } else {
                $name = $file.BaseName
            }

            # Extract description
            $description = ""
            if ($frontmatter -match "(?s)^description:\s*([>|]-?\s*\r?\n)?(.*?)(?=\r?\n[a-z_]+:|\Z)") {
                $descRaw = $matches[2].Trim()
                # Clean up indentation
                $description = ($descRaw -split "\r?\n" | ForEach-Object { $_.Trim() }) -join " "
            }

            # Determine slug
            $slugBase = Slugify $name
            $agentSlug = "agency-$slugBase"

            # Create Antigravity SKILL.md content
            $skillContent = @"
---
name: $agentSlug
description: >-
  $description
---

$body
"@

            # Install into workspace .agents/skills
            $wsSkillFolder = Join-Path $workspaceSkillsDir $agentSlug
            if (-not (Test-Path $wsSkillFolder)) {
                New-Item -ItemType Directory -Path $wsSkillFolder -Force | Out-Null
            }
            Set-Content -Path (Join-Path $wsSkillFolder "SKILL.md") -Value $skillContent -Encoding utf8

            # Install into global ~/.gemini/config/skills
            $globalSkillFolder = Join-Path $globalSkillsDir $agentSlug
            if (-not (Test-Path $globalSkillFolder)) {
                New-Item -ItemType Directory -Path $globalSkillFolder -Force | Out-Null
            }
            Set-Content -Path (Join-Path $globalSkillFolder "SKILL.md") -Value $skillContent -Encoding utf8

            $agentRecord = [PSCustomObject]@{
                name = $name
                slug = $agentSlug
                division = $div
                file = $file.Name
                description = $description
                status = "INSTALLED"
                workspaceSkillPath = ".agents/skills/$agentSlug/SKILL.md"
                globalSkillPath = "~/.gemini/config/skills/$agentSlug/SKILL.md"
            }

            $allAgents += $agentRecord
        }
    }
}

Write-Host "Successfully converted and installed $($allAgents.Count) agents across $($divisions.Count) divisions." -ForegroundColor Green

# Save structured registry JSON
$registryPath = Join-Path $workspaceRoot ".agents\registry.json"
$registryData = [PSCustomObject]@{
    catalog = "Agency Agents"
    source = "https://github.com/msitarzewski/agency-agents"
    totalAgents = $allAgents.Count
    divisionsCount = $divisions.Count
    divisionCounts = $divisionCounts
    generatedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
    agents = $allAgents
}

$registryData | ConvertTo-Json -Depth 5 | Set-Content -Path $registryPath -Encoding utf8
Write-Host "Saved agent registry to $registryPath" -ForegroundColor Cyan

# Automatically regenerate Markdown documentation
if (Test-Path "$workspaceRoot\scripts\generate-registry-docs.mjs") {
    node "$workspaceRoot\scripts\generate-registry-docs.mjs"
}

# Output Summary Table
$divisionCounts.GetEnumerator() | Sort-Object Value -Descending | Format-Table -AutoSize
Write-Host "TOTAL VERIFIED AGENTS: $($allAgents.Count)" -ForegroundColor Yellow
