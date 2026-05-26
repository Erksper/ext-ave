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
        $pagina    = (int)($request->getQueryParam('pagina')         ?? 1);
        $porPagina = (int)($request->getQueryParam('porPagina')      ?? 20);
        $numero    = $request->getQueryParam('numero')                ?? '';
        $cliente   = $request->getQueryParam('cliente')               ?? '';
        $identi    = $request->getQueryParam('identificacion')        ?? '';
        $asesor    = $request->getQueryParam('asesor')                ?? '';
        $status    = $request->getQueryParam('status')                ?? '';

        return $this->getServiceFactory()->create('AvePrincipal')
            ->getLista($pagina, $porPagina, $numero, $cliente, $identi, $asesor, $status);
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
            if (empty($data->aveId)) {
                throw new BadRequest("Parámetro 'aveId' requerido.");
            }
            
            $service = $this->getServiceFactory()->create('AvePrincipal');
            
            // Obtener la entidad actualizada
            $em = $this->getEntityManager();
            $entity = $em->getEntity('AvePrincipal', $data->aveId);
            
            if (property_exists($data, 'pesoOfertas')) {
                $entity->set('pesoOfertas', (float)$data->pesoOfertas);
                $entity->set('pesoVentas', 100 - (float)$data->pesoOfertas);
                $em->saveEntity($entity);
            }
            
            if (property_exists($data, 'ajustePrecio')) {
                $entity->set('ajustePrecio', (float)$data->ajustePrecio);
                $em->saveEntity($entity);
            }
            
            // Recalcular precios
            $service->recalcularPreciosParaEntity($entity);
            
            // Recargar la entidad para obtener los valores actualizados
            $entity = $em->getEntity('AvePrincipal', $data->aveId);
            
            return [
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
        } catch (\Exception $e) {
            $GLOBALS['log']->error('Error en recalcularPrecios: ' . $e->getMessage());
            throw new BadRequest($e->getMessage());
        }
    }

    protected function getEntityManager(): \Espo\ORM\EntityManager
    {
        return $this->getContainer()->get('entityManager');
    }
}