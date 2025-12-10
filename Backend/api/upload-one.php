<?php
date_default_timezone_set('Asia/Bangkok');
header('Content-Type: application/json');

$token = $_POST['token'] ?? '';
$folder = $_POST['folder'] ?? '';
$qIndex = $_POST['questionIndex'] ?? '';

if (empty($token) || empty($folder) || !isset($_FILES['video'])) {
    http_response_code(400);
    echo json_encode(['ok'=>false,'error'=>'Missing data']);
    exit;
}

// Giới hạn size (ví dụ 200MB)
if ($_FILES['video']['size'] > 200 * 1024 * 1024) {
    http_response_code(413);
    echo json_encode(['ok'=>false,'error'=>'File too large']);
    exit;
}

$uploadDir = __DIR__.'/../../uploads/'.$folder;
if (!is_dir($uploadDir)) {
    http_response_code(400);
    echo json_encode(['ok'=>false,'error'=>'Folder not found']);
    exit;
}

$filename = "Q".($qIndex + 1).".webm";
$target = $uploadDir.'/'.$filename;

if (move_uploaded_file($_FILES['video']['tmp_name'], $target)) {

    $metaFile = $uploadDir.'/meta.json';
    $meta = file_exists($metaFile) ? json_decode(file_get_contents($metaFile), true) : [];
    $meta['questions'][$qIndex] = [
        'file' => $filename,
        'uploadedAt' => date('c'),
        'size' => $_FILES['video']['size']
    ];
    file_put_contents($metaFile, json_encode($meta, JSON_PRETTY_PRINT));

    echo json_encode(['ok'=>true, 'savedAs'=>$filename]);
} else {
    http_response_code(500);
    echo json_encode(['ok'=>false,'error'=>'Save failed']);
}
?>