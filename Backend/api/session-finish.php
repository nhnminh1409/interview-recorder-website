<?php
header('Content-Type: application/json');
$input = json_decode(file_get_contents('php://input'), true);
$folder = $input['folder'] ?? '';

$metaFile = __DIR__.'/../../uploads/'.$folder.'/meta.json';
if (file_exists($metaFile)) {
    $meta = json_decode(file_get_contents($metaFile), true);
    $meta['finishedAt'] = date('c');
    $meta['status'] = 'completed';
    file_put_contents($metaFile, json_encode($meta, JSON_PRETTY_PRINT));
}
echo json_encode(['ok'=>true]);
?>