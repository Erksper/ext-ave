<?php
namespace Espo\Modules\AVE\Services;

use Espo\Core\Exceptions\NotFound;
use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Record\Service as RecordService;
use Espo\Core\Record\CreateParams;
use Espo\ORM\Entity;

class AvePrincipal extends RecordService
{
    protected string $entityType = 'AvePrincipal';

    // ──────────────────────────────────────────────────────────────
    // Sobrescribir create para asignar número AVE secuencial
    // ──────────────────────────────────────────────────────────────

    public function debugReferencias(string $avePrincipalId): void
    {
        $em = $this->entityManager;
        $referencias = $em->getRDBRepository('AveInmuebleReferencia')
            ->where(['avePrincipalId' => $avePrincipalId])
            ->find();
        
        $GLOBALS['log']->info('=== DEBUG REFERENCIAS para AVE: ' . $avePrincipalId . ' ===');
        $GLOBALS['log']->info('Total referencias encontradas: ' . count($referencias));
        
        foreach ($referencias as $ref) {
            $GLOBALS['log']->info('Referencia - ID: ' . $ref->getId() . 
                ', Tipo: ' . $ref->get('tipo') . 
                ', UsarCalculo: ' . ($ref->get('usarCalculo') ? 'true' : 'false') .
                ', Precio: ' . $ref->get('valorReferencial') .
                ', Área: ' . $ref->get('areaConstruida') .
                ', PrecioM2: ' . ($ref->get('valorReferencial') && $ref->get('areaConstruida') && $ref->get('areaConstruida') > 0 ? 
                    $ref->get('valorReferencial') / $ref->get('areaConstruida') : 'N/A'));
        }
    }

    public function create(\stdClass $data, CreateParams $params): Entity
    {
        if (empty($data->numeroAve)) {
            $data->numeroAve = $this->generateNextAveNumber();
        }
        return parent::create($data, $params);
    }

