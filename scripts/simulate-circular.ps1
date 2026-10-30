param(
  [string]$LicensePlate = 'GOV-1234',
  [string]$ApiUrl = 'http://localhost:3000'
)
# Uses the current Circular itinerary; credentials are entered securely by the operator.
& "$PSScriptRoot/simulate-line1.ps1" -LicensePlate $LicensePlate -ApiUrl $ApiUrl -LineCode '03'
