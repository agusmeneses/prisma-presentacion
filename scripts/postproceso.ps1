# Abre el PPTX base en PowerPoint, agrega lo que pptxgenjs no sabe escribir y guarda con las fuentes incrustadas.
param(
  [string]$Entrada = "$PSScriptRoot\..\salida\prueba-base.pptx",
  [string]$Salida = "$PSScriptRoot\..\salida\PRISMA-prueba.pptx",
  [string]$CarpetaPng = "$PSScriptRoot\..\salida\revision"
)
$ErrorActionPreference = 'Stop'
$Entrada = (Resolve-Path $Entrada).Path
$Salida = [IO.Path]::GetFullPath($Salida)
$CarpetaPng = [IO.Path]::GetFullPath($CarpetaPng)
New-Item -ItemType Directory -Force $CarpetaPng | Out-Null

# Constantes de Office
$msoTrue = -1; $msoFalse = 0
$conClic = 1; $conAnterior = 2; $despuesDeAnterior = 3
$efFundido = 10; $efZoom = 23
$ppSaveAsOpenXMLPresentation = 24

function Animar($slide, $nombre, $efecto, $disparador, $retraso = 0, $duracion = 0.6) {
  $forma = $slide.Shapes.Item($nombre)
  $ef = $slide.TimeLine.MainSequence.AddEffect($forma, $efecto, 0, $disparador)
  $ef.Timing.TriggerDelayTime = $retraso
  $ef.Timing.Duration = $duracion
}

$app = New-Object -ComObject PowerPoint.Application
try {
  $pres = $app.Presentations.Open($Entrada, $msoFalse, $msoFalse, $msoFalse)

  # 1. Intro: el video arranca solo, no rebobina (queda en la portada) y avanza solo al terminar
  $s1 = $pres.Slides.Item(1)
  $video = $s1.Shapes.Item('video-intro')
  $video.AnimationSettings.PlaySettings.PlayOnEntry = $msoTrue
  $video.AnimationSettings.PlaySettings.HideWhileNotPlaying = $msoFalse
  $video.AnimationSettings.PlaySettings.RewindMovie = $msoFalse
  $s1.SlideShowTransition.AdvanceOnClick = $msoTrue
  $s1.SlideShowTransition.AdvanceOnTime = $msoTrue
  $s1.SlideShowTransition.AdvanceTime = 10.6

  # 2. Portada: corte seco (es idéntica al último cuadro) y la bajada aparece sola
  $s2 = $pres.Slides.Item(2)
  $s2.SlideShowTransition.EntryEffect = 0
  Animar $s2 'bajada-portada' $efFundido $despuesDeAnterior 0.2 1.0

  # 3. Problema: Morph (inyectado en el XML) + secuencia automática
  $s3 = $pres.Slides.Item(3)
  Animar $s3 'etiqueta-problema' $efFundido $despuesDeAnterior 0.1 0.5
  Animar $s3 'titulo-problema' $efFundido $conAnterior 0.15 0.7
  foreach ($caos in 'caos-chat', 'caos-postit', 'caos-planilla', 'caos-llamadas') {
    Animar $s3 $caos $efZoom $despuesDeAnterior 0.05 0.4
  }
  for ($i = 1; $i -le 4; $i++) {
    Animar $s3 "dolor-icono-$i" $efFundido $despuesDeAnterior 0.1 0.45
    Animar $s3 "dolor-texto-$i" $efFundido $conAnterior 0.05 0.45
  }

  $pres.SaveAs($Salida, $ppSaveAsOpenXMLPresentation, $msoTrue)

  Get-ChildItem $CarpetaPng -Filter *.png | Remove-Item
  for ($i = 1; $i -le $pres.Slides.Count; $i++) {
    $pres.Slides.Item($i).Export((Join-Path $CarpetaPng ("slide-{0:D2}.png" -f $i)), 'PNG', 1920, 1080)
  }
  $pres.Close()
  Write-Output "Guardado: $Salida"
}
finally {
  $app.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($app) | Out-Null
}
