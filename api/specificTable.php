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

// Get the table name from the query parameter
$tableName = isset($_GET['table']) ? $_GET['table'] : null;
if (!$tableName) {
    http_response_code(400);
    echo json_encode(['error' => 'Table name is required']);
    exit;
}

try {
    // Establish database connection
    $pdo = new PDO("mysql:host={$config['host']};dbname={$config['database']}", $config['user'], $config['password']);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Query to get the columns of the specified table
    $stmt = $pdo->prepare("SHOW COLUMNS FROM {$tableName}");
    $stmt->execute();
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Query to get the first 5 records of the specified table
    $stmt = $pdo->prepare("SELECT * FROM {$tableName} LIMIT 5");
    $stmt->execute();
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Output the columns and records as JSON
    echo json_encode(['columns' => $columns, 'records' => $records]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>