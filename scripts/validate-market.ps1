param([string]$Path = "$PSScriptRoot/../data/prism-market.json")
$ErrorActionPreference = 'Stop'
$valid = Test-Json -LiteralPath $Path -SchemaFile "$PSScriptRoot/../data/market.schema.json" -ErrorAction Stop
if (-not $valid) { throw 'JSON Schema failed' }
Write-Output 'PASS: prism.market.v1 JSON Schema'
