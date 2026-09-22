/* ==========================================================
 * Century 21 Venezuela — AVE
 * Normalización automática de fotografías
 *
 * FOTO GRANDE → procesar localmente (canvas) → máximo 2560px →
 * JPEG calidad adaptativa → objetivo <= 1.85 MiB
 *
 * Uso: ImageNormalizer.normalize(file) devuelve una Promise<File>.
 * Si el archivo ya pesa <= 2MB, se devuelve tal cual (no se toca).
 * ========================================================== */
define('ave:views/ave-principal/modules/imageNormalizer', [], function () {

    var AVE_ORIGINAL_LIMIT = 2 * 1024 * 1024;
    var MAX_ORIGINAL_SIZE = 120 * 1024 * 1024;

    // Dejamos margen debajo de 2 MiB para que la validación de tamaño
    // (file.size > 2MB) siga funcionando como red de seguridad.
    var TARGET_SIZE = Math.floor(1.85 * 1024 * 1024);
    var MAX_DIMENSION = 2560;

    function canvasToBlob(canvas, quality) {
        return new Promise(function (resolve, reject) {
            canvas.toBlob(function (blob) {
                if (!blob) {
                    reject(new Error('No fue posible convertir la fotografía.'));
                    return;
                }
                resolve(blob);
            }, 'image/jpeg', quality);
        });
    }

    function loadImage(file) {
        // createImageBitmap suele consumir menos memoria y trabaja
        // mejor con fotografías grandes.
        if (window.createImageBitmap) {
            try {
                return createImageBitmap(file, { imageOrientation: 'from-image' })
                    .catch(function () {
                        return createImageBitmap(file);
                    });
            } catch (e) {
                return createImageBitmap(file);
            }
        }

        // Fallback para navegadores sin createImageBitmap.
        return new Promise(function (resolve, reject) {
            var objectUrl = URL.createObjectURL(file);
            var image = new Image();

            image.onload = function () {
                URL.revokeObjectURL(objectUrl);
                resolve(image);
            };
            image.onerror = function () {
                URL.revokeObjectURL(objectUrl);
                reject(new Error('El navegador no pudo leer la fotografía.'));
            };

            image.src = objectUrl;
        });
    }

    async function normalize(file) {
        // Si ya cumple los 2MB no se toca.
        if (file.size <= AVE_ORIGINAL_LIMIT) {
            return file;
        }

        if (file.size > MAX_ORIGINAL_SIZE) {
            throw new Error('La fotografía supera el máximo permitido de 120 MB.');
        }

        var image = await loadImage(file);

        var sourceWidth = image.width || image.naturalWidth;
        var sourceHeight = image.height || image.naturalHeight;

        if (!sourceWidth || !sourceHeight) {
            if (typeof image.close === 'function') image.close();
            throw new Error('No se pudieron determinar las dimensiones de la fotografía.');
        }

        var scale = Math.min(1, MAX_DIMENSION / Math.max(sourceWidth, sourceHeight));
        var width = Math.max(1, Math.round(sourceWidth * scale));
        var height = Math.max(1, Math.round(sourceHeight * scale));

        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        var context = canvas.getContext('2d', { alpha: false });

        if (!context) {
            if (typeof image.close === 'function') image.close();
            throw new Error('No se pudo preparar la fotografía.');
        }

        // Fondo blanco: evita fondo negro cuando llega PNG/WebP con transparencia.
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);

        if (typeof image.close === 'function') image.close();

        // Calidad adaptativa.
        var qualities = [0.92, 0.90, 0.88, 0.86, 0.84, 0.82, 0.80, 0.78, 0.76, 0.74, 0.72];
        var blob = null;

        for (var q = 0; q < qualities.length; q++) {
            blob = await canvasToBlob(canvas, qualities[q]);
            if (blob.size <= TARGET_SIZE) break;
        }

        // Si aún es grande, reducir resolución.
        var attempts = 0;
        while (blob && blob.size > TARGET_SIZE && Math.max(canvas.width, canvas.height) > 1400 && attempts < 10) {
            var reducedWidth = Math.max(1, Math.round(canvas.width * 0.90));
            var reducedHeight = Math.max(1, Math.round(canvas.height * 0.90));

            var reducedCanvas = document.createElement('canvas');
            reducedCanvas.width = reducedWidth;
            reducedCanvas.height = reducedHeight;

            var reducedContext = reducedCanvas.getContext('2d', { alpha: false });
            if (!reducedContext) throw new Error('No se pudo reducir la fotografía.');

            reducedContext.fillStyle = '#ffffff';
            reducedContext.fillRect(0, 0, reducedWidth, reducedHeight);
            reducedContext.drawImage(canvas, 0, 0, reducedWidth, reducedHeight);

            canvas.width = 1;
            canvas.height = 1;
            canvas = reducedCanvas;

            blob = await canvasToBlob(canvas, 0.82);
            attempts++;
        }

        // Ajuste final.
        if (blob && blob.size > TARGET_SIZE) {
            blob = await canvasToBlob(canvas, 0.70);
        }

        if (!blob) {
            throw new Error('No fue posible procesar la fotografía.');
        }

        if (blob.size > AVE_ORIGINAL_LIMIT) {
            throw new Error('No fue posible reducir automáticamente la fotografía.');
        }

        canvas.width = 1;
        canvas.height = 1;

        var originalName = file.name || 'foto';
        var baseName = originalName.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9._-]+/g, '_') || 'foto';
        var finalName = baseName + '.jpg';

        return new File([blob], finalName, { type: 'image/jpeg', lastModified: Date.now() });
    }

    return { normalize: normalize };
});
