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

// Get the start and end dates from the query parameters
$startDate = isset($_GET['start_date']) ? $_GET['start_date'] : null;
$endDate = isset($_GET['end_date']) ? $_GET['end_date'] : null;

if (!$startDate || !$endDate) {
    http_response_code(400);
    echo json_encode(['error' => 'Start date and end date are required']);
    exit;
}

try {
    // Establish database connection
    $pdo = new PDO("mysql:host={$config['host']};dbname={$config['database']}", $config['user'], $config['password']);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Query to fetch records from pfsi_v2_principal based on the specified date range
    $stmt = $pdo->prepare("SELECT * FROM pfsi_v2_principal WHERE Fecha_Ingreso BETWEEN :start_date AND :end_date");
    $stmt->bindParam(':start_date', $startDate);
    $stmt->bindParam(':end_date', $endDate);
    $stmt->execute();
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Output the records as JSON
    echo json_encode(['records' => $records]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>