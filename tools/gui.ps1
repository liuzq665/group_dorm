param(
  [string]$Click,
  [string]$Shot,
  [string]$Keys,
  [switch]$FocusTools,
  [int]$Wait = 900
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Gui32 {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  public struct RECT { public int Left, Top, Right, Bottom; }
}
"@
function Save-Screen([string]$path) {
  $bounds = [System.Windows.Forms.SystemInformation]::VirtualScreen
  $bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
  $dir = Split-Path -Parent $path
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  Write-Host "shot saved: $path"
}
if ($FocusTools) {
  $target = Get-Process | Where-Object { $_.ProcessName -match '微信开发者工具' -and $_.MainWindowHandle -ne 0 } | Select-Object -First 1
  if (-not $target) { throw '未找到微信开发者工具主窗口' }
  [Gui32]::ShowWindow($target.MainWindowHandle, 3) | Out-Null
  [Gui32]::SetForegroundWindow($target.MainWindowHandle) | Out-Null
  Start-Sleep -Milliseconds 1200
  Write-Host "focused: $($target.Id) $($target.MainWindowTitle)"
}
if ($Click) {
  foreach ($pair in ($Click -split ';')) {
    $parts = $pair -split ','
    $x = [int]$parts[0].Trim(); $y = [int]$parts[1].Trim()
    [Gui32]::SetCursorPos($x, $y) | Out-Null
    Start-Sleep -Milliseconds 120
    [Gui32]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)  # left down
    Start-Sleep -Milliseconds 60
    [Gui32]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)  # left up
    Start-Sleep -Milliseconds 600
    Write-Host "clicked: $x,$y"
  }
}
if ($Keys) {
  [System.Windows.Forms.SendKeys]::SendWait($Keys)
  Write-Host "keys: $Keys"
}
Start-Sleep -Milliseconds $Wait
if ($Shot) { Save-Screen $Shot }