    protected function generateNextAveNumber(): string
    {
        try {
            $pdo = $this->entityManager->getPDO();
            $sql = "SELECT numero_ave FROM ave_principal WHERE numero_ave LIKE 'AVE-%' ORDER BY id DESC LIMIT 1";
            $stmt = $pdo->query($sql);
            $last = $stmt->fetchColumn();
            if ($last && preg_match('/AVE-(\d+)/', $last, $matches)) {
                $next = (int)$matches[1] + 1;
            } else {
                $next = 1;
            }
            return 'AVE-' . str_pad($next, 6, '0', STR_PAD_LEFT);
        } catch (\Exception $e) {
            return 'AVE-' . date('YmdHis');
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Lista paginada
    // ──────────────────────────────────────────────────────────────
    public function getLista(
        int $pagina, int $porPagina,
        string $numero, string $cliente,
        string $identificacion, string $asesor,
        string $status = ''
    ): array {
        $GLOBALS['log']->info('=== getLista ===');
        $GLOBALS['log']->info('Filtro status: ' . ($status ?: 'NINGUNO'));
        
        $repo = $this->entityManager->getRDBRepository('AvePrincipal');
        
        $query = $repo->where([]);
        
        if ($status) {
            $query->where(['status' => $status]);
            $GLOBALS['log']->info('Filtrando por status: ' . $status);
        }
        
        $items = $query->limit(0, 100)->find();
        
        $GLOBALS['log']->info('Registros encontrados: ' . $items->count());
        
        $list = [];
        foreach ($items as $item) {
            $list[] = [
                'id'                    => $item->getId(),
                'numeroAve'             => $item->get('numeroAve'),
                'nombreCliente'         => $item->get('nombreCliente'),
                'identificacionCliente' => $item->get('identificacionCliente'),
                'tipoIdentificacion'    => $item->get('tipoIdentificacion'),
                'assignedUserName'      => $item->get('assignedUserName'),
                'aveInmuebleName'       => $item->get('aveInmuebleName'),
                'createdAt'             => $item->get('createdAt'),
                'status'                => $item->get('status'),
            ];
            $GLOBALS['log']->info('Registro: ' . $item->get('numeroAve') . ' - Status: ' . $item->get('status'));
        }
        
        return [
            'success' => true,
            'data' => [
                'list' => $list,
                'total' => count($list),
                'totalPaginas' => 1
            ]
        ];
    }

    public function cambiarStatus(string $aveId, string $status): array
    {
        $allowed = ['elaboracion', 'impresion'];
        if (!in_array($status, $allowed)) {
            throw new BadRequest("Estado inválido: $status");
        }

        $em     = $this->entityManager;
        $entity = $em->getEntity('AvePrincipal', $aveId);
        if (!$entity) throw new NotFound("AvePrincipal '$aveId' no encontrado.");

        $entity->set('status', $status);
        $em->saveEntity($entity);

        return ['success' => true, 'status' => $status];
    }

    public function generarPdf(string $aveId): void
    {
        $em     = $this->entityManager;
        $entity = $em->getEntity('AvePrincipal', $aveId);
        if (!$entity) throw new NotFound("AvePrincipal '$aveId' no encontrado.");

        $data = $this->getOrCreate($aveId);
        $ave      = $data['data']['ave'];
        $inmueble = $data['data']['inmueble'] ?? [];
        $referencias   = $data['data']['referencias']  ?? [];
        $analisis      = $data['data']['analisis']      ?? [];
        $factoresAplicados = $data['data']['factoresAplicados'] ?? [];
        $decisiones    = $data['data']['decisiones']    ?? [];
        $canales       = $data['data']['canales']       ?? [];
        $planes        = $data['data']['planes']        ?? [];

        $html = $this->buildPdfHtml($ave, $inmueble, $referencias, $analisis, $factoresAplicados, $decisiones, $canales, $planes);

        $rootDir = dirname(__DIR__, 5);
        $dompdfPath = $rootDir . '/vendor/dompdf/dompdf/src/Dompdf.php';

        if (file_exists($dompdfPath)) {
            require_once $rootDir . '/vendor/autoload.php';
            $dompdf = new \Dompdf\Dompdf(['isRemoteEnabled' => true]);
            $dompdf->loadHtml($html);
            $dompdf->setPaper('A4', 'portrait');
            $dompdf->render();
            $filename = 'AVE-' . ($ave['numeroAve'] ?? $aveId) . '.pdf';
            $dompdf->stream($filename, ['Attachment' => true]);
        } else {
            header('Content-Type: text/html; charset=UTF-8');
            header('Content-Disposition: inline; filename="AVE.html"');
            echo $html;
        }
        exit;
    }

    private function buildPdfHtml(array $ave, array $inmueble, array $referencias, array $analisis, array $factoresAplicados, array $decisiones, array $canales, array $planes): string
    {
        $nombreCliente = htmlspecialchars($ave['nombreCliente'] ?? 'Cliente');
        $numeroAve     = htmlspecialchars($ave['numeroAve']     ?? 'N/A');
        $fecha         = date('d/m/Y');

        $refPromocion = array_filter($referencias, fn($r) => ($r['tipo'] ?? '') === 'promocion');
        $refVendidos  = array_filter($referencias, fn($r) => ($r['tipo'] ?? '') === 'vendido');
        $fortalezas   = array_filter($analisis,    fn($a) => ($a['tipo'] ?? '') === 'fortaleza');
        $debilidades  = array_filter($analisis,    fn($a) => ($a['tipo'] ?? '') === 'debilidad');

        $fmtUSD = fn($v) => $v ? '$ ' . number_format((float)$v, 2, '.', ',') : '-';
        $esc    = fn($t) => htmlspecialchars((string)($t ?? ''), ENT_QUOTES);

        // Calcular total de impacto de factores
        $totalImpacto = 0;
        foreach ($factoresAplicados as $factor) {
            $impacto = ($factor['tipo'] ?? '') === 'positivo' ? 1 : -1;
            $totalImpacto += $impacto;
        }

        $html = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">';
        $html .= '<style>
            body { font-family: Arial, sans-serif; font-size: 13px; color: #363438; margin: 0; padding: 20px; }
            h1 { color: #B8A279; text-align: center; font-size: 20px; margin-bottom: 4px; }
            h2 { color: #555; text-align: center; font-size: 15px; margin: 0 0 20px; }
            h3 { color: #B8A279; font-size: 14px; margin: 20px 0 8px; border-bottom: 2px solid #B8A279; padding-bottom: 4px; }
            h4 { font-size: 13px; margin: 12px 0 6px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
            th { background: #B8A279; color: white; padding: 8px; text-align: left; }
            td { padding: 7px 8px; border-bottom: 1px solid #eee; }
            .intro { background: #f8f9fa; border-left: 4px solid #B8A279; padding: 14px 18px; margin-bottom: 20px; line-height: 1.6; text-align: justify; }
            .precio-box { background: #B8A279; color: white; padding: 16px; border-radius: 6px; text-align: center; margin: 12px 0; }
            .precio-box strong { font-size: 20px; display: block; margin-bottom: 4px; }
            .foda-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            .fortaleza-col { background: #d4edda; border-radius: 6px; padding: 12px; }
            .debilidad-col { background: #f8d7da; border-radius: 6px; padding: 12px; }
            .foda-item { margin-bottom: 8px; }
            .foda-item strong { display: block; font-size: 12px; }
            .foda-item span { font-size: 11px; color: #555; }
            .legal-si { color: #27ae60; font-weight: 700; }
            .legal-no { color: #e74c3c; }
            .badge-positivo { color: #27ae60; font-weight: 700; }
            .badge-negativo { color: #e74c3c; font-weight: 700; }
            .canal-chip { display: inline-block; background: #e0e0e0; padding: 3px 8px; border-radius: 12px; margin: 2px; font-size: 11px; }
            .footer { margin-top: 30px; border-top: 2px solid #B8A279; padding-top: 16px; text-align: center; color: #999; font-size: 11px; }
            .impacto-box { background: #f0f0f0; border-left: 4px solid #B8A279; padding: 12px; margin-top: 16px; text-align: center; font-weight: bold; }
            .impacto-positivo { color: #27ae60; }
            .impacto-negativo { color: #e74c3c; }
            .ref-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px; overflow-x: auto; }
            .ref-table th, .ref-table td { border: 1px solid #ddd; padding: 6px; text-align: left; }
            .ref-table th { background: #B8A279; color: white; }
            .foto-thumb { max-width: 50px; max-height: 50px; border-radius: 4px; }
            @media print { body { padding: 0; } }
        </style></head><body>';

        // Título
        $html .= '<h1>ANÁLISIS PARA UNA VENTA EXITOSA</h1>';
        $html .= '<h2>' . $nombreCliente . '</h2>';

        // Intro
        $html .= '<div class="intro">Estimado(a) ' . $nombreCliente . ', reciba de todo el equipo que labora en nuestras oficinas un cordial saludo de respeto hacia usted por brindarnos su confianza. Le presentamos el siguiente Análisis de Venta Exitoso correspondiente a su propiedad; con el propósito de mostrarle referencias actuales del mercado inmobiliario que le ayuden a tomar la mejor decisión sobre el valor promocional de su inmueble y realizar un excelente negocio inmobiliario.</div>';
        $html .= '<p style="text-align:center;"><strong>Ref: ' . $numeroAve . '</strong></p>';

        // Foto del inmueble
        if (!empty($inmueble['fotoId'])) {
            $html .= '<div style="text-align:center; margin:16px 0;">';
            $html .= '<img src="api/v1/Attachment/file/' . $esc($inmueble['fotoId']) . '" style="max-width:320px; max-height:220px; border-radius:8px; border:1px solid #ddd;">';
            $html .= '</div>';
        }

        // Ubicación
        $ubicacion = implode(', ', array_filter([
            $inmueble['urbanizacion'] ?? '',
            $inmueble['avenidaCalle'] ?? '',
            $inmueble['ciudad']       ?? '',
            $inmueble['estado']       ?? ''
        ]));
        $html .= '<h3>Ubicación</h3>';
        $html .= '<p>' . $esc($ubicacion ?: 'No especificada') . '</p>';

        // Ficha del inmueble - CORREGIDA: tabla bien estructurada
        $html .= '<h3>Ficha del Inmueble</h3>';
        $html .= '<table class="ficha-table">';
        $html .= '<tr><th style="width:40%;">Campo</th><th>Valor</th></tr>';
        
        $ficha = [
            'Tipo de inmueble'    => ucfirst($inmueble['tipoPropiedad'] ?? '-') . ' - ' . ucfirst($inmueble['subtipoPropiedad'] ?? '-'),
            'Propietario'         => $inmueble['nombrePropietario'] ?? '-',
            'M² C / M² T'         => ($inmueble['areaConstruida'] ?? '0') . ' / ' . ($inmueble['areaTerreno'] ?? '0'),
            'Antigüedad (años)'   => $inmueble['antiguedad'] ?? '-',
            'Habitaciones / Baños'=> ($inmueble['numHabitaciones'] ?? '-') . ' / ' . ($inmueble['numBanos'] ?? '-'),
            'Estacionamiento'     => $inmueble['puestoEstacionamiento'] ?? '-',
        ];
        foreach ($ficha as $label => $val) {
            if ($val) {
                $html .= '<tr>';
                $html .= '<td><strong>' . $esc($label) . '</strong></td>';
                $html .= '<td>' . $esc($val) . '</td>';
                $html .= '</tr>';
            }
        }
        if (!empty($inmueble['descripcion'])) {
            $html .= '<tr><td><strong>Descripción</strong></td><td>' . $esc($inmueble['descripcion']) . '</td></tr>';
        }
        $html .= '</table>';

        // Helper para tabla de referencias - CORREGIDO
        $buildRefTable = function(array $refs, string $titulo) use ($esc, $fmtUSD): string {
            if (empty($refs)) return '';
            $refs = array_values($refs);
            $h  = '<h3>' . $titulo . '</h3>';
            $h .= '<div style="overflow-x:auto;">';
            $h .= '<table class="ref-table">';
            
            // Cabecera con números de referencia
            $h .= '<thead><tr>';
            $h .= '<th>Característica</th>';
            foreach ($refs as $i => $r) {
                $h .= '<th>REF ' . ($i + 1) . '</th>';
            }
            $h .= '</tr></thead><tbody>';
            
            // Filas de datos
            $rows = [
                'Tipo' => fn($r) => $esc(($r['tipoPropiedad'] ?? '') . ' - ' . ($r['subtipoPropiedad'] ?? '')),
                'M² C / M² T' => fn($r) => $esc(($r['areaConstruida'] ?? '0') . ' / ' . ($r['areaTerreno'] ?? '0')),
                'Antigüedad' => fn($r) => $esc($r['antiguedad'] ?? '-'),
                'Hab / Baños' => fn($r) => $esc(($r['habitaciones'] ?? '-') . ' / ' . ($r['banos'] ?? '-')),
                'Estacionamiento' => fn($r) => $esc($r['estacionamiento'] ?? '-'),
                'Terraza' => fn($r) => $esc($r['terraza'] ? 'Sí' : 'No'),
                'Valor (USD)' => fn($r) => $fmtUSD($r['valorReferencial'] ?? null),
                'USD x M²' => fn($r) => $fmtUSD($r['valorm2'] ?? null),
                'Acabados' => fn($r) => $esc($r['acabados'] ?? '-'),
            ];
            
            foreach ($rows as $label => $fn) {
                $h .= '<tr>';
                $h .= '<td><strong>' . $label . '</strong></td>';
                foreach ($refs as $r) {
                    $h .= '<td>' . $fn($r) . '</td>';
                }
                $h .= '</tr>';
            }
            
            // Fila de enlaces
            $h .= '<tr>';
            $h .= '<td><strong>Enlace</strong></td>';
            foreach ($refs as $r) {
                $enlace = $r['enlace'] ?? '';
                $h .= '<td>' . ($enlace ? '<a href="' . $esc($enlace) . '" target="_blank">Ver</a>' : '-') . '</td>';
            }
            $h .= '</tr>';
            
            // Fila de fotos
            $h .= '<tr>';
            $h .= '<td><strong>Foto</strong></td>';
            foreach ($refs as $r) {
                $fotoId = $r['fotoId'] ?? '';
                $h .= '<td>' . ($fotoId ? '<img src="api/v1/Attachment/file/' . $esc($fotoId) . '" class="foto-thumb">' : '-') . '</td>';
            }
            $h .= '</tr>';
            
            $h .= '</tbody></table>';
            $h .= '</div>';
            return $h;
        };

        $html .= $buildRefTable(array_values($refPromocion), '1. VALOR REFERENCIAL DE INMUEBLES EN PROMOCIÓN');
        $html .= $buildRefTable(array_values($refVendidos),  '2. VALOR REFERENCIAL DE INMUEBLES VENDIDOS');

        // FODA
        if (!empty($fortalezas) || !empty($debilidades)) {
            $html .= '<h3>3. ANÁLISIS DE FORTALEZAS Y DEBILIDADES</h3>';
            $html .= '<div class="foda-grid">';
            
            // Fortalezas
            $html .= '<div class="fortaleza-col">';
            $html .= '<h4 style="color:#155724; margin-top:0;"><i>✓</i> Fortalezas</h4>';
            if (empty($fortalezas)) {
                $html .= '<p>No hay fortalezas registradas</p>';
            } else {
                foreach ($fortalezas as $f) {
                    $html .= '<div class="foda-item">';
                    $html .= '<strong>' . $esc($f['tituloName'] ?? '') . '</strong>';
                    if (!empty($f['descripcion'])) {
                        $html .= '<br><span>' . $esc($f['descripcion']) . '</span>';
                    }
                    $html .= '</div>';
                }
            }
            $html .= '</div>';
            
            // Debilidades
            $html .= '<div class="debilidad-col">';
            $html .= '<h4 style="color:#721c24; margin-top:0;"><i>✗</i> Debilidades</h4>';
            if (empty($debilidades)) {
                $html .= '<p>No hay debilidades registradas</p>';
            } else {
                foreach ($debilidades as $d) {
                    $html .= '<div class="foda-item">';
                    $html .= '<strong>' . $esc($d['tituloName'] ?? '') . '</strong>';
                    if (!empty($d['descripcion'])) {
                        $html .= '<br><span>' . $esc($d['descripcion']) . '</span>';
                    }
                    $html .= '</div>';
                }
            }
            $html .= '</div>';
            
            $html .= '</div>';
        }

        // FACTORES QUE INFLUYEN EN EL PRECIO
        if (!empty($factoresAplicados)) {
            $html .= '<h3>4. FACTORES QUE INFLUYEN EN EL PRECIO</h3>';
            $html .= '<div style="overflow-x:auto;">';
            $html .= '<table class="ref-table">';
            $html .= '<thead><tr>';
            $html .= '<th>Factor</th>';
            $html .= '<th style="width:120px; text-align:center;">Impacto</th>';
            $html .= '<th style="width:100px; text-align:center;">% Afectación</th>';
            $html .= '</tr></thead><tbody>';
            
            foreach ($factoresAplicados as $factor) {
                $nombreFactor = $esc($factor['factorName'] ?? $factor['name'] ?? '');
                $tipoImpacto = $factor['tipo'] ?? '';
                $esPositivo = $tipoImpacto === 'positivo';
                $icono = $esPositivo ? '✓' : '✗';
                $textoImpacto = $esPositivo ? 'Positivo' : 'Negativo';
                $porcentaje = $esPositivo ? '+1%' : '-1%';
                $clase = $esPositivo ? 'impacto-positivo' : 'impacto-negativo';
                
                $html .= '<tr>';
                $html .= '<td>' . $nombreFactor . '</td>';
                $html .= '<td style="text-align:center;" class="' . $clase . '">' . $icono . ' ' . $textoImpacto . '</td>';
                $html .= '<td style="text-align:center; font-weight:bold;" class="' . $clase . '">' . $porcentaje . '</td>';
                $html .= '</tr>';
            }
            
            $html .= '</tbody></table>';
            $html .= '</div>';
            
            // Total de impacto
            $signoTotal = $totalImpacto >= 0 ? '+' : '';
            $claseTotal = $totalImpacto >= 0 ? 'impacto-positivo' : 'impacto-negativo';
            $html .= '<div class="impacto-box">';
            $html .= '<strong>📊 Total de afectación:</strong> <span class="' . $claseTotal . '">' . $signoTotal . $totalImpacto . '%</span><br>';
            $html .= '<small>Debido a estos factores, el precio de la propiedad puede verse afectado en un <strong>' . $signoTotal . abs($totalImpacto) . '%</strong></small>';
            $html .= '</div>';
        }

        // Situación Legal - CORREGIDO
        $html .= '<h3>5. Situación Legal</h3>';
        $html .= '<table class="legal-table">';
        $camposLegal = [
            'Cédula Catastral' => ['bool' => 'cedulaCatastral', 'nota' => 'cedCatNota'],
            'Registro de Propiedad' => ['bool' => 'registroPropiedad', 'nota' => 'regProNota'],
            'Solvencia Municipal' => ['bool' => 'solvenciaMunicipal', 'nota' => 'solMunNota'],
            'Comentario Adicional' => ['bool' => 'comentarioLegal', 'nota' => 'comLegNota'],
        ];
        foreach ($camposLegal as $label => $campo) {
            $val = !empty($ave[$campo['bool']]);
            $nota = $esc($ave[$campo['nota']] ?? '');
            $html .= '<tr>';
            $html .= '<td style="width:30%;"><strong>' . $label . '</strong></td>';
            $html .= '<td style="width:15%;" class="' . ($val ? 'legal-si' : 'legal-no') . '">' . ($val ? 'Sí' : 'No') . '</td>';
            $html .= '<td>' . $nota . '</td>';
            $html .= '</tr>';
        }
        $html .= '</table>';

        // Frase dorada
        $html .= '<div style="background: linear-gradient(135deg, #F5E6CA 0%, #E8D5B0 100%); border-left: 6px solid #B8A279; border-radius: 8px; padding: 16px 24px; margin: 24px 0; text-align: center;">';
        $html .= '<p style="color: #8B6914; font-size: 16px; font-weight: 600; margin: 0;">';
        $html .= '"De acuerdo a la información suministrada, ¿qué precio de salida al mercado le pondría usted a su propiedad?"';
        $html .= '</p>';
        $html .= '</div>';

        // Análisis de precios - CORREGIDO
        $html .= '<h3>6. Análisis Integral</h3>';
        $html .= '<table class="precios-table">';
        $html .= '<tr style="background:#f5f5f5;">';
        $html .= '<td style="padding:8px;"><strong>Síntesis de precio unitario Mts2</strong></td>';
        $html .= '<td style="padding:8px;"><strong>USD x m²</strong></td>';
        $html .= '<td style="padding:8px;"><strong>Precio (USD)</strong></td>';
        $html .= '</tr>';
        $html .= '<tr>';
        $html .= '<td style="padding:8px; border-bottom:1px solid #eee;">Precio Promedio Máximo</td>';
        $html .= '<td style="padding:8px; border-bottom:1px solid #eee;">' . $fmtUSD($ave['valorMax'] ?? null) . '</td>';
        $html .= '<td style="padding:8px; border-bottom:1px solid #eee;">' . $fmtUSD($ave['precioMax'] ?? null) . '</td>';
        $html .= '</tr>';
        $html .= '<tr>';
        $html .= '<td style="padding:8px; border-bottom:1px solid #eee;">Precio Promedio Mínimo</td>';
        $html .= '<td style="padding:8px; border-bottom:1px solid #eee;">' . $fmtUSD($ave['valorMin'] ?? null) . '</td>';
        $html .= '<td style="padding:8px; border-bottom:1px solid #eee;">' . $fmtUSD($ave['precioMin'] ?? null) . '</td>';
        $html .= '</tr>';
        $html .= '<tr>';
        $html .= '<td style="padding:8px;">Promedio de salida al mercado</td>';
        $html .= '<td style="padding:8px;">' . $fmtUSD($ave['valorPromedio'] ?? null) . '</td>';
        $html .= '<td style="padding:8px;">' . $fmtUSD($ave['precioOriginal'] ?? null) . '</td>';
        $html .= '</tr>';
        $html .= '</table>';
        
        // Precio ajustado
        $precioConAjuste = ($ave['precioOriginal'] ?? 0) * (1 + $totalImpacto / 100);
        $html .= '<div class="precio-box">';
        $html .= '<strong>Rango de Precio: ' . $fmtUSD($ave['precioMin'] ?? null) . ' — ' . $fmtUSD($ave['precioMax'] ?? null) . '</strong>';
        $html .= '<br>Ponderación: ' . ($ave['pesoOfertas'] ?? 70) . '% Ofertas / ' . ($ave['pesoVentas'] ?? 30) . '% Ventas';
        if ($totalImpacto != 0) {
            $signo = $totalImpacto >= 0 ? '+' : '';
            $html .= '<br><span style="font-size: 12px;">Ajuste por factores: ' . $signo . $totalImpacto . '% → Precio ajustado: ' . $fmtUSD($precioConAjuste) . '</span>';
        }
        $html .= '</div>';

        // Decisiones
        if (!empty($decisiones)) {
            $html .= '<h3>7. OPCIONES DE DECISIÓN</h3>';
            foreach ($decisiones as $i => $d) {
                $html .= '<p><strong>' . ($i + 1) . '. ' . $esc($d['name'] ?? '') . '</strong></p>';
                if (!empty($d['descripcion'])) {
                    $html .= '<p style="margin-left:20px; color:#666;">' . $esc($d['descripcion']) . '</p>';
                }
            }
        }

        // Plan y medios
        if (!empty($planes) || !empty($canales)) {
            $html .= '<h3>8. PLAN DE TRABAJO</h3>';
            foreach ($planes as $i => $p) {
                $html .= '<p><strong>' . ($i + 1) . '. ' . $esc($p['name'] ?? '') . '</strong></p>';
                if (!empty($p['descripcion'])) {
                    $html .= '<p style="margin-left:20px; color:#666;">' . $esc($p['descripcion']) . '</p>';
                }
            }
            if (!empty($canales)) {
                $html .= '<h4>Medios publicitarios</h4><p>';
                foreach ($canales as $c) {
                    $html .= '<span class="canal-chip">' . $esc($c['name'] ?? '') . '</span> ';
                }
                $html .= '</p>';
            }
        }

        // Footer
        $html .= '<div class="footer">';
        $html .= '<p>Nuestra mayor satisfacción es poner a su disposición la información necesaria y datos referenciales que le sirvan de apoyo para tomar la mejor decisión.</p>';
        $html .= '<p><strong>Saludos cordiales</strong><br>' . $fecha . '</p>';
        $html .= '</div>';
        
        $html .= '</body></html>';

        return $html;
    }

    // ──────────────────────────────────────────────────────────────
    // Obtener datos completos del AVE
    // ──────────────────────────────────────────────────────────────
    public function getOrCreate(string $id): array
    {
        $em = $this->entityManager;
        $entity = $em->getEntity('AvePrincipal', $id);
        if (!$entity) {
            throw new NotFound("AvePrincipal '$id' no encontrado.");
        }

        $inmueble = null;
        if ($entity->get('aveInmuebleId')) {
            $inm = $em->getEntity('AveInmueble', $entity->get('aveInmuebleId'));
            if ($inm) {
                $inmueble = $this->formatInmueble($inm);
            }
        }

        // Obtener datos del usuario asignado
        $assignedUser = null;
        $userImageId = null;
        if ($entity->get('assignedUserId')) {
            $assignedUser = $em->getEntity('User', $entity->get('assignedUserId'));
            if ($assignedUser) {
                $userImageId = $assignedUser->get('cImagenId');
            }
        }
        
        // Obtener datos del equipo
        $teamId = null;
        $teamName = null;
        $teamIds = $entity->get('teamsIds');
        if ($teamIds && is_array($teamIds) && count($teamIds) > 0) {
            $teamId = $teamIds[0];
            $team = $em->getEntity('Team', $teamId);
            if ($team) {
                $teamName = $team->get('name');
            }
        }

        $aveData = $this->formatAvePrincipal($entity);
        $aveData['assignedUserImageId'] = $userImageId;
        $aveData['teamId'] = $teamId;
        $aveData['teamName'] = $teamName;

        return [
            'success' => true,
            'data' => [
                'ave'         => $aveData,
                'inmueble'    => $inmueble,
                'referencias' => $this->getReferencias($id),
                'analisis'    => $this->getAnalisisRespuestas($id),
                'factoresAplicados' => $this->getFactoresAplicados($id),
                'decisiones'  => $this->getItemsRelacionados($id, 'decision'),
                'canales'     => $this->getItemsRelacionados($id, 'canal'),
                'planes'      => $this->getItemsRelacionados($id, 'plan'),
            ],
        ];
    }

    // ──────────────────────────────────────────────────────────────
    // Factores Aplicados (nuevo)
    // ──────────────────────────────────────────────────────────────
    private function getFactoresAplicados(string $avePrincipalId): array
    {
        $items = $this->entityManager->getRDBRepository('AveFactorAplicado')
            ->where(['avePrincipalId' => $avePrincipalId])
            ->order('id', 'ASC')
            ->find();

        $result = [];
        $totalImpacto = 0;
        foreach ($items as $item) {
            $factorCatalogo = $this->entityManager->getEntity('AveFactoresDecisionesCanalesPlan', $item->get('factorCatalogoId'));
            $tipo = $item->get('tipo');
            $impacto = $tipo === 'positivo' ? 1 : -1;
            $totalImpacto += $impacto;
            
            $result[] = [
                'id' => $item->getId(),
                'factorCatalogoId' => $item->get('factorCatalogoId'),
                'factorName' => $factorCatalogo ? $factorCatalogo->get('name') : '',
                'tipo' => $tipo,
                'impactoPorcentual' => $item->get('impactoPorcentual'),
            ];
        }
        
        // Actualizar el total de impacto en la entidad principal
        $avePrincipal = $this->entityManager->getEntity('AvePrincipal', $avePrincipalId);
        if ($avePrincipal) {
            $avePrincipal->set('totalImpactoFactores', $totalImpacto);
            $this->entityManager->saveEntity($avePrincipal);
        }
        
        return $result;
    }

    private function guardarFactoresAplicados(string $avePrincipalId, array $factores): void
    {
        $em = $this->entityManager;

        // Eliminar factores existentes
        $existentes = $em->getRDBRepository('AveFactorAplicado')
            ->where(['avePrincipalId' => $avePrincipalId])
            ->find();
        foreach ($existentes as $f) {
            $em->removeEntity($f);
        }

        // Insertar nuevos factores
        $totalImpacto = 0;
        foreach ($factores as $factor) {
            $arr = (array) $factor;
            if (empty($arr['factorCatalogoId']) || empty($arr['tipo'])) {
                continue;
            }
            
            $tipo = $arr['tipo'];
            $impacto = $tipo === 'positivo' ? 1 : -1;
            $totalImpacto += $impacto;
            
            $entity = $em->getNewEntity('AveFactorAplicado');
            $entity->set('avePrincipalId', $avePrincipalId);
            $entity->set('factorCatalogoId', $arr['factorCatalogoId']);
            $entity->set('tipo', $tipo);
            $entity->set('impactoPorcentual', $impacto);
            $em->saveEntity($entity);
        }
        
        // Actualizar el total en la entidad principal
        $avePrincipal = $em->getEntity('AvePrincipal', $avePrincipalId);
        if ($avePrincipal) {
            $avePrincipal->set('totalImpactoFactores', $totalImpacto);
            $em->saveEntity($avePrincipal);
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Guardar formulario completo (ACTUALIZADO)
    // ──────────────────────────────────────────────────────────────
    public function guardarCompleto(\stdClass $data): array
    {
        $em = $this->entityManager;
        $entity = $em->getEntity('AvePrincipal', $data->aveId);
        if (!$entity) {
            throw new NotFound("AvePrincipal '{$data->aveId}' no encontrado.");
        }

        // Pestaña 1 — Datos generales
        if (isset($data->datosGenerales)) {
            $dg = $data->datosGenerales;
            $this->setIfSet($entity, 'numeroAve', $dg->numeroAve ?? null);
            $this->setIfSet($entity, 'tipoIdentificacion', $dg->tipoIdentificacion ?? null);
            $this->setIfSet($entity, 'identificacionCliente', $dg->identificacionCliente ?? null);
            $this->setIfSet($entity, 'nombreCliente', $dg->nombreCliente ?? null);
            $this->setIfSet($entity, 'correoCliente', $dg->correoCliente ?? null);
            $this->setIfSet($entity, 'telefonoCliente', $dg->telefonoCliente ?? null);
        }

        // Pestaña 2 — Inmueble
        if (property_exists($data, 'aveInmuebleId')) {
            $entity->set('aveInmuebleId', $data->aveInmuebleId);
        }

        // Pestaña 3 — Legal
        if (isset($data->legal)) {
            $l = $data->legal;
            $this->setIfSet($entity, 'cedulaCatastral', isset($l->cedulaCatastral) ? (bool)$l->cedulaCatastral : null);
            $this->setIfSet($entity, 'cedCatNota', $l->cedCatNota ?? null);
            $this->setIfSet($entity, 'registroPropiedad', isset($l->registroPropiedad) ? (bool)$l->registroPropiedad : null);
            $this->setIfSet($entity, 'regProNota', $l->regProNota ?? null);
            $this->setIfSet($entity, 'solvenciaMunicipal', isset($l->solvenciaMunicipal) ? (bool)$l->solvenciaMunicipal : null);
            $this->setIfSet($entity, 'solMunNota', $l->solMunNota ?? null);
            $this->setIfSet($entity, 'comentarioLegal', isset($l->comentarioLegal) ? (bool)$l->comentarioLegal : null);
            $this->setIfSet($entity, 'comLegNota', $l->comLegNota ?? null);
        }

        // Guardar referencias (pestañas 4 y 5)
        if (isset($data->referencias) && is_array($data->referencias)) {
            $this->guardarReferencias($data->aveId, $data->referencias);
        }

        // Guardar análisis FODA (pestaña 6)
        if (isset($data->analisis) && is_array($data->analisis)) {
            $this->guardarAnalisisRespuestas($data->aveId, $data->analisis);
        }

        // Guardar FACTORES APLICADOS (pestaña 7) - NUEVO
        if (isset($data->factoresAplicados) && is_array($data->factoresAplicados)) {
            $this->guardarFactoresAplicados($data->aveId, $data->factoresAplicados);
        }

        // Guardar items relacionados (pestañas 9, 10, 11)
        if (isset($data->decisiones)) {
            $this->guardarItemsRelacionados($data->aveId, $data->decisiones, 'decision');
        }
        if (isset($data->canales)) {
            $this->guardarItemsRelacionados($data->aveId, $data->canales, 'canal');
        }
        if (isset($data->planes)) {
            $this->guardarItemsRelacionados($data->aveId, $data->planes, 'plan');
        }

        // Pestaña 8 — Precios
        if (isset($data->precio)) {
            $p = $data->precio;
            $this->setIfSet($entity, 'valorMax',       isset($p->valorMax)       ? (float)$p->valorMax       : null);
            $this->setIfSet($entity, 'precioMax',      isset($p->precioMax)      ? (float)$p->precioMax      : null);
            $this->setIfSet($entity, 'valorMin',       isset($p->valorMin)       ? (float)$p->valorMin       : null);
            $this->setIfSet($entity, 'precioMin',      isset($p->precioMin)      ? (float)$p->precioMin      : null);
            $this->setIfSet($entity, 'valorPromedio',  isset($p->valorPromedio)  ? (float)$p->valorPromedio  : null);
            $this->setIfSet($entity, 'precioOriginal', isset($p->precioOriginal) ? (float)$p->precioOriginal : null);
            $this->setIfSet($entity, 'precioSugerido', isset($p->precioSugerido) ? (float)$p->precioSugerido : null);
            $this->setIfSet($entity, 'ajustePrecio',   isset($p->ajustePrecio)   ? (float)$p->ajustePrecio   : null);

            // pesoOfertas - usar 50 como default si no existe o es null
            if (isset($p->pesoOfertas) && $p->pesoOfertas !== null && $p->pesoOfertas !== '') {
                $pesoOfertas = (float)$p->pesoOfertas;
                $pesoOfertas = max(0, min(100, $pesoOfertas));
                $entity->set('pesoOfertas', $pesoOfertas);
                $entity->set('pesoVentas', 100 - $pesoOfertas);
            } else {
                // Si no viene peso, establecer 50-50 solo si no tiene valor previo
                $pesoActual = $entity->get('pesoOfertas');
                if ($pesoActual === null || $pesoActual === '') {
                    $entity->set('pesoOfertas', 50);
                    $entity->set('pesoVentas', 50);
                }
            }
        }

        // Recalcular precios
        $this->recalcularPreciosParaEntity($entity);

        $em->saveEntity($entity);

        return ['success' => true, 'id' => $data->aveId];
    }

    // ──────────────────────────────────────────────────────────────
    // Recalcular precios basado en referencias
    // ──────────────────────────────────────────────────────────────
    public function recalcularPreciosParaEntity(Entity $entity): void
    {
        $em = $this->entityManager;
        $avePrincipalId = $entity->getId();
        
        $GLOBALS['log']->info('=== RECALCULAR PRECIOS PARA ENTITY ===');
        $GLOBALS['log']->info('AVE ID: ' . $avePrincipalId);
        
        // Obtener referencias que se usan en cálculo
        $referencias = $em->getRDBRepository('AveInmuebleReferencia')
            ->where([
                'avePrincipalId' => $avePrincipalId,
                'usarCalculo' => true
            ])->find();
        
        $GLOBALS['log']->info('Referencias con usarCalculo=true: ' . count($referencias));
        
        // Variables para acumular
        $sumaPreciosOfertas = 0;
        $sumaAreasOfertas = 0;
        $sumaPreciosVentas = 0;
        $sumaAreasVentas = 0;
        $todosLosPreciosM2 = [];
        
        foreach ($referencias as $ref) {
            $precio = $ref->get('valorReferencial');
            $area = $ref->get('areaConstruida');
            $tipo = $ref->get('tipo');
            
            $GLOBALS['log']->info('Procesando referencia - Tipo: ' . $tipo . ', Precio: ' . $precio . ', Área: ' . $area);
            
            if ($precio && $area && $area > 0) {
                $precioM2 = $precio / $area;
                $todosLosPreciosM2[] = $precioM2;
                
                $GLOBALS['log']->info('  Precio M2 calculado: ' . $precioM2);
                
                if ($tipo === 'promocion') {
                    $sumaPreciosOfertas += $precio;
                    $sumaAreasOfertas += $area;
                    $GLOBALS['log']->info('  Acumulado Ofertas - SumaPrecios: ' . $sumaPreciosOfertas . ', SumaAreas: ' . $sumaAreasOfertas);
                } else {
                    $sumaPreciosVentas += $precio;
                    $sumaAreasVentas += $area;
                    $GLOBALS['log']->info('  Acumulado Ventas - SumaPrecios: ' . $sumaPreciosVentas . ', SumaAreas: ' . $sumaAreasVentas);
                }
            } else {
                $GLOBALS['log']->warning('  Referencia ignorada - Precio o área inválida');
            }
        }
        
        // Calcular precio M2 promedio por tipo (suma precios / suma areas)
        $precioM2Ofertas = ($sumaAreasOfertas > 0) ? $sumaPreciosOfertas / $sumaAreasOfertas : 0;
        $precioM2Ventas = ($sumaAreasVentas > 0) ? $sumaPreciosVentas / $sumaAreasVentas : 0;
        
        $GLOBALS['log']->info('Resultados intermedios:');
        $GLOBALS['log']->info('  Precio M2 Ofertas: ' . $precioM2Ofertas);
        $GLOBALS['log']->info('  Precio M2 Ventas: ' . $precioM2Ventas);
        
        // Obtener pesos (default 50-50)
        $pesoOfertas = $entity->get('pesoOfertas');
        if ($pesoOfertas === null || $pesoOfertas === '') {
            $pesoOfertas = 50;
            $entity->set('pesoOfertas', 50);
        }
        $pesoVentas = 100 - $pesoOfertas;
        $entity->set('pesoVentas', $pesoVentas);
        
        $GLOBALS['log']->info('Pesos aplicados - Ofertas: ' . $pesoOfertas . '%, Ventas: ' . $pesoVentas . '%');
        
        // Calcular precio M2 ponderado
        $precioM2Ponderado = 0;
        if ($precioM2Ofertas > 0 || $precioM2Ventas > 0) {
            $precioM2Ponderado = ($precioM2Ofertas * $pesoOfertas / 100) + ($precioM2Ventas * $pesoVentas / 100);
        }
        
        $GLOBALS['log']->info('Precio M2 Ponderado: ' . $precioM2Ponderado);
        
        // Obtener valores máximos y mínimos de M2
        $valorMaxM2 = !empty($todosLosPreciosM2) ? max($todosLosPreciosM2) : 0;
        $valorMinM2 = !empty($todosLosPreciosM2) ? min($todosLosPreciosM2) : 0;
        
        $GLOBALS['log']->info('Valores M2 - Max: ' . $valorMaxM2 . ', Min: ' . $valorMinM2);
        
        // Obtener área del inmueble evaluado
        $areaInmueble = 0;
        if ($entity->get('aveInmuebleId')) {
            $inmueble = $em->getEntity('AveInmueble', $entity->get('aveInmuebleId'));
            if ($inmueble) {
                $areaInmueble = $inmueble->get('areaConstruida') ?? 0;
            }
        }
        
        $GLOBALS['log']->info('Área del inmueble evaluado: ' . $areaInmueble . ' m²');
        
        // Calcular precios base (sin ajuste)
        $precioMaximo = $valorMaxM2 * $areaInmueble;
        $precioMinimo = $valorMinM2 * $areaInmueble;
        $precioVentaBase = $precioM2Ponderado * $areaInmueble;  // Este es el precioOriginal
        
        $GLOBALS['log']->info('Precios base calculados:');
        $GLOBALS['log']->info('  Precio Máximo: ' . $precioMaximo);
        $GLOBALS['log']->info('  Precio Mínimo: ' . $precioMinimo);
        $GLOBALS['log']->info('  Precio Venta Base (Original): ' . $precioVentaBase);
        
        // Aplicar ajuste de precio SOLO para el precio sugerido
        $ajuste = $entity->get('ajustePrecio');
        if ($ajuste === null || $ajuste === '') {
            $ajuste = 0;
            $entity->set('ajustePrecio', 0);
        }
        
        // El precio sugerido es el precio base con el ajuste aplicado
        $precioSugerido = $precioVentaBase * (1 + $ajuste / 100);
        
        // El rango se calcula a partir del precio sugerido (o del precio base, según prefieras)
        // Usamos el precio sugerido como centro del rango
        $rangoMin = $precioSugerido * (1 - $ajuste / 100);
        $rangoMax = $precioSugerido * (1 + $ajuste / 100);
        
        $GLOBALS['log']->info('Con ajuste del ' . $ajuste . '%:');
        $GLOBALS['log']->info('  Precio Sugerido: ' . $precioSugerido);
        $GLOBALS['log']->info('  Rango: ' . $rangoMin . ' - ' . $rangoMax);
        
        // Guardar valores
        $entity->set('valorMax', round($valorMaxM2, 2));
        $entity->set('valorMin', round($valorMinM2, 2));
        $entity->set('valorPromedio', round($precioM2Ponderado, 2));
        $entity->set('precioMax', round($precioMaximo, 2));
        $entity->set('precioMin', round($precioMinimo, 2));
        $entity->set('precioOriginal', round($precioVentaBase, 2));
        $entity->set('precioSugerido', round($precioSugerido, 2));
        $entity->set('rangoPrecioMin', round($rangoMin, 2));
        $entity->set('rangoPrecioMax', round($rangoMax, 2));
        
        $GLOBALS['log']->info('=== FIN RECALCULAR PRECIOS ===');
    }

    // ──────────────────────────────────────────────────────────────
    // Items relacionados
    // ──────────────────────────────────────────────────────────────
    private function guardarItemsRelacionados(string $avePrincipalId, array $items, string $tipo): void
    {
        $em = $this->entityManager;
        
        $existentes = $em->getRDBRepository('AvePrincipalItem')
            ->where([
                'avePrincipalId' => $avePrincipalId,
                'tipo' => $tipo
            ])->find();
        
        foreach ($existentes as $existente) {
            $em->removeEntity($existente);
        }
        
        foreach ($items as $item) {
            $itemId = is_object($item) ? $item->id : $item['id'];
            if (empty($itemId)) continue;
            
            $relacion = $em->getNewEntity('AvePrincipalItem');
            $relacion->set([
                'avePrincipalId' => $avePrincipalId,
                'itemId' => $itemId,
                'tipo' => $tipo
            ]);
            $em->saveEntity($relacion);
        }
    }

    private function getItemsRelacionados(string $avePrincipalId, string $tipo): array
    {
        $em = $this->entityManager;
        
        $relaciones = $em->getRDBRepository('AvePrincipalItem')
            ->where([
                'avePrincipalId' => $avePrincipalId,
                'tipo' => $tipo
            ])
            ->order('id', 'ASC')
            ->find();
        
        $result = [];
        foreach ($relaciones as $rel) {
            $item = $em->getEntity('AveFactoresDecisionesCanalesPlan', $rel->get('itemId'));
            if ($item) {
                $result[] = [
                    'id' => $item->getId(),
                    'name' => $item->get('name'),
                    'descripcion' => $item->get('descripcion'),
                    'impacto' => $item->get('impacto')
                ];
            }
        }
        return $result;
    }

    // ──────────────────────────────────────────────────────────────
    // Referencias
    // ──────────────────────────────────────────────────────────────
    private function guardarReferencias(string $avePrincipalId, array $referencias): void
    {
        $em = $this->entityManager;
        $existentes = $em->getRDBRepository('AveInmuebleReferencia')
            ->where(['avePrincipalId' => $avePrincipalId])->find();

        $idsNuevos = array_filter(array_column($referencias, 'id'));
        foreach ($existentes as $ref) {
            if (!in_array($ref->getId(), $idsNuevos)) {
                $em->removeEntity($ref);
            }
        }

        $campos = [
            'tipo','tipoPropiedad','usarCalculo','subtipoPropiedad','valorReferencial','areaTerreno',
            'areaConstruida','antiguedad','habitaciones','banos','estacionamiento','piso','ascensores',
            'terraza','acabados','seguridad','valorm2','descripcion','enlace'
        ];

        foreach ($referencias as $refData) {
            $refArr = (array) $refData;

            if (!empty($refArr['id'])) {
                $ref = $em->getEntity('AveInmuebleReferencia', $refArr['id']);
            } else {
                $ref = $em->getNewEntity('AveInmuebleReferencia');
                $ref->set('avePrincipalId', $avePrincipalId);
            }
            if (!$ref) continue;

            foreach ($campos as $campo) {
                if (array_key_exists($campo, $refArr)) {
                    $ref->set($campo, $refArr[$campo]);
                }
            }

            if (array_key_exists('fotoId', $refArr) && !empty($refArr['fotoId'])) {
                $ref->set('fotoId', $refArr['fotoId']);
                $attachment = $em->getEntity('Attachment', $refArr['fotoId']);
                if ($attachment) {
                    $ref->set('foto', $refArr['fotoId']);
                }
            } elseif (array_key_exists('fotoId', $refArr) && empty($refArr['fotoId'])) {
                $ref->set('fotoId', null);
            }

            $em->saveEntity($ref);
        }
    }

    private function getReferencias(string $avePrincipalId): array
    {
        $items = $this->entityManager->getRDBRepository('AveInmuebleReferencia')
            ->where(['avePrincipalId' => $avePrincipalId])
            ->order('id', 'ASC')
            ->find();
        $result = [];
        foreach ($items as $item) {
            $result[] = (array) $item->getValueMap();
        }
        return $result;
    }

    // ──────────────────────────────────────────────────────────────
    // Análisis FODA
    // ──────────────────────────────────────────────────────────────
    private function getAnalisisRespuestas(string $avePrincipalId): array
    {
        $items = $this->entityManager->getRDBRepository('AveAnalisisRespuesta')
            ->where(['avePrincipalId' => $avePrincipalId])
            ->order('id', 'ASC')
            ->find();

        $result = [];
        foreach ($items as $item) {
            $titulo = $this->entityManager->getEntity('AveAnalisis', $item->get('aveAnalisisId'));
            $result[] = [
                'id'            => $item->getId(),
                'aveAnalisisId' => $item->get('aveAnalisisId'),
                'tituloName'    => $titulo ? $titulo->get('name') : '',
                'tipo'          => $item->get('tipo'),
                'descripcion'   => $item->get('descripcion'),
            ];
        }
        return $result;
    }

    private function guardarAnalisisRespuestas(string $avePrincipalId, array $respuestas): void
    {
        $em = $this->entityManager;

        $existentes = $em->getRDBRepository('AveAnalisisRespuesta')
            ->where(['avePrincipalId' => $avePrincipalId])
            ->find();
        foreach ($existentes as $r) {
            $em->removeEntity($r);
        }

        foreach ($respuestas as $resp) {
            $arr = (array) $resp;
            if (empty($arr['aveAnalisisId']) || empty($arr['tipo']) || empty($arr['descripcion'])) {
                continue;
            }
            $entity = $em->getNewEntity('AveAnalisisRespuesta');
            $entity->set('avePrincipalId',  $avePrincipalId);
            $entity->set('aveAnalisisId',   $arr['aveAnalisisId']);
            $entity->set('tipo',            $arr['tipo']);
            $entity->set('descripcion',     $arr['descripcion']);
            $em->saveEntity($entity);
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Inmuebles
    // ──────────────────────────────────────────────────────────────
    public function buscarInmuebles(string $q, ?string $teamId): array
    {
        $repo = $this->entityManager->getRDBRepository('AveInmueble');
        $where = [];
        if ($q) {
            $where[] = ['OR' => [
                ['nombrePropietario*' => '%' . $q . '%'],
                ['referencia*' => '%' . $q . '%'],
                ['ciudad*' => '%' . $q . '%'],
                ['urbanizacion*' => '%' . $q . '%'],
            ]];
        }
        $items = $repo->where($where)->limit(20)->find();
        $result = [];
        foreach ($items as $item) {
            $result[] = [
                'id' => $item->getId(),
                'nombrePropietario' => $item->get('nombrePropietario'),
                'referencia' => $item->get('referencia'),
                'tipoPropiedad' => $item->get('tipoPropiedad'),
                'subtipoPropiedad' => $item->get('subtipoPropiedad'),
                'ciudad' => $item->get('ciudad'),
                'urbanizacion' => $item->get('urbanizacion'),
                'estado' => $item->get('estado'),
                'areaConstruida' => $item->get('areaConstruida'),
                'areaTerreno' => $item->get('areaTerreno'),
                'numHabitaciones' => $item->get('numHabitaciones'),
                'numBanos' => $item->get('numBanos'),
                'estatus' => $item->get('estatus'),
            ];
        }
        return ['success' => true, 'data' => $result];
    }

    public function getCatalogoAnalisis(?string $teamId): array
    {
        $repo  = $this->entityManager->getRDBRepository('AveAnalisis');
        $where = [
            'OR' => [
                ['predeterminado' => true],
                ['teamId'         => $teamId]
            ]
        ];
        $items  = $repo->where($where)->order('name', 'ASC')->find();
        $result = [];
        foreach ($items as $item) {
            $result[] = [
                'id'            => $item->getId(),
                'name'          => $item->get('name'),
                'predeterminado'=> $item->get('predeterminado'),
            ];
        }
        return ['success' => true, 'data' => $result];
    }

    public function crearAnalisisTitulo(\stdClass $data): array
    {
        $name = trim($data->name ?? $data->nombre ?? '');
        if (!$name) throw new BadRequest("El nombre es requerido.");

        $em     = $this->entityManager;
        $entity = $em->getNewEntity('AveAnalisis');
        $entity->set('name', $name);
        $entity->set('predeterminado', !empty($data->predeterminado));
        if (!empty($data->teamId)) {
            $entity->set('teamId', $data->teamId);
        }
        $em->saveEntity($entity);

        return [
            'success' => true,
            'data'    => [
                'id'   => $entity->getId(),
                'name' => $entity->get('name'),
            ],
        ];
    }

    public function crearInmueble(\stdClass $data): array
    {
        $em = $this->entityManager;
        $isEdit = !empty($data->id);
        $inm = $isEdit ? $em->getEntity('AveInmueble', $data->id) : $em->getNewEntity('AveInmueble');
        if (!$inm) {
            throw new BadRequest("Inmueble no encontrado para editar");
        }

        if (!$isEdit) {
            $inm->set('referencia', $this->generateNextPropNumber());
        }

        $campos = [
            'nombrePropietario', 'tipoPropiedad', 'subtipoPropiedad', 'estado', 'municipio', 'parroquia', 'ciudad',
            'avenidaCalle', 'edificioCasa', 'urbanizacion', 'areaConstruida', 'areaTerreno', 'antiguedad',
            'numHabitaciones', 'numBanos', 'puestoEstacionamiento', 'piso', 'ascensores', 'servicios',
            'terraza', 'seguridad', 'descripcion', 'fotoId'
        ];
        foreach ($campos as $campo) {
            if (property_exists($data, $campo) && $data->$campo !== null && $data->$campo !== '') {
                $inm->set($campo, $data->$campo);
            }
        }
        if (!empty($data->teamId)) {
            $inm->set('teamsIds', [$data->teamId]);
        }
        $em->saveEntity($inm);
        return ['success' => true, 'data' => $this->formatInmueble($inm)];
    }

    protected function generateNextPropNumber(): string
    {
        try {
            $pdo = $this->entityManager->getPDO();
            $sql = "SELECT referencia FROM ave_inmueble WHERE referencia LIKE 'Prop-%' ORDER BY id DESC LIMIT 1";
            $stmt = $pdo->query($sql);
            $last = $stmt->fetchColumn();
            if ($last && preg_match('/Prop-(\d+)/', $last, $matches)) {
                $next = (int)$matches[1] + 1;
            } else {
                $next = 1;
            }
            return 'Prop-' . str_pad($next, 6, '0', STR_PAD_LEFT);
        } catch (\Exception $e) {
            return 'Prop-' . date('YmdHis');
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Factores / Decisiones / Canales / Planes (Catálogo)
    // ──────────────────────────────────────────────────────────────
    public function getFactoresPorTipo(string $tipo, ?string $teamId): array
    {
        $repo = $this->entityManager->getRDBRepository('AveFactoresDecisionesCanalesPlan');

        if ($teamId) {
            $where = [
                'tipo' => $tipo,
                'OR'   => [
                    ['predeterminado' => true],
                    ['teamId'         => $teamId]
                ]
            ];
        } else {
            $where = [
                'tipo' => $tipo,
                'predeterminado'=> true
            ];
        }

        $items  = $repo->where($where)->order('name', 'ASC')->find();
        $result = [];
        foreach ($items as $item) {
            $result[] = [
                'id'            => $item->getId(),
                'name'          => $item->get('name'),
                'descripcion'   => $item->get('descripcion'),
                'tipo'          => $item->get('tipo'),
                'impacto'       => $item->get('impacto'),
                'predeterminado'=> (bool)$item->get('predeterminado'),
                'teamId'        => $item->get('teamId'),
            ];
        }
        return ['success' => true, 'data' => $result];
    }

    public function crearFactor(\stdClass $data): array
    {
        $name = $data->name ?? $data->nombre ?? null;
        $tipo = $data->tipo ?? null;
        if (!$name) {
            throw new BadRequest("El nombre es requerido.");
        }
        if (!$tipo) {
            throw new BadRequest("El tipo es requerido.");
        }
        $em = $this->entityManager;
        $entity = $em->getNewEntity('AveFactoresDecisionesCanalesPlan');
        $entity->set('name', trim($name));
        $entity->set('tipo', $tipo);
        $entity->set('descripcion', $data->descripcion ?? '');
        $entity->set('impacto', $data->impacto ?? null);
        $entity->set('predeterminado', !empty($data->predeterminado));
        if (!empty($data->teamId)) {
            $entity->set('teamId', $data->teamId);
        }
        $em->saveEntity($entity);
        return [
            'success' => true,
            'data' => [
                'id' => $entity->getId(),
                'name' => $entity->get('name'),
                'descripcion' => $entity->get('descripcion'),
                'tipo' => $entity->get('tipo'),
                'impacto' => $entity->get('impacto'),
                'predeterminado' => $entity->get('predeterminado'),
                'teamId' => $entity->get('teamId')
            ],
        ];
    }

    // ──────────────────────────────────────────────────────────────
    // Helpers privados
    // ──────────────────────────────────────────────────────────────
    private function setIfSet($entity, string $field, $value): void
    {
        if ($value !== null) {
            $entity->set($field, $value);
        }
    }

    private function formatAvePrincipal($entity): array
    {
        return [
            'id' => $entity->getId(),
            'numeroAve' => $entity->get('numeroAve'),
            'tipoIdentificacion' => $entity->get('tipoIdentificacion'),
            'identificacionCliente' => $entity->get('identificacionCliente'),
            'nombreCliente' => $entity->get('nombreCliente'),
            'correoCliente' => $entity->get('correoCliente'),
            'telefonoCliente' => $entity->get('telefonoCliente'),
            'aveInmuebleId' => $entity->get('aveInmuebleId'),
            'cedulaCatastral' => $entity->get('cedulaCatastral'),
            'cedCatNota' => $entity->get('cedCatNota'),
            'registroPropiedad' => $entity->get('registroPropiedad'),
            'regProNota' => $entity->get('regProNota'),
            'solvenciaMunicipal' => $entity->get('solvenciaMunicipal'),
            'solMunNota' => $entity->get('solMunNota'),
            'comentarioLegal' => $entity->get('comentarioLegal'),
            'comLegNota' => $entity->get('comLegNota'),
            'valorMax' => $entity->get('valorMax'),
            'precioMax' => $entity->get('precioMax'),
            'valorMin' => $entity->get('valorMin'),
            'precioMin' => $entity->get('precioMin'),
            'valorPromedio' => $entity->get('valorPromedio'),
            'precioOriginal' => $entity->get('precioOriginal'),
            'precioSugerido' => $entity->get('precioSugerido'),
            'ajustePrecio' => $entity->get('ajustePrecio'),
            'pesoOfertas' => $entity->get('pesoOfertas'),
            'pesoVentas' => $entity->get('pesoVentas'),
            'rangoPrecioMin' => $entity->get('rangoPrecioMin'),
            'rangoPrecioMax' => $entity->get('rangoPrecioMax'),
            'assignedUserId' => $entity->get('assignedUserId'),
            'assignedUserName' => $entity->get('assignedUserName'),
            'totalImpactoFactores' => $entity->get('totalImpactoFactores'),
            'assignedUserImageId' => null,
            'teamId' => null,
            'teamName' => null,
        ];
    }

    private function formatInmueble($entity): array
    {
        return [
            'id' => $entity->getId(),
            'referencia' => $entity->get('referencia'),
            'estatus' => $entity->get('estatus'),
            'nombrePropietario' => $entity->get('nombrePropietario'),
            'tipoPropiedad' => $entity->get('tipoPropiedad'),
            'subtipoPropiedad' => $entity->get('subtipoPropiedad'),
            'estado' => $entity->get('estado'),
            'municipio' => $entity->get('municipio'),
            'parroquia' => $entity->get('parroquia'),
            'ciudad' => $entity->get('ciudad'),
            'avenidaCalle' => $entity->get('avenidaCalle'),
            'edificioCasa' => $entity->get('edificioCasa'),
            'urbanizacion' => $entity->get('urbanizacion'),
            'areaConstruida' => $entity->get('areaConstruida'),
            'areaTerreno' => $entity->get('areaTerreno'),
            'antiguedad' => $entity->get('antiguedad'),
            'numHabitaciones' => $entity->get('numHabitaciones'),
            'numBanos' => $entity->get('numBanos'),
            'puestoEstacionamiento' => $entity->get('puestoEstacionamiento'),
            'piso' => $entity->get('piso'),
            'ascensores' => $entity->get('ascensores'),
            'servicios' => $entity->get('servicios'),
            'terraza' => $entity->get('terraza'),
            'seguridad' => $entity->get('seguridad'),
            'descripcion' => $entity->get('descripcion'),
            'fotoId' => $entity->get('fotoId'),
        ];
    }
}