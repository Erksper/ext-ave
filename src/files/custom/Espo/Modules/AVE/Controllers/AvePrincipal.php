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

        return $this->getServiceFactory()->create('AvePrincipal')
            ->getLista($pagina, $porPagina, $numero, $cliente, $identi, $asesor);
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

    public function postActionCrearFactor(Request $request, Response $response): array
    {
        return $this->getServiceFactory()->create('AvePrincipal')->crearFactor($request->getParsedBody());
    }

    public function postActionUploadFoto(Request $request, Response $response): array
    {
        try {
            if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
                throw new BadRequest("No se recibió ningún archivo o hubo un error");
            }

            $file = $_FILES['file'];
            $content = file_get_contents($file['tmp_name']);
            $name = $file['name'];
            $type = $file['type'];

            $em = $this->getContainer()->get('entityManager');

            $attachment = $em->getNewEntity('Attachment');
            $attachment->set([
                'name' => $name,
                'type' => $type,
                'size' => $file['size'],
                'role' => 'Attachment',
                'relatedType' => 'AveInmuebleReferencia',
                'field' => 'foto'
            ]);
            $em->saveEntity($attachment);

            $rootDir = realpath(__DIR__ . '/../../../../');
            $uploadDir = $rootDir . '/data/upload/';
            
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }

            $targetPath = $uploadDir . $attachment->getId();
            if (file_put_contents($targetPath, $content) === false) {
                $em->removeEntity($attachment);
                throw new BadRequest("No se pudo guardar el archivo en el servidor");
            }

            return ['success' => true, 'id' => $attachment->getId()];
        } catch (\Exception $e) {
            $GLOBALS['log']->error('Error en uploadFoto: ' . $e->getMessage());
            throw new BadRequest("Error interno: " . $e->getMessage());
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