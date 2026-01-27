<?php
require_once __DIR__ . '/cors.php';

// Include the configuration file
$config = require './config.php'; // Adjust the path accordingly

// Check for the API key in the request headers
if (!isset($_SERVER['HTTP_API_KEY']) || $_SERVER['HTTP_API_KEY'] !== $config['api_key']) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

try {
    // Establish database connection
    $pdo = new PDO("mysql:host={$config['host']};dbname={$config['database']}", $config['user'], $config['password']);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Query to get the list of tables
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

    // Output the list of tables as JSON
    echo json_encode(['tables' => $tables]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>