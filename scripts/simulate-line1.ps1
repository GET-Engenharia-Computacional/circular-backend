param(
  [Parameter(Mandatory = $true)][string]$LicensePlate,
  [string]$ApiUrl = 'http://localhost:3000',
  [string]$LineCode = '01'
)
$ErrorActionPreference = 'Stop'
$credential = Get-Credential -Message 'Entre com a matrícula e senha de motorista aprovado ou administrador'
if (-not $credential) { throw 'Login cancelado.' }
$body = @{ registrationNumber = $credential.UserName; password = $credential.GetNetworkCredential().Password } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$ApiUrl/auth/login" -ContentType 'application/json' -Body $body
$body = $null
$credential = $null
$previous = @{}
foreach ($name in @('DRIVER_TOKEN', 'LICENSE_PLATE', 'BUS_LINE_CODE', 'API_URL')) {
  $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
  $env:DRIVER_TOKEN = $login.token
  $env:LICENSE_PLATE = $LicensePlate.ToUpperInvariant()
  $env:BUS_LINE_CODE = $LineCode
  $env:API_URL = $ApiUrl
  npm run simulate:driver
  if ($LASTEXITCODE -ne 0) { throw 'A simulação foi encerrada com erro.' }
} finally {
  foreach ($name in $previous.Keys) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
  $login = $null
  Pop-Location
}
