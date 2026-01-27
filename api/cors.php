<?php
// cors.php - Centralized CORS handling

$allowedOrigins = [
    'http://localhost:5173',
    'https://datades.abundis.com.mx',
    'https://cartografia.tejer.red'
];

if (isset($_SERVER['HTTP_ORIGIN'])) {
    $origin = $_SERVER['HTTP_ORIGIN'];
    if (in_array($origin, $allowedOrigins)) {
        header("Access-Control-Allow-Origin: $origin");
    } else {
        // Optional: fallback or specific origin for debugging
        // header("Access-Control-Allow-Origin: *"); 
    }
} else {
    // For simple requests that might not have Origin but still need it
    header("Access-Control-Allow-Origin: *");
}

header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, API_KEY');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
