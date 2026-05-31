<?php
namespace Espo\Modules\AVE\Controllers;

use Espo\Core\Api\Request;
use Espo\Core\Api\Response;
use Espo\Core\Controllers\RecordBase;
use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Exceptions\NotFound;

class AvePrincipal extends RecordBase
{
    public function getActionGetLista(Request $request, Response $response): array
    {
        try {
            $pagina    = (int)($request->getQueryParam('pagina')         ?? 1);
            $porPagina = (int)($request->getQueryParam('porPagina')      ?? 20);
            $asesor    = $request->getQueryParam('asesor')                ?? '';
            $status    = $request->getQueryParam('status')                ?? '';
            $claId     = $request->getQueryParam('claId')                 ?? '';
            $oficinaId = $request->getQueryParam('oficinaId')             ?? '';
            $userId    = $request->getQueryParam('userId')                ?? '';

            $GLOBALS['log']->info('getActionGetLista llamado con parámetros: ' . json_encode([
                'pagina' => $pagina,
                'porPagina' => $porPagina,
                'asesor' => $asesor,
                'status' => $status,
                'claId' => $claId,
                'oficinaId' => $oficinaId,
                'userId' => $userId
            ]));

            $result = $this->getServiceFactory()->create('AvePrincipal')
                ->getLista($pagina, $porPagina, $asesor, $status, $claId, $oficinaId, $userId);
            
            $GLOBALS['log']->info('getActionGetLista resultado: ' . json_encode($result));
            
            return $result;
            
        } catch (\Exception $e) {
            $GLOBALS['log']->error('Error en getActionGetLista: ' . $e->getMessage());
            $GLOBALS['log']->error($e->getTraceAsString());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    public function getActionGetOrCreate(Request $request, Response $response): array
    {
        $id = $request->getQueryParam('id');
        if (!$id) throw new BadRequest("Parámetro 'id' requerido.");
        return $this->getServiceFactory()->create('AvePrincipal')->getOrCreate($id);
    }

    public function postActionGuardar(Request $request, Response $response): array
    {
        $data = $request->getParsedBody();
        if (empty($data->aveId)) throw new BadRequest("Parámetro 'aveId' requerido.");
        return $this->getServiceFactory()->create('AvePrincipal')->guardarCompleto($data);
    }

    public function getActionBuscarInmueble(Request $request, Response $response): array
    {
        $q      = $request->getQueryParam('q')      ?? '';
        $teamId = $request->getQueryParam('teamId') ?? null;
        return $this->getServiceFactory()->create('AvePrincipal')->buscarInmuebles($q, $teamId);
    }

    public function postActionCrearInmueble(Request $request, Response $response): array
    {
        return $this->getServiceFactory()->create('AvePrincipal')->crearInmueble($request->getParsedBody());
    }

    public function getActionGetFactoresPorTipo(Request $request, Response $response): array
    {
        $tipo   = $request->getQueryParam('tipo');
        $teamId = $request->getQueryParam('teamId') ?? null;
        if (!$tipo) throw new BadRequest("Parámetro 'tipo' requerido.");
        return $this->getServiceFactory()->create('AvePrincipal')->getFactoresPorTipo($tipo, $teamId);
    }

    public function postActionCambiarStatus(Request $request, Response $response): array
    {
        $data   = $request->getParsedBody();
        $aveId  = $data->aveId  ?? null;
        $status = $data->status ?? null;
        if (!$aveId || !$status) throw new BadRequest("Parámetros 'aveId' y 'status' requeridos.");
        return $this->getServiceFactory()->create('AvePrincipal')->cambiarStatus($aveId, $status);
    }

    public function getActionGenerarPdf(Request $request, Response $response): void
    {
        $aveId = $request->getQueryParam('aveId');
        if (!$aveId) throw new BadRequest("Parámetro 'aveId' requerido.");
        $this->getServiceFactory()->create('AvePrincipal')->generarPdf($aveId);
    }

    public function getActionGetCatalogoAnalisis(Request $request, Response $response): array
    {
        $teamId = $request->getQueryParam('teamId') ?? null;
        return $this->getServiceFactory()->create('AvePrincipal')->getCatalogoAnalisis($teamId);
    }

    public function postActionCrearAnalisisTitulo(Request $request, Response $response): array
    {
        return $this->getServiceFactory()->create('AvePrincipal')->crearAnalisisTitulo($request->getParsedBody());
    }

    public function postActionCrearFactor(Request $request, Response $response): array
    {
        return $this->getServiceFactory()->create('AvePrincipal')->crearFactor($request->getParsedBody());
    }

    public function getActionGetOficinasByCLA(Request $request, Response $response): array
    {
        $claId = $request->getQueryParam('claId');
        if (!$claId) {
            return ['success' => false, 'error' => 'claId es requerido'];
        }

        $em  = $this->getContainer()->get('entityManager');
        $pdo = $em->getPDO();

        try {
            $stmt = $pdo->prepare("
                SELECT DISTINCT entity_id FROM entity_team
                WHERE team_id = :claId AND entity_type = 'AvePrincipal' AND deleted = 0
                LIMIT 5000
            ");
            $stmt->execute(['claId' => $claId]);
            $aveIds = $stmt->fetchAll(\PDO::FETCH_COLUMN);

            if (empty($aveIds)) {
                return ['success' => true, 'data' => []];
            }

            $oficinasMap = [];
            foreach ($aveIds as $aid) {
                $stmt2 = $pdo->prepare("
                    SELECT DISTINCT et.team_id, t.name
                    FROM entity_team et
                    INNER JOIN team t ON et.team_id = t.id
                    WHERE et.entity_id = :aveId
                    AND et.entity_type = 'AvePrincipal'
                    AND et.deleted = 0
                    AND t.id NOT LIKE 'CLA%'
                    AND t.id != '1'
                ");
                $stmt2->execute(['aveId' => $aid]);
                $rows = $stmt2->fetchAll(\PDO::FETCH_ASSOC);
                foreach ($rows as $row) {
                    $tid = $row['team_id'];
                    $oficinasMap[$tid] = $row['name'];
                }
            }

            $oficinas = [];
            foreach ($oficinasMap as $id => $name) {
                $oficinas[] = ['id' => $id, 'name' => $name];
            }
            usort($oficinas, fn($a, $b) => strcmp($a['name'], $b['name']));

            return ['success' => true, 'data' => $oficinas];

        } catch (\Exception $e) {
            $GLOBALS['log']->error('AvePrincipal::getOficinasByCLA - ' . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function getActionGetAsesoresByOficina(Request $request, Response $response): array
    {
        $oficinaId = $request->getQueryParam('oficinaId');
        if (!$oficinaId) {
            return ['success' => false, 'error' => 'oficinaId es requerido'];
        }

        $em  = $this->getContainer()->get('entityManager');
        $pdo = $em->getPDO();

        try {
            $stmt = $pdo->prepare("
                SELECT DISTINCT entity_id FROM entity_team
                WHERE team_id = :oficinaId AND entity_type = 'AvePrincipal' AND deleted = 0
                LIMIT 5000
            ");
            $stmt->execute(['oficinaId' => $oficinaId]);
            $aveIds = $stmt->fetchAll(\PDO::FETCH_COLUMN);

            if (empty($aveIds)) {
                return ['success' => true, 'data' => []];
            }

            $asesoresMap = [];
            foreach ($aveIds as $aid) {
                $stmt2 = $pdo->prepare("
                    SELECT assigned_user FROM ave_principal WHERE id = :aveId AND deleted = 0
                ");
                $stmt2->execute(['aveId' => $aid]);
                $row = $stmt2->fetch(\PDO::FETCH_ASSOC);
                if ($row && !empty($row['assigned_user']) && !isset($asesoresMap[$row['assigned_user']])) {
                    $userId = $row['assigned_user'];
                    $user = $em->getEntityById('User', $userId);
                    if ($user && !$user->get('deleted') && $user->get('isActive')) {
                        $asesoresMap[$userId] = $user->get('name');
                    }
                }
            }

            $asesores = [];
            foreach ($asesoresMap as $id => $name) {
                $asesores[] = ['id' => $id, 'name' => $name];
            }
            usort($asesores, fn($a, $b) => strcmp($a['name'], $b['name']));

            return ['success' => true, 'data' => $asesores];

        } catch (\Exception $e) {
            $GLOBALS['log']->error('AvePrincipal::getAsesoresByOficina - ' . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function postActionUploadFoto(Request $request, Response $response): array
    {
        try {
            if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
                throw new BadRequest("No se recibió ningún archivo o hubo un error de subida");
            }

            $file = $_FILES['file'];

            // Validar tipo de archivo
            $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!in_array($file['type'], $allowedTypes)) {
                throw new BadRequest("Tipo de archivo no permitido. Solo se aceptan imágenes JPG, PNG, GIF o WEBP.");
            }

            $content = file_get_contents($file['tmp_name']);
            $name    = basename($file['name']);
            $type    = $file['type'];

            $em = $this->getEntityManager();

            // Crear entidad Attachment
            $attachment = $em->getNewEntity('Attachment');
            $attachment->set([
                'name'        => $name,
                'type'        => $type,
                'size'        => $file['size'],
                'role'        => 'Attachment',
                'relatedType' => 'AveInmuebleReferencia',
                'field'       => 'foto',
            ]);
            $em->saveEntity($attachment);

            // Usar el FileStorageManager de EspoCRM si está disponible,
            // si no, construir la ruta de forma segura
            $attachmentId = $attachment->getId();

            // Buscar la raíz de EspoCRM subiendo desde el directorio del controlador
            // Estructura: custom/Espo/Modules/AVE/Controllers/ → subir 5 niveles
            $rootDir = dirname(__DIR__, 5); // Controllers → AVE → Modules → Espo → custom → raíz
            $uploadDir = $rootDir . '/data/upload/';

            // Verificar que el directorio existe
            if (!is_dir($uploadDir)) {
                if (!mkdir($uploadDir, 0775, true)) {
                    $em->removeEntity($attachment);
                    throw new BadRequest("No se pudo crear el directorio de uploads: " . $uploadDir);
                }
            }

            // Verificar que el directorio es escribible
            if (!is_writable($uploadDir)) {
                $em->removeEntity($attachment);
                throw new BadRequest("El directorio de uploads no tiene permisos de escritura: " . $uploadDir);
            }

            $targetPath = $uploadDir . $attachmentId;

            if (file_put_contents($targetPath, $content) === false) {
                $em->removeEntity($attachment);
                throw new BadRequest("No se pudo guardar el archivo. Ruta intentada: " . $targetPath);
            }

            $GLOBALS['log']->info('AVE uploadFoto: archivo guardado en ' . $targetPath . ' (ID: ' . $attachmentId . ')');

            return ['success' => true, 'id' => $attachmentId, 'name' => $name];

        } catch (BadRequest $e) {
            $GLOBALS['log']->error('AVE uploadFoto BadRequest: ' . $e->getMessage());
            throw $e;
        } catch (\Exception $e) {
            $GLOBALS['log']->error('AVE uploadFoto Exception: ' . $e->getMessage() . ' en ' . $e->getFile() . ':' . $e->getLine());
            throw new BadRequest("Error interno al subir foto: " . $e->getMessage());
        }
    }

    public function postActionRecalcularPrecios(Request $request, Response $response): array
    {
        try {
            $data = $request->getParsedBody();
            $GLOBALS['log']->info('=== RECALCULAR PRECIOS ===');
            $GLOBALS['log']->info('Datos recibidos: ' . json_encode($data));
            
            if (empty($data->aveId)) {
                throw new BadRequest("Parámetro 'aveId' requerido.");
            }
            
            $service = $this->getServiceFactory()->create('AvePrincipal');
            
            $em = $this->getEntityManager();
            $entity = $em->getEntity('AvePrincipal', $data->aveId);
            
            if (!$entity) {
                throw new NotFound("AVE no encontrado: " . $data->aveId);
            }
            
            $GLOBALS['log']->info('Peso Ofertas actual: ' . $entity->get('pesoOfertas'));
            $GLOBALS['log']->info('Ajuste Precio actual: ' . $entity->get('ajustePrecio'));
            
            if (property_exists($data, 'pesoOfertas')) {
                $GLOBALS['log']->info('Actualizando pesoOfertas a: ' . $data->pesoOfertas);
                $entity->set('pesoOfertas', (float)$data->pesoOfertas);
                $entity->set('pesoVentas', 100 - (float)$data->pesoOfertas);
                $em->saveEntity($entity);
            }
            
            if (property_exists($data, 'ajustePrecio')) {
                $GLOBALS['log']->info('Actualizando ajustePrecio a: ' . $data->ajustePrecio);
                $entity->set('ajustePrecio', (float)$data->ajustePrecio);
                $em->saveEntity($entity);
            }
            
            // Recalcular precios
            $service->recalcularPreciosParaEntity($entity);
            
            // Recargar la entidad para obtener los valores actualizados
            $entity = $em->getEntity('AvePrincipal', $data->aveId);
            
            $result = [
                'success' => true,
                'data' => [
                    'valorMax' => $entity->get('valorMax'),
                    'valorMin' => $entity->get('valorMin'),
                    'valorPromedio' => $entity->get('valorPromedio'),
                    'precioMax' => $entity->get('precioMax'),
                    'precioMin' => $entity->get('precioMin'),
                    'precioOriginal' => $entity->get('precioOriginal'),
                    'precioSugerido' => $entity->get('precioSugerido'),
                    'rangoPrecioMin' => $entity->get('rangoPrecioMin'),
                    'rangoPrecioMax' => $entity->get('rangoPrecioMax'),
                    'pesoOfertas' => $entity->get('pesoOfertas'),
                    'pesoVentas' => $entity->get('pesoVentas'),
                    'ajustePrecio' => $entity->get('ajustePrecio')
                ]
            ];
            
            $GLOBALS['log']->info('Resultado enviado: ' . json_encode($result));
            
            return $result;
        } catch (\Exception $e) {
            $GLOBALS['log']->error('Error en recalcularPrecios: ' . $e->getMessage());
            $GLOBALS['log']->error($e->getTraceAsString());
            throw new BadRequest($e->getMessage());
        }
    }

    public function getActionGetUserInfo(Request $request): array
    {
        $userId = $request->getQueryParam('userId');
        if (!$userId) {
            return ['success' => false, 'error' => 'userId es requerido'];
        }

        $em   = $this->getContainer()->get('entityManager');
        $user = $em->getEntityById('User', $userId);
        if (!$user) {
            return ['success' => false, 'error' => 'Usuario no encontrado'];
        }

        $teamIds = []; 
        $claUsuario = null; 
        $claNombre = null;
        $oficinaUsuario = null;
        $oficinaNombre = null;
        
        $teams = $em->getRelation($user, 'teams')->find();
        if ($teams) {
            foreach ($teams as $team) {
                $id = $team->getId();
                $name = $team->get('name');
                $teamIds[] = $id;
                
                if (strpos($id, 'CLA') === 0) {
                    $claUsuario = $id;
                    $claNombre = $name;
                } else {
                    if (!$oficinaUsuario) {
                        $oficinaUsuario = $id;
                        $oficinaNombre = $name;
                    }
                }
            }
        }
        
        if (!$oficinaUsuario) {
            $dtId = $user->get('defaultTeamId');
            if ($dtId && strpos($dtId, 'CLA') !== 0) {
                $oficinaUsuario = $dtId;
                $teamDefault = $em->getEntityById('Team', $dtId);
                $oficinaNombre = $teamDefault ? $teamDefault->get('name') : null;
            }
        }

        $esCasaNacional = false;
        $esGerente = false;
        $esDirector = false;
        $esCoordinador = false;
        
        $roles = $em->getRelation($user, 'roles')->find();
        if ($roles) {
            foreach ($roles as $role) {
                $n = strtolower($role->get('name') ?? '');
                if (str_contains($n, 'casa nacional') || str_contains($n, 'casanacional')) {
                    $esCasaNacional = true;
                }
                if (!$esCasaNacional) {
                    if (str_contains($n, 'gerente')) $esGerente = true;
                    if (str_contains($n, 'director')) $esDirector = true;
                    if (str_contains($n, 'coordinador')) $esCoordinador = true;
                }
            }
        }

        $esAdminType = $user->get('type') === 'admin';
        $tienePoderCasaNacional = $esAdminType || $esCasaNacional;
        $tieneRolesGestion = !$tienePoderCasaNacional && ($esGerente || $esDirector || $esCoordinador);
        $esAsesorPuro = $user->get('type') === 'regular' && !$tieneRolesGestion && !$tienePoderCasaNacional;

        // Obtener CLAs disponibles para casa nacional
        $clasDisponibles = [];
        if ($tienePoderCasaNacional) {
            $clas = $em->getRepository('Team')
                ->select(['id', 'name'])
                ->where([
                    'deleted' => false,
                    'id*' => 'CLA%'
                ])
                ->find();
            foreach ($clas as $cla) {
                $clasDisponibles[] = ['id' => $cla->getId(), 'name' => $cla->get('name')];
            }
            usort($clasDisponibles, fn($a, $b) => strcmp($a['name'], $b['name']));
        }

        return ['success' => true, 'data' => [
            'usuarioId'       => $userId,
            'userType'        => $user->get('type'),
            'userName'        => $user->get('name'),
            'esCasaNacional'  => $tienePoderCasaNacional,
            'esGerente'       => $esGerente,
            'esDirector'      => $esDirector,
            'esCoordinador'   => $esCoordinador,
            'tieneRolesGestion' => $tieneRolesGestion,
            'esAsesor'        => $esAsesorPuro,
            'claUsuario'      => $claUsuario,
            'claNombre'       => $claNombre,
            'oficinaUsuario'  => $oficinaUsuario,
            'oficinaNombre'   => $oficinaNombre,
            'teamIds'         => $teamIds,
            'clasDisponibles' => $clasDisponibles
        ]];
    }



    protected function getEntityManager(): \Espo\ORM\EntityManager
    {
        return $this->getContainer()->get('entityManager');
    }
}