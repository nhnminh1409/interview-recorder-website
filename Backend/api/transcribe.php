<?php
header('Content-Type: application/json');
date_default_timezone_set('Asia/Bangkok');

// Nhận dữ liệu
$folder = $_POST['folder'] ?? '';
$questionIndex = $_POST['questionIndex'] ?? null;

if (empty($folder) || $questionIndex === null) {
    echo json_encode(['ok' => false, 'error' => 'Missing folder or index']);
    exit;
}

$uploadDir = __DIR__ . '/../../uploads/' . $folder;
$videoFile = $uploadDir . '/Q' . ($questionIndex + 1) . '.webm';

if (!file_exists($videoFile)) {
    echo json_encode(['ok' => false, 'error' => 'Video not found: ' . $videoFile]);
    exit;
}

// ffmpeg path
$ffmpeg = __DIR__ . '/../ffmpeg/bin/ffmpeg.exe';
if (!file_exists($ffmpeg)) {
    echo json_encode(['ok' => false, 'error' => 'ffmpeg not found']);
    exit;
}

$audioFile = $uploadDir . '/Q' . ($questionIndex + 1) . '.wav';
shell_exec("\"$ffmpeg\" -i \"$videoFile\" -vn -acodec pcm_s16le -ar 16000 -ac 1 \"$audioFile\" -y");

$whisperCmd   = __DIR__ . '/../whisper/whisper-cli.exe';
$whisperModel = __DIR__ . '/../whisper/models/ggml-tiny.bin';

if (!file_exists($whisperCmd) || !file_exists($whisperModel)) {
    echo json_encode(['ok' => false, 'error' => 'Whisper not found']);
    exit;
}

shell_exec("\"$whisperCmd\" -m \"$whisperModel\" -f \"$audioFile\" -otxt");

$txtFile = $audioFile . '.txt';
if (file_exists($txtFile)) {
    $text = trim(file_get_contents($txtFile));
    $line = "[Q" . ($questionIndex + 1) . "]\n" . $text . "\n\n";
    file_put_contents($uploadDir . '/transcript.txt', $line, FILE_APPEND | LOCK_EX);
    
    @unlink($audioFile);
    @unlink($txtFile);
    
    echo json_encode(['ok' => true, 'text' => $text]);
} else {
    echo json_encode(['ok' => false, 'error' => 'Whisper failed']);
}
?>