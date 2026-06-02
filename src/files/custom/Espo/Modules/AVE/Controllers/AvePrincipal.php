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
            $pagina    = (int)($request->getQueryParam('pagina')    ?? 1);
            $porPagina = (int)($request->getQueryParam('porPagina') ?? 20);
            $asesor    = $request->getQueryParam('asesor')           ?? '';
            $status    = $request->getQueryParam('status')           ?? '';
            $claId     = $request->getQueryParam('claId')            ?? '';
            $oficinaId = $request->getQueryParam('oficinaId')        ?? '';
            $userId    = $request->getQueryParam('userId')           ?? '';

            $result = $this->getServiceFactory()->create('AvePrincipal')
                ->getLista($pagina, $porPagina, $asesor, $status, $claId, $oficinaId, $userId);

            return $result;

        } catch (\Exception $e) {
            $GLOBALS['log']->error('Error en getActionGetLista: ' . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
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
        $descripcion = $request->getQueryParam('descripcion') ?? null;
        if (!$tipo) throw new BadRequest("Parámetro 'tipo' requerido.");
        return $this->getServiceFactory()->create('AvePrincipal')->getFactoresPorTipo($tipo, $teamId, $descripcion);
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

        $pdo = $this->getContainer()->get('entityManager')->getPDO();

        try {
            $stmt = $pdo->prepare("
                SELECT DISTINCT t.id, TRIM(t.name) as name
                FROM team_user tu
                INNER JOIN team t ON tu.team_id = t.id
                WHERE tu.user_id IN (
                    SELECT DISTINCT u.id
                    FROM team_user tu2
                    INNER JOIN `user` u ON tu2.user_id = u.id
                    WHERE tu2.team_id = :claId
                    AND tu2.deleted = 0
                    AND u.deleted = 0
                    AND u.is_active = 1
                )
                AND tu.deleted = 0
                AND t.deleted = 0
                AND t.id NOT LIKE 'CLA%'
                AND TRIM(t.name) != ''
                ORDER BY t.name ASC
            ");
            $stmt->execute(['claId' => $claId]);
            $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            $oficinas = [];
            foreach ($rows as $row) {
                if (!empty($row['name'])) {
                    $oficinas[] = ['id' => $row['id'], 'name' => $row['name']];
                }
            }

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

        $pdo = $this->getContainer()->get('entityManager')->getPDO();

        try {
            $stmt = $pdo->prepare("
                SELECT DISTINCT u.id, CONCAT(u.first_name, ' ', u.last_name) as name
                FROM team_user tu
                INNER JOIN `user` u ON tu.user_id = u.id
                WHERE tu.team_id = :oficinaId
                AND tu.deleted = 0
                AND u.deleted = 0
                AND u.is_active = 1
                ORDER BY name ASC
            ");
            $stmt->execute(['oficinaId' => $oficinaId]);
            $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            $asesores = [];
            foreach ($rows as $row) {
                $asesores[] = ['id' => $row['id'], 'name' => $row['name']];
            }

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

            $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!in_array($file['type'], $allowedTypes)) {
                throw new BadRequest("Tipo de archivo no permitido. Solo se aceptan imágenes JPG, PNG, GIF o WEBP.");
            }

            $content = file_get_contents($file['tmp_name']);
            $name    = basename($file['name']);
            $type    = $file['type'];

            $em = $this->getEntityManager();

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

            $attachmentId = $attachment->getId();
            $rootDir      = dirname(__DIR__, 5);
            $uploadDir    = $rootDir . '/data/upload/';

            if (!is_dir($uploadDir)) {
                if (!mkdir($uploadDir, 0775, true)) {
                    $em->removeEntity($attachment);
                    throw new BadRequest("No se pudo crear el directorio de uploads: " . $uploadDir);
                }
            }

            if (!is_writable($uploadDir)) {
                $em->removeEntity($attachment);
                throw new BadRequest("El directorio de uploads no tiene permisos de escritura: " . $uploadDir);
            }

            $targetPath = $uploadDir . $attachmentId;

            if (file_put_contents($targetPath, $content) === false) {
                $em->removeEntity($attachment);
                throw new BadRequest("No se pudo guardar el archivo. Ruta intentada: " . $targetPath);
            }

            return ['success' => true, 'id' => $attachmentId, 'name' => $name];

        } catch (BadRequest $e) {
            throw $e;
        } catch (\Exception $e) {
            throw new BadRequest("Error interno al subir foto: " . $e->getMessage());
        }
    }

    public function postActionRecalcularPrecios(Request $request, Response $response): array
    {
        try {
            $data = $request->getParsedBody();

            if (empty($data->aveId)) {
                throw new BadRequest("Parámetro 'aveId' requerido.");
            }

            $service = $this->getServiceFactory()->create('AvePrincipal');
            $em      = $this->getEntityManager();
            $entity  = $em->getEntity('AvePrincipal', $data->aveId);

            if (!$entity) {
                throw new NotFound("AVE no encontrado: " . $data->aveId);
            }

            if (property_exists($data, 'pesoOfertas')) {
                $entity->set('pesoOfertas', (float)$data->pesoOfertas);
                $entity->set('pesoVentas',  100 - (float)$data->pesoOfertas);
                $em->saveEntity($entity);
            }

            if (property_exists($data, 'ajustePrecio')) {
                $entity->set('ajustePrecio', (float)$data->ajustePrecio);
                $em->saveEntity($entity);
            }

            $service->recalcularPreciosParaEntity($entity);

            $entity = $em->getEntity('AvePrincipal', $data->aveId);

            return [
                'success' => true,
                'data'    => [
                    'valorMax'      => $entity->get('valorMax'),
                    'valorMin'      => $entity->get('valorMin'),
                    'valorPromedio' => $entity->get('valorPromedio'),
                    'precioMax'     => $entity->get('precioMax'),
                    'precioMin'     => $entity->get('precioMin'),
                    'precioOriginal'=> $entity->get('precioOriginal'),
                    'precioSugerido'=> $entity->get('precioSugerido'),
                    'rangoPrecioMin'=> $entity->get('rangoPrecioMin'),
                    'rangoPrecioMax'=> $entity->get('rangoPrecioMax'),
                    'pesoOfertas'   => $entity->get('pesoOfertas'),
                    'pesoVentas'    => $entity->get('pesoVentas'),
                    'ajustePrecio'  => $entity->get('ajustePrecio'),
                ],
            ];

        } catch (\Exception $e) {
            $GLOBALS['log']->error('Error en recalcularPrecios: ' . $e->getMessage());
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

        $teamIds        = [];
        $claUsuario     = null;
        $claNombre      = null;
        $oficinaUsuario = null;
        $oficinaNombre  = null;

        $teams = $em->getRelation($user, 'teams')->find();
        if ($teams) {
            foreach ($teams as $team) {
                $id   = $team->getId();
                $name = $team->get('name');
                $teamIds[] = $id;

                if (strpos($id, 'CLA') === 0) {
                    $claUsuario = $id;
                    $claNombre  = $name;
                } else {
                    if (!$oficinaUsuario) {
                        $oficinaUsuario = $id;
                        $oficinaNombre  = $name;
                    }
                }
            }
        }

        if (!$oficinaUsuario) {
            $dtId = $user->get('defaultTeamId');
            if ($dtId && strpos($dtId, 'CLA') !== 0) {
                $oficinaUsuario = $dtId;
                $teamDefault    = $em->getEntityById('Team', $dtId);
                $oficinaNombre  = $teamDefault ? $teamDefault->get('name') : null;
            }
        }

        $esCasaNacional = false;
        $esGerente      = false;
        $esDirector     = false;
        $esCoordinador  = false;

        $roles = $em->getRelation($user, 'roles')->find();
        if ($roles) {
            foreach ($roles as $role) {
                $n = strtolower($role->get('name') ?? '');
                if (str_contains($n, 'casa nacional') || str_contains($n, 'casanacional')) {
                    $esCasaNacional = true;
                }
                if (!$esCasaNacional) {
                    if (str_contains($n, 'gerente'))     $esGerente     = true;
                    if (str_contains($n, 'director'))    $esDirector    = true;
                    if (str_contains($n, 'coordinador')) $esCoordinador = true;
                }
            }
        }

        $esAdminType           = $user->get('type') === 'admin';
        $tienePoderCasaNacional = $esAdminType || $esCasaNacional;
        $tieneRolesGestion      = !$tienePoderCasaNacional && ($esGerente || $esDirector || $esCoordinador);
        $esAsesorPuro           = $user->get('type') === 'regular' && !$tieneRolesGestion && !$tienePoderCasaNacional;

        // CLAs disponibles para casa nacional
        $clasDisponibles = [];
        if ($tienePoderCasaNacional) {
            $clas = $em->getRepository('Team')
                ->select(['id', 'name'])
                ->where(['deleted' => false, 'id*' => 'CLA%'])
                ->find();
            foreach ($clas as $cla) {
                $clasDisponibles[] = ['id' => $cla->getId(), 'name' => $cla->get('name')];
            }
            usort($clasDisponibles, fn($a, $b) => strcmp($a['name'], $b['name']));
        }

        return ['success' => true, 'data' => [
            'usuarioId'         => $userId,
            'userType'          => $user->get('type'),
            'userName'          => $user->get('name'),
            'esCasaNacional'    => $tienePoderCasaNacional,
            'esGerente'         => $esGerente,
            'esDirector'        => $esDirector,
            'esCoordinador'     => $esCoordinador,
            'tieneRolesGestion' => $tieneRolesGestion,
            'esAsesor'          => $esAsesorPuro,
            'claUsuario'        => $claUsuario,
            'claNombre'         => $claNombre,
            'oficinaUsuario'    => $oficinaUsuario,
            'oficinaNombre'     => $oficinaNombre,
            'teamIds'           => $teamIds,
            'clasDisponibles'   => $clasDisponibles,
        ]];
    }

    protected function getEntityManager(): \Espo\ORM\EntityManager
    {
        return $this->getContainer()->get('entityManager');
    }
}