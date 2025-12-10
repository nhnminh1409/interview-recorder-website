<?php
header('Content-Type: application/json');

$action = $_GET['action'] ?? '';
$uploadsDir = __DIR__ . '/../../uploads/';

if ($action === 'list') {
    $folders = array_filter(scandir($uploadsDir), fn($d) => $d !== '.' && $d !== '..' && is_dir($uploadsDir . $d));
    $sessions = [];
    foreach ($folders as $f) {
        $meta = $uploadsDir . $f . '/meta.json';
        if (file_exists($meta)) {
            $m = json_decode(file_get_contents($meta), true);
            $sessions[] = [
                'folder' => $f,
                'userName' => $m['userName'] ?? 'Unknown',
                'date' => date('d/m/Y H:i', filemtime($uploadsDir . $f)),
                'questionsCount' => count($m['questions'] ?? [])
            ];
        }
    }
    echo json_encode(['ok' => true, 'sessions' => array_reverse($sessions)]);
    exit;
}

if ($action === 'view') {
    $folder = $_GET['folder'] ?? '';
    $dir = $uploadsDir . $folder;
    if (!is_dir($dir)) { echo json_encode(['ok' => false]); exit; }

    $meta = json_decode(file_get_contents($dir . '/meta.json'), true);
    $transcript = file_exists($dir . '/transcript.txt') ? file_get_contents($dir . '/transcript.txt') : '';

    $questions = [];
    for ($i = 1; $i <= 5; $i++) {
        $file = "Q$i.webm";
        $questions[] = [
            'file' => $file,
            'exists' => file_exists($dir . '/' . $file)
        ];
    }

    echo json_encode([
        'ok' => true,
        'session' => [
            'folder' => $folder,
            'userName' => $meta['userName'] ?? '',
            'startedAt' => $meta['startedAt'] ?? '',
            'questions' => $questions,
            'transcript' => $transcript
        ]
    ]);
    exit;
}

echo json_encode(['ok' => false]);
?>