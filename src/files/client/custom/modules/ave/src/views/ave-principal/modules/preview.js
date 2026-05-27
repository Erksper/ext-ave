define('ave:views/ave-principal/modules/preview', [], function () {

    var PreviewManager = function (view) {
        this.view = view;
    };

    PreviewManager.prototype.generar = function () {
        var view = this.view;
        var $container = view.$el.find('#ave-preview-container');

        $container.html(
            '<div style="text-align:center;padding:40px;">' +
            '<div class="ave-spinner"></div>' +
            '<p style="margin-top:12px;">Generando vista previa...</p>' +
            '</div>'
        );

        setTimeout(function () {
            var html = this.generarHTML();
            $container.html(html);
        }.bind(this), 300);
    };

    PreviewManager.prototype.generarHTML = function () {
        var view = this.view;
        var ave = view.aveData || {};
        var inmueble = view.inmuebleData || {};

        // Obtener datos de las diferentes secciones
        var referencias = view.referenciasManager ? view.referenciasManager.getData() : [];
        var referenciasPromocion = referencias.filter(function(r) { return r.tipo === 'promocion'; });
        var referenciasVendidos = referencias.filter(function(r) { return r.tipo === 'vendido'; });
        
        // FODA
        var analisisData = { fortaleza: [], debilidad: [] };
        if (view.fodaManager) {
            analisisData = {
                fortaleza: view.fodaManager.items ? view.fodaManager.items.fortaleza || [] : [],
                debilidad: view.fodaManager.items ? view.fodaManager.items.debilidad || [] : []
            };
        }
        var fortalezas = analisisData.fortaleza;
        var debilidades = analisisData.debilidad;
        
        // Factores aplicados
        var factoresAplicados = view.factoresManager ? view.factoresManager.getData() : [];
        var totalImpactoFactores = 0;
        factoresAplicados.forEach(function(f) {
            totalImpactoFactores += (f.tipo === 'positivo') ? 1 : -1;
        });
        
        var decisiones = view.decisionesManager ? view.decisionesManager.getData() : [];
        var canales = view.canalesManager ? view.canalesManager.getData() : [];
        var planes = view.planesManager ? view.planesManager.getData() : [];

        // Datos de precio
        var valorMax = parseFloat(view.$el.find('#valorMax').val()) || 0;
        var precioMax = parseFloat(view.$el.find('#precioMax').val()) || 0;
        var valorMin = parseFloat(view.$el.find('#valorMin').val()) || 0;
        var precioMin = parseFloat(view.$el.find('#precioMin').val()) || 0;
        var valorPromedio = parseFloat(view.$el.find('#valorPromedio').val()) || 0;
        var precioOriginal = parseFloat(view.$el.find('#precioOriginal').val()) || 0;
        var ajustePrecio = parseFloat(view.$el.find('#ajustePrecio').val()) || 0;
        var pesoOfertas = parseFloat(view.$el.find('#pesoOfertas').val()) || 50;
        var pesoVentas = 100 - pesoOfertas;

        // Datos del asesor que creó el AVE
        var assignedUserName = ave.assignedUserName || 'Usuario';
        var assignedUserImageId = ave.assignedUserImageId || null;
        var assignedUserPhone = ave.telefonoCliente || null;
        var teamName = ave.teamName || null;
        
        // Logo del equipo
        var teamLogoUrl = view.teamLogoUrl || null;
        
        var fechaActual = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        var horaActual = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        // Datos legales
        var legal = {
            cedulaCatastral: view.$el.find('#chk-cedulaCatastral').is(':checked'),
            cedCatNota: view.$el.find('#cedCatNota').val(),
            registroPropiedad: view.$el.find('#chk-registroPropiedad').is(':checked'),
            regProNota: view.$el.find('#regProNota').val(),
            solvenciaMunicipal: view.$el.find('#chk-solvenciaMunicipal').is(':checked'),
            solMunNota: view.$el.find('#solMunNota').val(),
            comentarioLegal: view.$el.find('#chk-comentarioLegal').is(':checked'),
            comLegNota: view.$el.find('#comLegNota').val()
        };

        var formatPrice = function (n) {
            if (!n || isNaN(n)) return '0';
            return Math.round(parseFloat(n)).toLocaleString('es-VE');
        };

        var formatPriceDec = function (n) {
            if (!n || isNaN(n)) return '0.00';
            return parseFloat(n).toFixed(2).toLocaleString('es-VE');
        };

        var getImageUrl = function(imageId) {
            if (!imageId) return null;
            return 'api/v1/Attachment/file/' + imageId;
        };

        var escapeHtml = function(text) {
            if (!text) return '';
            return String(text).replace(/[&<>"']/g, function(m) {
                return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
            });
        };

        // Helper para formato de tipo de propiedad
        var formatTipo = function(tipo) {
            var map = {
                habitacional: 'Residencial',
                comercial: 'Comercial',
                industrial: 'Industrial',
                vacacional: 'Vacacional',
                terreno: 'Terreno'
            };
            return map[tipo] || tipo || '-';
        };

        var formatSubtipo = function(subtipo) {
            if (!subtipo) return '-';
            var map = {
                departamento: 'Apartamento',
                'town-house': 'Town-House',
                galpon: 'Galpón',
                'casa-bote': 'Casa Bote',
                'casa-duplex': 'Casa Duplex',
                'fondo-de-comercio': 'Fondo de comercio',
                'hotel-posada': 'Hotel/Posada',
                'tiempo-compartido': 'Tiempo compartido',
                'inmueble-productivo': 'Inmueble productivo'
            };
            return map[subtipo] || subtipo.charAt(0).toUpperCase() + subtipo.slice(1).replace(/-/g, ' ');
        };

        var html = '';
        html += '<div class="ave-preview-reporte" style="font-family: Arial, sans-serif; max-width: 1100px; margin: 0 auto;">';

        // ─────────────────────────────────────────────────────────────
        // HEADER: Logo izquierda | Título centro | Foto asesor derecha
        // ─────────────────────────────────────────────────────────────
        html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #B8A279; padding-bottom: 15px;">';
        
        // Logo izquierda
        html += '<div style="width: 120px; text-align: left;">';
        if (teamLogoUrl) {
            html += '<img src="' + escapeHtml(teamLogoUrl) + '" style="max-height: 60px; max-width: 120px; object-fit: contain;" onerror="this.style.display=\'none\'">';
        }
        html += '</div>';
        
        // Título centro
        html += '<div style="flex: 1; text-align: center;">';
        html += '<h1 style="color: #B8A279; margin: 0; font-size: 20px;">ANÁLISIS PARA UNA VENTA EXITOSA</h1>';
        html += '<h2 style="color: #666; margin: 5px 0 0; font-size: 16px;">' + escapeHtml(ave.nombreCliente || 'Cliente') + '</h2>';
        html += '</div>';
        
        // Foto asesor derecha
        html += '<div style="width: 120px; text-align: right;">';
        if (assignedUserImageId) {
            html += '<img src="' + escapeHtml(getImageUrl(assignedUserImageId)) + '" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid #B8A279;" onerror="this.style.display=\'none\'">';
        } else {
            html += '<div style="width: 50px; height: 50px; border-radius: 50%; background: #B8A279; display: inline-flex; align-items: center; justify-content: center;">';
            html += '<i class="fas fa-user" style="color: white; font-size: 24px;"></i>';
            html += '</div>';
        }
        html += '</div>';
        html += '</div>';

        // Referencia
        html += '<div style="text-align: center; margin-bottom: 20px;">';
        html += '<p><strong>Ref: ' + escapeHtml(ave.numeroAve || 'N/A') + '</strong></p>';
        html += '</div>';

        // Texto de introducción
        html += '<div style="margin-bottom: 25px; text-align: justify; line-height: 1.6; background: #f8f9fa; padding: 15px; border-radius: 8px;">';
        html += '<p style="margin: 0;">Estimado(a) ' + escapeHtml(ave.nombreCliente || 'Cliente') + ', Reciba de todo el equipo que labora en nuestras oficinas un cordial saludo de respeto hacia usted por brindarnos su confianza. Le presentamos el siguiente Análisis de Venta Exitoso correspondiente a su propiedad; con el propósito de mostrarle referencias actuales del mercado inmobiliario que le ayuden a tomar la mejor decisión sobre el valor promocional de su inmueble y realizar un excelente negocio inmobiliario.</p>';
        html += '</div>';

        // ─────────────────────────────────────────────────────────────
        // UBICACIÓN
        // ─────────────────────────────────────────────────────────────
        var ubicacion = [
            inmueble.urbanizacion,
            inmueble.avenidaCalle,
            inmueble.ciudad,
            inmueble.estado
        ].filter(Boolean).join(', ');
        
        html += '<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">';
        html += '<h3 style="color: #B8A279; margin-top: 0; font-size: 14px;"><i class="fas fa-map-marker-alt"></i> Ubicación</h3>';
        html += '<p><strong>' + escapeHtml(ubicacion || 'No especificada') + '</strong></p>';
        html += '</div>';

        // ─────────────────────────────────────────────────────────────
        // FICHA DEL INMUEBLE CON FOTO
        // ─────────────────────────────────────────────────────────────
        html += '<div style="background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin-bottom: 20px;">';
        html += '<h3 style="color: #B8A279; margin-top: 0; font-size: 14px;"><i class="fas fa-building"></i> Ficha del Inmueble</h3>';
        
        html += '<table style="width: 100%; border-collapse: collapse;">';
        html += '<tr>';
        html += '<td style="padding: 8px; border-bottom: 1px solid #eee; width: 30%;"><strong>Tipo de inmueble</strong></td>';
        html += '<td style="padding: 8px; border-bottom: 1px solid #eee;">' + escapeHtml(formatTipo(inmueble.tipoPropiedad)) + ' - ' + escapeHtml(formatSubtipo(inmueble.subtipoPropiedad)) + '</td>';
        html += '<td rowspan="6" style="width: 150px; text-align: center; vertical-align: middle;">';
        if (inmueble.fotoId) {
            html += '<img src="api/v1/Attachment/file/' + escapeHtml(inmueble.fotoId) + '" style="max-width: 130px; max-height: 130px; border-radius: 8px; border: 1px solid #ddd;" onerror="this.style.display=\'none\'">';
        } else {
            html += '<div style="width: 130px; height: 100px; background: #f0f0f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #999;"><i class="fas fa-image" style="font-size: 30px;"></i></div>';
        }
        html += '</td>';
        html += '</tr>';
        
        html += '<tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Propietario</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">' + escapeHtml(inmueble.nombrePropietario || '-') + '</td></tr>';
        html += '<tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>M² C / M² T</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">' + (inmueble.areaConstruida || '0') + ' / ' + (inmueble.areaTerreno || '0') + '</td></tr>';
        html += '<tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Antigüedad (años)</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">' + (inmueble.antiguedad || '-') + '</td></tr>';
        html += '<tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Habitaciones / Baños</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">' + (inmueble.numHabitaciones || '-') + ' / ' + (inmueble.numBanos || '-') + '</td></tr>';
        html += '<tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Estacionamiento</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">' + (inmueble.puestoEstacionamiento || '-') + '</td></tr>';
        
        if (inmueble.descripcion) {
            html += '<tr><td style="padding: 8px;"><strong>Descripción</strong></td><td colspan="2">' + escapeHtml(inmueble.descripcion) + '</td></tr>';
        }
        html += '</table>';
        html += '</div>';

        // ─────────────────────────────────────────────────────────────
        // REFERENCIAS EN PROMOCIÓN
        // ─────────────────────────────────────────────────────────────
        if (referenciasPromocion.length > 0) {
            html += '<div style="margin-bottom: 20px;">';
            html += '<h3 style="color: #B8A279; font-size: 14px;">1. VALOR REFERENCIAL DE INMUEBLES COMPARABLES EN PROMOCIÓN</h3>';
            html += '<div style="overflow-x: auto;">';
            html += '<table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #ddd;">';
            html += '<thead><tr style="background: #B8A279; color: white;">';
            html += '<th style="padding: 8px; border: 1px solid #ddd;">CARACTERÍSTICAS</th>';
            for (var i = 0; i < referenciasPromocion.length; i++) {
                html += '<th style="padding: 8px; border: 1px solid #ddd;">REF ' + (i + 1) + '</th>';
            }
            html += '</tr></thead><tbody>';

            var rows = [
                { label: 'Tipo', get: function(r) { return formatTipo(r.tipoPropiedad) + ' - ' + formatSubtipo(r.subtipoPropiedad); } },
                { label: 'M² C / M² T', get: function(r) { return (r.areaConstruida || '0') + ' / ' + (r.areaTerreno || '0'); } },
                { label: 'Antigüedad (años)', get: function(r) { return r.antiguedad || '-'; } },
                { label: 'Habitaciones / Baños', get: function(r) { return (r.habitaciones || '-') + ' / ' + (r.banos || '-'); } },
                { label: 'Estacionamiento', get: function(r) { return r.estacionamiento || '-'; } },
                { label: 'Terraza', get: function(r) { return r.terraza ? 'Sí' : 'No'; } },
                { label: 'Valor (USD)', get: function(r) { return r.valorReferencial ? '$ ' + formatPrice(r.valorReferencial) : '-'; } },
                { label: 'USD x M²', get: function(r) { return r.valorm2 ? '$ ' + parseFloat(r.valorm2).toFixed(2) : '-'; } },
                { label: 'Acabados', get: function(r) { return r.acabados || '-'; } }
            ];

            for (var r = 0; r < rows.length; r++) {
                html += '<tr>';
                html += '<td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>' + rows[r].label + '</strong></td>';
                for (var j = 0; j < referenciasPromocion.length; j++) {
                    html += '<td style="padding: 8px; border: 1px solid #ddd;">' + escapeHtml(rows[r].get(referenciasPromocion[j])) + '</td>';
                }
                html += '</tr>';
            }

            // Fila de enlaces
            html += '<tr>';
            html += '<td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Enlace</strong></td>';
            for (var j = 0; j < referenciasPromocion.length; j++) {
                var enlace = referenciasPromocion[j].enlace;
                var enlaceHtml = enlace ? '<a href="' + escapeHtml(enlace) + '" target="_blank" rel="noopener">Ver enlace</a>' : '-';
                html += '<td style="padding: 8px; border: 1px solid #ddd;">' + enlaceHtml + '</td>';
            }
            html += '</tr>';

            // Fila de fotos
            html += '<tr>';
            html += '<td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Foto</strong></td>';
            for (var j = 0; j < referenciasPromocion.length; j++) {
                var fotoId = referenciasPromocion[j].fotoId;
                var fotoHtml = fotoId ? '<img src="api/v1/Attachment/file/' + escapeHtml(fotoId) + '" style="max-width: 50px; max-height: 50px; border-radius: 4px;" onerror="this.style.display=\'none\'">' : '-';
                html += '<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">' + fotoHtml + '</td>';
            }
            html += '</tr>';

            html += '</tbody></table>';
            html += '</div></div>';
        }

        // ─────────────────────────────────────────────────────────────
        // REFERENCIAS VENDIDOS
        // ─────────────────────────────────────────────────────────────
        if (referenciasVendidos.length > 0) {
            html += '<div style="margin-bottom: 20px;">';
            html += '<h3 style="color: #B8A279; font-size: 14px;">2. VALOR REFERENCIAL DE INMUEBLES VENDIDOS</h3>';
            html += '<div style="overflow-x: auto;">';
            html += '<table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #ddd;">';
            html += '<thead><tr style="background: #B8A279; color: white;">';
            html += '<th style="padding: 8px; border: 1px solid #ddd;">CARACTERÍSTICAS</th>';
            for (var i = 0; i < referenciasVendidos.length; i++) {
                html += '<th style="padding: 8px; border: 1px solid #ddd;">REF ' + (i + 1) + '</th>';
            }
            html += '</tr></thead><tbody>';

            for (var r = 0; r < rows.length; r++) {
                html += '<tr>';
                html += '<td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>' + rows[r].label + '</strong></td>';
                for (var j = 0; j < referenciasVendidos.length; j++) {
                    html += '<td style="padding: 8px; border: 1px solid #ddd;">' + escapeHtml(rows[r].get(referenciasVendidos[j])) + '</td>';
                }
                html += '</tr>';
            }

            // Fila de enlaces
            html += '<tr>';
            html += '<td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Enlace</strong></td>';
            for (var j = 0; j < referenciasVendidos.length; j++) {
                var enlace = referenciasVendidos[j].enlace;
                var enlaceHtml = enlace ? '<a href="' + escapeHtml(enlace) + '" target="_blank" rel="noopener">Ver enlace</a>' : '-';
                html += '<td style="padding: 8px; border: 1px solid #ddd;">' + enlaceHtml + '</td>';
            }
            html += '</tr>';

            // Fila de fotos
            html += '<tr>';
            html += '<td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Foto</strong></td>';
            for (var j = 0; j < referenciasVendidos.length; j++) {
                var fotoId = referenciasVendidos[j].fotoId;
                var fotoHtml = fotoId ? '<img src="api/v1/Attachment/file/' + escapeHtml(fotoId) + '" style="max-width: 50px; max-height: 50px; border-radius: 4px;" onerror="this.style.display=\'none\'">' : '-';
                html += '<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">' + fotoHtml + '</td>';
            }
            html += '</tr>';

            html += '</tbody></table>';
            html += '</div></div>';
        }

        // ─────────────────────────────────────────────────────────────
        // FODA
        // ─────────────────────────────────────────────────────────────
        if (fortalezas.length > 0 || debilidades.length > 0) {
            html += '<div style="margin-bottom: 20px;">';
            html += '<h3 style="color: #B8A279; font-size: 14px;">3. ANÁLISIS DE FORTALEZAS Y DEBILIDADES</h3>';
            html += '<div style="display: flex; gap: 20px;">';
            html += '<div style="flex: 1; background: #d4edda; padding: 15px; border-radius: 8px;">';
            html += '<h4 style="color: #155724; margin-top: 0; font-size: 13px;"><i class="fas fa-thumbs-up"></i> Fortalezas</h4>';
            if (fortalezas.length === 0) {
                html += '<p style="font-size: 12px;">No hay fortalezas registradas</p>';
            } else {
                fortalezas.forEach(function(f) {
                    html += '<div style="margin-bottom: 12px; font-size: 12px;">';
                    html += '<strong>' + escapeHtml(f.tituloName) + '</strong>';
                    if (f.descripcion) html += '<br><span style="color: #666;">' + escapeHtml(f.descripcion) + '</span>';
                    html += '</div>';
                });
            }
            html += '</div>';
            html += '<div style="flex: 1; background: #f8d7da; padding: 15px; border-radius: 8px;">';
            html += '<h4 style="color: #721c24; margin-top: 0; font-size: 13px;"><i class="fas fa-thumbs-down"></i> Debilidades</h4>';
            if (debilidades.length === 0) {
                html += '<p style="font-size: 12px;">No hay debilidades registradas</p>';
            } else {
                debilidades.forEach(function(d) {
                    html += '<div style="margin-bottom: 12px; font-size: 12px;">';
                    html += '<strong>' + escapeHtml(d.tituloName) + '</strong>';
                    if (d.descripcion) html += '<br><span style="color: #666;">' + escapeHtml(d.descripcion) + '</span>';
                    html += '</div>';
                });
            }
            html += '</div>';
            html += '</div></div>';
        }

        // ─────────────────────────────────────────────────────────────
        // FACTORES QUE INFLUYEN EN EL PRECIO
        // ─────────────────────────────────────────────────────────────
        if (factoresAplicados.length > 0) {
            html += '<div style="margin-bottom: 20px;">';
            html += '<h3 style="color: #B8A279; font-size: 14px;">4. FACTORES QUE INFLUYEN EN EL PRECIO</h3>';
            html += '<div style="overflow-x: auto;">';
            html += '<table style="width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #ddd;">';
            html += '<thead><tr style="background: #B8A279; color: white;">';
            html += '<th style="padding: 8px; border: 1px solid #ddd;">Factor</th>';
            html += '<th style="padding: 8px; border: 1px solid #ddd; width: 120px; text-align: center;">Impacto</th>';
            html += '<th style="padding: 8px; border: 1px solid #ddd; width: 100px; text-align: center;">% Afectación</th>';
            html += '</tr></thead><tbody>';
            
            factoresAplicados.forEach(function(f) {
                var nombreFactor = escapeHtml(f.name || '');
                var esPositivo = f.tipo === 'positivo';
                var icono = esPositivo ? '✓' : '✗';
                var textoImpacto = esPositivo ? 'Positivo' : 'Negativo';
                var porcentaje = esPositivo ? '+1%' : '-1%';
                var claseColor = esPositivo ? '#27ae60' : '#e74c3c';
                
                html += '<tr>';
                html += '<td style="padding: 8px; border: 1px solid #ddd;">' + nombreFactor + '</td>';
                html += '<td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: ' + claseColor + '; font-weight: bold;">' + icono + ' ' + textoImpacto + '</td>';
                html += '<td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: ' + claseColor + ';">' + porcentaje + '</td>';
                html += '</tr>';
            });
            
            html += '</tbody></table>';
            html += '</div>';
            
            // Mostrar total de impacto
            var signoTotal = totalImpactoFactores >= 0 ? '+' : '';
            var claseTotal = totalImpactoFactores >= 0 ? '#27ae60' : '#e74c3c';
            html += '<div style="background: #f0f0f0; border-left: 4px solid #B8A279; padding: 12px; margin-top: 16px; text-align: center; font-size: 13px;">';
            html += '<strong>📊 Total de afectación:</strong> <span style="font-weight: bold; color: ' + claseTotal + ';">' + signoTotal + totalImpactoFactores + '%</span><br>';
            html += '<small>Debido a estos factores, el precio de la propiedad puede verse afectado en un <strong>' + signoTotal + Math.abs(totalImpactoFactores) + '%</strong></small>';
            html += '</div>';
            html += '</div>';
        }

        // ─────────────────────────────────────────────────────────────
        // SITUACIÓN LEGAL
        // ─────────────────────────────────────────────────────────────
        html += '<div style="margin-bottom: 20px;">';
        html += '<h3 style="color: #B8A279; font-size: 14px;">5. Situación Legal</h3>';
        html += '<table style="width: 100%; border-collapse: collapse; font-size: 12px;">';
        html += '<tr><td style="padding: 8px; border-bottom: 1px solid #eee; width: 30%;"><strong>Cédula Catastral</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee; width: 15%;">' + (legal.cedulaCatastral ? 'Sí' : 'No') + '</td><td style="padding: 8px; border-bottom: 1px solid #eee;">' + escapeHtml(legal.cedCatNota || '') + '</td></tr>';
        html += '<tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Registro de Propiedad</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">' + (legal.registroPropiedad ? 'Sí' : 'No') + '</td><td style="padding: 8px; border-bottom: 1px solid #eee;">' + escapeHtml(legal.regProNota || '') + '</td></tr>';
        html += '<tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Solvencia Municipal</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">' + (legal.solvenciaMunicipal ? 'Sí' : 'No') + '</td><td style="padding: 8px; border-bottom: 1px solid #eee;">' + escapeHtml(legal.solMunNota || '') + '</td></tr>';
        html += '<tr><td style="padding: 8px;"><strong>Comentario Adicional</strong></td><td colspan="2">' + (legal.comentarioLegal ? escapeHtml(legal.comLegNota || '') : 'No hay comentarios') + '</td></tr>';
        html += '</table>';
        html += '</div>';

        // ─────────────────────────────────────────────────────────────
        // FRASE DORADA ANTES DE ANÁLISIS INTEGRAL
        // ─────────────────────────────────────────────────────────────
        html += '<div style="background: linear-gradient(135deg, #F5E6CA 0%, #E8D5B0 100%); border-left: 6px solid #B8A279; border-radius: 8px; padding: 16px 24px; margin: 24px 0; text-align: center;">';
        html += '<p style="color: #8B6914; font-size: 16px; font-weight: 600; margin: 0;">';
        html += '<i class="fas fa-quote-left" style="margin-right: 10px;"></i>';
        html += 'De acuerdo a la información suministrada, ¿qué precio de salida al mercado le pondría usted a su propiedad?';
        html += '<i class="fas fa-quote-right" style="margin-left: 10px;"></i>';
        html += '</p>';
        html += '</div>';

        // ─────────────────────────────────────────────────────────────
        // ANÁLISIS INTEGRAL Y PRECIO
        // ─────────────────────────────────────────────────────────────
        html += '<div style="margin-bottom: 20px;">';
        html += '<h3 style="color: #B8A279; font-size: 14px;">6. Análisis Integral</h3>';
        html += '<table style="width: 100%; border-collapse: collapse; font-size: 12px;">';
        html += '<tr style="background: #f5f5f5;">';
        html += '<td style="padding: 8px;"><strong>Síntesis de precio unitario Mts2</strong></td>';
        html += '<td style="padding: 8px;"><strong>USD x m²</strong></td>';
        html += '<td style="padding: 8px;"><strong>Precio (USD)</strong></td>';
        html += '</tr>';
        html += '<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Precio Promedio Máximo</td><td style="padding: 8px; border-bottom: 1px solid #eee;">$ ' + formatPriceDec(valorMax) + '</td><td style="padding: 8px; border-bottom: 1px solid #eee;">$ ' + formatPrice(precioMax) + '</td></tr>';
        html += '<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Precio Promedio Mínimo</td><td style="padding: 8px; border-bottom: 1px solid #eee;">$ ' + formatPriceDec(valorMin) + '</td><td style="padding: 8px; border-bottom: 1px solid #eee;">$ ' + formatPrice(precioMin) + '</td></tr>';
        html += '<tr><td style="padding: 8px;">Precio Promedio de salida al mercado</td><td style="padding: 8px;">$ ' + formatPriceDec(valorPromedio) + '</td><td style="padding: 8px;">$ ' + formatPrice(precioOriginal) + '</td></tr>';
        html += '</table>';

        // Precio ajustado por factores
        var precioConAjuste = parseFloat(precioOriginal) * (1 + totalImpactoFactores / 100);
        
        html += '<div style="background: #B8A279; color: white; padding: 15px; border-radius: 8px; text-align: center; margin-top: 15px;">';
        html += '<strong>Rango de Precio para salir al mercado: entre $ ' + formatPrice(precioMin) + ' y $ ' + formatPrice(precioMax) + '</strong>';
        html += '<br><span style="font-size: 12px;">Precio Sugerido: $ ' + formatPrice(precioOriginal) + ' (Ajuste: ' + ajustePrecio + '%)</span>';
        html += '<br><span style="font-size: 11px;">Ponderación: ' + pesoOfertas + '% Ofertas / ' + pesoVentas + '% Ventas</span>';
        if (totalImpactoFactores !== 0) {
            var signoFactor = totalImpactoFactores >= 0 ? '+' : '';
            html += '<br><span style="font-size: 11px;">Ajuste por factores: ' + signoFactor + totalImpactoFactores + '% → Precio con factores: $ ' + formatPrice(precioConAjuste) + '</span>';
        }
        html += '</div>';
        html += '</div>';

        // ─────────────────────────────────────────────────────────────
        // OPCIONES DE DECISIÓN
        // ─────────────────────────────────────────────────────────────
        if (decisiones.length > 0) {
            html += '<div style="margin-bottom: 20px;">';
            html += '<h3 style="color: #B8A279; font-size: 14px;">7. OPCIONES DE DECISIÓN</h3>';
            decisiones.forEach(function(d, idx) {
                html += '<div style="margin-bottom: 10px; font-size: 12px;">';
                html += '<strong>' + (idx + 1) + '. ' + escapeHtml(d.name) + '</strong>';
                if (d.descripcion) html += '<p style="margin-left: 20px; color: #666; font-size: 12px;">' + escapeHtml(d.descripcion) + '</p>';
                html += '</div>';
            });
            html += '</div>';
        }

        // ─────────────────────────────────────────────────────────────
        // PLAN DE TRABAJO Y MEDIOS
        // ─────────────────────────────────────────────────────────────
        if (planes.length > 0 || canales.length > 0) {
            html += '<div style="margin-bottom: 20px;">';
            html += '<h3 style="color: #B8A279; font-size: 14px;">8. PLAN DE TRABAJO</h3>';
            if (planes.length > 0) {
                planes.forEach(function(p, idx) {
                    html += '<div style="margin-bottom: 10px; font-size: 12px;">';
                    html += '<strong>' + (idx + 1) + '. ' + escapeHtml(p.name) + '</strong>';
                    if (p.descripcion) html += '<p style="margin-left: 20px; color: #666; font-size: 12px;">' + escapeHtml(p.descripcion) + '</p>';
                    html += '</div>';
                });
            }
            if (canales.length > 0) {
                html += '<h4 style="color: #B8A279; font-size: 13px; margin-top: 10px;">Medios publicitarios</h4>';
                html += '<div style="display: flex; flex-wrap: wrap; gap: 8px;">';
                canales.forEach(function(c) {
                    html += '<span style="background: #e0e0e0; padding: 4px 10px; border-radius: 20px; font-size: 11px;">' + escapeHtml(c.name) + '</span>';
                });
                html += '</div>';
            }
            html += '</div>';
        }

        // ─────────────────────────────────────────────────────────────
        // FOOTER - Datos del asesor al final del reporte
        // ─────────────────────────────────────────────────────────────
        html += '<div style="margin-top: 40px; padding: 20px; background: #f5f5f5; border-radius: 8px; text-align: center; border-top: 3px solid #B8A279;">';
        html += '<p style="margin-bottom: 15px; font-size: 12px; color: #666;">Sr(a) ' + escapeHtml(ave.nombreCliente || 'Cliente') + ', nuestra mayor satisfacción es poner a su disposición la información necesaria y datos referenciales que le sirvan de apoyo para tomar la mejor decisión en la venta de su inmueble y poder contribuir en el bienestar de su familia, siempre a sus órdenes para brindarle el mejor servicio inmobiliario.</p>';
        html += '<hr style="margin: 15px auto; width: 50%; border-color: #ddd;">';
        html += '<p style="font-size: 14px; margin-bottom: 10px;"><strong>Saludos cordiales,</strong></p>';
        html += '<div style="display: flex; align-items: center; justify-content: center; gap: 15px; flex-wrap: wrap;">';
        if (assignedUserImageId) {
            html += '<img src="' + escapeHtml(getImageUrl(assignedUserImageId)) + '" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid #B8A279;" onerror="this.style.display=\'none\'">';
        } else {
            html += '<div style="width: 60px; height: 60px; border-radius: 50%; background: #B8A279; display: flex; align-items: center; justify-content: center;"><i class="fas fa-user" style="color: white; font-size: 28px;"></i></div>';
        }
        html += '<div style="text-align: left;">';
        html += '<p style="margin: 0; font-weight: bold; font-size: 15px;">' + escapeHtml(assignedUserName) + '</p>';
        html += '<p style="margin: 3px 0 0; font-size: 12px; color: #666;">Asesor Inmobiliario</p>';
        if (assignedUserPhone) {
            html += '<p style="margin: 3px 0 0; font-size: 12px; color: #666;">📞 ' + escapeHtml(assignedUserPhone) + '</p>';
        }
        if (teamName) {
            html += '<p style="margin: 3px 0 0; font-size: 12px; color: #666;">🏢 ' + escapeHtml(teamName) + '</p>';
        }
        html += '</div>';
        html += '</div>';
        html += '<p style="margin-top: 15px; font-size: 10px; color: #999; text-align: center;">Fecha de emisión: ' + fechaActual + ' ' + horaActual + '</p>';
        html += '</div>';

        html += '</div>';
        return html;
    };

    return PreviewManager;
});