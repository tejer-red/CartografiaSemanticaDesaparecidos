<?php
/**
 * specificDate.php - Endpoint para obtener cédulas de búsqueda por rango de fechas
 * 
 * PROCESO PRINCIPAL:
 * ==================
 * 1. Validar autenticación mediante API_KEY en headers
 * 2. Validar parámetros de entrada (start_date, end_date)
 * 3. Consultar tabla cedulas_anonimizadas en rango de fechas
 * 4. Para cada cédula:
 *    a. Obtener inferencias de geolocalización (lat/long, scores)
 *    b. Obtener tatuajes asociados
 * 5. Retornar JSON con registros enriquecidos
 * 
 * TABLAS UTILIZADAS:
 * - cedulas_anonimizadas: Datos principales de personas desaparecidas
 * - repd_vp_inferencia3: Inferencias de ubicación y scores de violencia
 * - repd_vp_cedulas_senas: Señas particulares (tatuajes, cicatrices, etc.)
 * 
 * @param string start_date - Fecha inicio en formato YYYY-MM-DD
 * @param string end_date - Fecha fin en formato YYYY-MM-DD
 * @return JSON { records: [...] } o { error: string }
 */

require_once __DIR__ . '/cors.php';

// ============================================================
// PASO 1: CONFIGURACIÓN Y AUTENTICACIÓN
// ============================================================
$config = require './config.php';

// Verificar que la API_KEY del header coincida con la configurada
// Esto previene acceso no autorizado a los datos sensibles
if (!isset($_SERVER['HTTP_API_KEY']) || $_SERVER['HTTP_API_KEY'] !== $config['api_key']) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// ============================================================
// PASO 2: VALIDACIÓN DE PARÁMETROS DE ENTRADA
// ============================================================
$startDate = isset($_GET['start_date']) ? $_GET['start_date'] : null;
$endDate = isset($_GET['end_date']) ? $_GET['end_date'] : null;

// Ambas fechas son obligatorias para definir el rango de búsqueda
if (!$startDate || !$endDate) {
    http_response_code(400);
    echo json_encode(['error' => 'Start date and end date are required']);
    exit;
}

// Validar formato de fecha (YYYY-MM-DD) para prevenir inyección SQL
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate) || 
    !preg_match('/^\d{4}-\d{2}-\d{2}$/', $endDate)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid date format. Use YYYY-MM-DD']);
    exit;
}

try {
    // ============================================================
    // PASO 3: CONEXIÓN A BASE DE DATOS
    // ============================================================
    $pdo = new PDO(
        "mysql:host={$config['host']};dbname={$config['database']};charset=utf8mb4",
        $config['user'],
        $config['password']
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // ============================================================
    // PASO 4: CONSULTA PRINCIPAL DE CÉDULAS
    // ============================================================
    // Obtener registros base filtrados por fecha de desaparición
    // La tabla cedulas_anonimizadas contiene datos con PII removido
    $stmt = $pdo->prepare("
        SELECT * 
        FROM cedulas_anonimizadas 
        WHERE fecha_desaparicion BETWEEN :start_date AND :end_date
    ");
    $stmt->bindParam(':start_date', $startDate);
    $stmt->bindParam(':end_date', $endDate);
    $stmt->execute();
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // ============================================================
    // PASO 5: ENRIQUECIMIENTO DE CADA REGISTRO
    // ============================================================
    foreach ($records as &$record) {
        $id_cedula_busqueda = $record['id_cedula_busqueda'];

        // ---------------------------------------------------------
        // PASO 5a: Obtener inferencias de geolocalización
        // ---------------------------------------------------------
        // Incluye: lat/long (ubicación), sum_score (relevancia),
        // violence_score y violence_terms (indicadores de violencia)
        $inferenciasStmt = $pdo->prepare("
            SELECT id_cedula_busqueda, tipo_loc, loc, lat_long, fecha, 
                   sum_score, violence_score, violence_terms 
            FROM repd_vp_inferencia3 
            WHERE id_cedula_busqueda = :id_cedula_busqueda
        ");
        $inferenciasStmt->bindParam(':id_cedula_busqueda', $id_cedula_busqueda);
        $inferenciasStmt->execute();
        $additionalInfo = $inferenciasStmt->fetch(PDO::FETCH_ASSOC);

        // ---------------------------------------------------------
        // PASO 5b: Obtener tatuajes asociados
        // ---------------------------------------------------------
        // Filtramos solo señas de tipo 'TATUAJES' 
        // Esto es crucial para el algoritmo de matching en CrossRef
        $tatuajesStmt = $pdo->prepare("
            SELECT descripcion, parte_cuerpo
            FROM repd_vp_cedulas_senas 
            WHERE id_cedula_busqueda = :id_cedula_busqueda 
            AND tipo_sena = 'TATUAJES'
        ");
        $tatuajesStmt->bindParam(':id_cedula_busqueda', $id_cedula_busqueda);
        $tatuajesStmt->execute();
        $tatuajes = $tatuajesStmt->fetchAll(PDO::FETCH_ASSOC);

        // ---------------------------------------------------------
        // PASO 5c: Merge de información adicional al registro
        // ---------------------------------------------------------
        if ($additionalInfo) {
            $record = array_merge($record, $additionalInfo);
        }
        
        // Agregar array de tatuajes (puede estar vacío)
        $record['tatuajes'] = $tatuajes;
    }

    // ============================================================
    // PASO 6: RESPUESTA JSON
    // ============================================================
    echo json_encode(['records' => $records]);
    
} catch (PDOException $e) {
    // Log del error para debugging (no exponer detalles internos al cliente)
    error_log("specificDate.php Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database error occurred']);
}
?>