<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

$TOKENS_FILE      = __DIR__.'/../../data/tokens.json';
$USED_TOKENS_FILE = __DIR__.'/../../data/used_tokens.json';

// Tạo file used_tokens.json nếu chưa tồn tại (không làm lỗi lần đầu chạy)
if (!file_exists($USED_TOKENS_FILE)) {
    file_put_contents($USED_TOKENS_FILE, json_encode([], JSON_PRETTY_PRINT));
}

$allTokens  = json_decode(file_get_contents($TOKENS_FILE), true);
$usedTokens = json_decode(file_get_contents($USED_TOKENS_FILE), true) ?: [];

$input = json_decode(file_get_contents('php://input'), true);
$token = trim($input['token'] ?? '');

// === MỚI: Kiểm tra token đã dùng chưa ===
if (in_array($token, $usedTokens)) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'message' => 'Token used! Please contact to admin for support.']);
    exit;
}

// Kiểm tra token hợp lệ
$foundName = $allTokens[$token] ?? null;

if ($foundName) {
    // === MỚI: Đánh dấu token đã dùng ngay tại đây (an toàn nhất) ===
    $usedTokens[] = $token;
    file_put_contents($USED_TOKENS_FILE, json_encode($usedTokens, JSON_PRETTY_PRINT));
    
    echo json_encode(['ok' => true, 'name' => $foundName]);
} else {
    http_response_code(401);
    echo json_encode(['ok' => false, 'message' => 'Token invalid']);
}
?>