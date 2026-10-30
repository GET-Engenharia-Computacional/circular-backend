param(
  [Parameter(Mandatory = $true)][string]$LicensePlate,
  [string]$ApiUrl = 'http://localhost:3000',
  [string]$PassengerUrl = 'http://localhost:3001',
  [string]$LineCode = '01'
)
$ErrorActionPreference = 'Stop'
$credential = Get-Credential -Message 'Entre com a matrícula e senha de motorista aprovado ou administrador'
if (-not $credential) { throw 'Login cancelado.' }
$body = @{ registrationNumber = $credential.UserName; password = $credential.GetNetworkCredential().Password } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$ApiUrl/auth/login" -ContentType 'application/json' -Body $body
$body = $null
$previousToken = $env:DRIVER_TOKEN
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
  $env:DRIVER_TOKEN = $login.token
  $env:LICENSE_PLATE = $LicensePlate.ToUpperInvariant()
  $env:BUS_LINE_CODE = $LineCode
  $env:API_URL = $ApiUrl
  $env:PASSENGER_URL = $PassengerUrl
  npm run simulate:driver
} finally {
  $env:DRIVER_TOKEN = $previousToken
  $login = $null
  Pop-Location
}

