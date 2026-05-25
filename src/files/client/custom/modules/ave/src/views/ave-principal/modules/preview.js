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
        var analisis = view.fodaManager ? view.fodaManager.getData() : [];
        var fortalezas = analisis.filter(function(a) { return a.tipo === 'fortaleza'; });
        var debilidades = analisis.filter(function(a) { return a.tipo === 'debilidad'; });
        var factores = view.factoresManager ? view.factoresManager.getData() : [];
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
        var precioSugerido = parseFloat(view.$el.find('#precioSugerido').val()) || 0;
        var rangoMin = parseFloat(view.$el.find('#rangoPrecioMinDisplay').text().replace(/[^0-9.-]/g, '')) || 0;
        var rangoMax = parseFloat(view.$el.find('#rangoPrecioMaxDisplay').text().replace(/[^0-9.-]/g, '')) || 0;
        var pesoOfertas = parseFloat(view.$el.find('#pesoOfertas').val()) || 70;
        var pesoVentas = 100 - pesoOfertas;

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

        // Construir HTML del reporte
        var html = '';

        // ─────────────────────────────────────────────────────────────
        // ENCABEZADO CON TEXTO DE INTRODUCCIÓN
        // ─────────────────────────────────────────────────────────────
        html += '<div class="ave-preview-reporte" style="font-family: Arial, sans-serif; max-width: 1100px; margin: 0 auto;">';

        // Título principal
        html += '<div style="text-align: center; margin-bottom: 20px;">';
        html += '<h1 style="color: #B8A279; margin-bottom: 5px;">ANÁLISIS PARA UNA VENTA EXITOSA</h1>';
        html += '<h2 style="color: #666; font-size: 18px; margin-top: 0;">' + this.escape(ave.nombreCliente || 'Cliente') + '</h2>';
        html += '</div>';

        // Texto de introducción (como en el PDF)
        html += '<div style="margin-bottom: 25px; text-align: justify; line-height: 1.6;">';
        html += '<p>Estimado(a) ' + this.escape(ave.nombreCliente || 'Cliente') + ', Reciba de todo el equipo que labora en nuestras oficinas un cordial saludo de respeto hacia usted por brindarnos su confianza. Le presentamos el siguiente Análisis de Venta Exitoso correspondiente a su propiedad; con el propósito de mostrarle referencias actuales del mercado inmobiliario que le ayuden a tomar la mejor decisión sobre el valor promocional de su inmueble y realizar un excelente negocio inmobiliario.</p>';
        html += '</div>';

        // Referencia
        html += '<div style="text-align: center; margin-bottom: 20px;">';
        html += '<p><strong>Ref: ' + this.escape(ave.numeroAve || 'N/A') + '</strong></p>';
        html += '</div>';

        // ─────────────────────────────────────────────────────────────
        // UBICACIÓN Y FICHA DEL INMUEBLE
        // ─────────────────────────────────────────────────────────────
        html += '<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">';
        html += '<h3 style="color: #B8A279; margin-top: 0;"><i class="fas fa-map-marker-alt"></i> Ubicación</h3>';
        html += '<p><strong>' + this.escape(inmueble.urbanizacion || '') + ' ' + this.escape(inmueble.avenidaCalle || '') + ', ' + this.escape(inmueble.ciudad || '') + ', ' + this.escape(inmueble.estado || '') + '</strong></p>';
        html += '</div>';

        html += '<div style="background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin-bottom: 20px;">';
        html += '<h3 style="color: #B8A279; margin-top: 0;"><i class="fas fa-building"></i> Ficha del Inmueble</h3>';
        html += '<table style="width: 100%; border-collapse: collapse;">';
        html += '<tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Tipo de inmueble</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">' + this.escape(this.formatTipo(inmueble.tipoPropiedad)) + ' - ' + this.escape(this.formatSubtipo(inmueble.subtipoPropiedad)) + '</td></tr>';
        html += '<tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Propietario</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">' + this.escape(inmueble.nombrePropietario || '-') + '</td></tr>';
        html += '<tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>M² C / M² T</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">' + (inmueble.areaConstruida || '0') + ',00 / ' + (inmueble.areaTerreno || '0') + ',00</td></tr>';
        html += '<tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Antigüedad (años)</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">' + (inmueble.antiguedad || '-') + '</td></tr>';
        html += '<tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Habitaciones / Baños</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">' + (inmueble.numHabitaciones || '-') + ' / ' + (inmueble.numBanos || '-') + '</td></tr>';
        html += '<tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Estacionamiento</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">' + (inmueble.puestoEstacionamiento || '-') + '</td></tr>';
        if (inmueble.descripcion) {
            html += '<tr><td style="padding: 8px;"><strong>Descripción</strong></td><td style="padding: 8px;">' + this.escape(inmueble.descripcion) + '</td></tr>';
        }
        html += '</table>';
        html += '</div>';

        // ─────────────────────────────────────────────────────────────
        // REFERENCIAS EN PROMOCIÓN
        // ─────────────────────────────────────────────────────────────
        if (referenciasPromocion.length > 0) {
            html += '<div style="margin-bottom: 20px;">';
            html += '<h3 style="color: #B8A279;">1. VALOR REFERENCIAL DE INMUEBLES COMPARABLES EN PROMOCIÓN</h3>';
            html += '<div style="overflow-x: auto;">';
            html += '<table style="width: 100%; border-collapse: collapse; font-size: 12px;">';
            html += '<thead><tr style="background: #B8A279; color: white;">';
            html += '<th style="padding: 8px; border: 1px solid #ddd;">CARACTERÍSTICAS</th>';
            for (var i = 0; i < referenciasPromocion.length; i++) {
                html += '<th style="padding: 8px; border: 1px solid #ddd;">REF ' + (i + 1) + '</th>';
            }
            html += '<th style="padding: 8px; border: 1px solid #ddd;">ANEXO</th>';
            html += '</tr></thead><tbody>';

            var rows = [
                { label: 'Tipo', get: function(r) { return this.formatTipo(r.tipoPropiedad) + ' - ' + this.formatSubtipo(r.subtipoPropiedad); } },
                { label: 'M² C / M² T', get: function(r) { return (r.areaConstruida || '0') + ',00 / ' + (r.areaTerreno || '0') + ',00'; } },
                { label: 'Antigüedad (años)', get: function(r) { return r.antiguedad || '-'; } },
                { label: 'Habitaciones / Baños', get: function(r) { return (r.habitaciones || '-') + ' / ' + (r.banos || '-'); } },
                { label: 'Estacionamiento', get: function(r) { return r.estacionamiento || '-'; } },
                { label: 'Terraza', get: function(r) { return r.terraza ? 'Sí' : 'No'; } },
                { label: 'Valor (USD)', get: function(r) { return r.valorReferencial ? '$ ' + r.valorReferencial.toLocaleString() : '-'; } },
                { label: 'USD x M²', get: function(r) { return r.valorm2 ? '$ ' + r.valorm2.toFixed(2) : '-'; } },
                { label: 'Acabados', get: function(r) { return r.acabados || '-'; } }
            ];

            for (var r = 0; r < rows.length; r++) {
                html += '<tr>';
                html += '<td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>' + rows[r].label + '</strong></td>';
                for (var j = 0; j < referenciasPromocion.length; j++) {
                    html += '<td style="padding: 8px; border: 1px solid #ddd;">' + rows[r].get.call(this, referenciasPromocion[j]) + '</td>';
                }
                html += '<td style="padding: 8px; border: 1px solid #ddd;"></td>';
                html += '</tr>';
            }
            html += '</tbody></table>';
            html += '</div></div>';
        }

        // ─────────────────────────────────────────────────────────────
        // REFERENCIAS VENDIDOS
        // ─────────────────────────────────────────────────────────────
        if (referenciasVendidos.length > 0) {
            html += '<div style="margin-bottom: 20px;">';
            html += '<h3 style="color: #B8A279;">2. VALOR REFERENCIAL DE INMUEBLES VENDIDOS</h3>';
            html += '<div style="overflow-x: auto;">';
            html += '<table style="width: 100%; border-collapse: collapse; font-size: 12px;">';
            html += '<thead><tr style="background: #B8A279; color: white;">';
            html += '<th style="padding: 8px; border: 1px solid #ddd;">CARACTERÍSTICAS</th>';
            for (var i = 0; i < referenciasVendidos.length; i++) {
                html += '<th style="padding: 8px; border: 1px solid #ddd;">REF ' + (i + 1) + '</th>';
            }
            html += '<th style="padding: 8px; border: 1px solid #ddd;">ANEXO</th>';
            html += '</tr></thead><tbody>';

            for (var r = 0; r < rows.length; r++) {
                html += '<tr>';
                html += '<td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>' + rows[r].label + '</strong></td>';
                for (var j = 0; j < referenciasVendidos.length; j++) {
                    html += '<td style="padding: 8px; border: 1px solid #ddd;">' + rows[r].get.call(this, referenciasVendidos[j]) + '</td>';
                }
                html += '<td style="padding: 8px; border: 1px solid #ddd;"></td>';
                html += '</tr>';
            }
            html += '</tbody></table>';
            html += '</div></div>';
        }

        // ─────────────────────────────────────────────────────────────
        // FODA
        // ─────────────────────────────────────────────────────────────
        if (fortalezas.length > 0 || debilidades.length > 0) {
            html += '<div style="margin-bottom: 20px;">';
            html += '<h3 style="color: #B8A279;">3. ANÁLISIS DE FORTALEZAS Y DEBILIDADES</h3>';
            html += '<div style="display: flex; gap: 20px;">';
            html += '<div style="flex: 1; background: #d4edda; padding: 15px; border-radius: 8px;">';
            html += '<h4 style="color: #155724; margin-top: 0;"><i class="fas fa-thumbs-up"></i> Fortalezas</h4>';
            if (fortalezas.length === 0) {
                html += '<p>No hay fortalezas registradas</p>';
            } else {
                fortalezas.forEach(function(f) {
                    html += '<div><strong>' + this.escape(f.name) + '</strong>';
                    if (f.detalle) html += '<br><small>' + this.escape(f.detalle) + '</small>';
                    html += '</div>';
                }.bind(this));
            }
            html += '</div>';
            html += '<div style="flex: 1; background: #f8d7da; padding: 15px; border-radius: 8px;">';
            html += '<h4 style="color: #721c24; margin-top: 0;"><i class="fas fa-thumbs-down"></i> Debilidades</h4>';
            if (debilidades.length === 0) {
                html += '<p>No hay debilidades registradas</p>';
            } else {
                debilidades.forEach(function(d) {
                    html += '<div><strong>' + this.escape(d.name) + '</strong>';
                    if (d.detalle) html += '<br><small>' + this.escape(d.detalle) + '</small>';
                    html += '</div>';
                }.bind(this));
            }
            html += '</div>';
            html += '</div></div>';
        }

        // ─────────────────────────────────────────────────────────────
        // SITUACIÓN LEGAL
        // ─────────────────────────────────────────────────────────────
        html += '<div style="margin-bottom: 20px;">';
        html += '<h3 style="color: #B8A279;">Situación Legal</h3>';
        html += '<table style="width: 100%; border-collapse: collapse;">';
        html += '<tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Cédula Catastral</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">' + (legal.cedulaCatastral ? 'Sí' : 'No') + '</td><td style="padding: 8px; border-bottom: 1px solid #eee;">' + this.escape(legal.cedCatNota || '') + '</td></tr>';
        html += '<tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Registro de Propiedad</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">' + (legal.registroPropiedad ? 'Sí' : 'No') + '</td><td style="padding: 8px; border-bottom: 1px solid #eee;">' + this.escape(legal.regProNota || '') + '</td></tr>';
        html += '<tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Solvencia Municipal</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">' + (legal.solvenciaMunicipal ? 'Sí' : 'No') + '</td><td style="padding: 8px; border-bottom: 1px solid #eee;">' + this.escape(legal.solMunNota || '') + '</td></tr>';
        html += '<tr><td style="padding: 8px;"><strong>Comentario Adicional</strong></td><td style="padding: 8px;" colspan="2">' + (legal.comentarioLegal ? this.escape(legal.comLegNota || '') : 'No hay comentarios') + '</td></tr>';
        html += '</table>';
        html += '</div>';

        // ─────────────────────────────────────────────────────────────
        // FACTORES QUE INFLUYEN
        // ─────────────────────────────────────────────────────────────
        if (factores.length > 0) {
            html += '<div style="margin-bottom: 20px;">';
            html += '<h3 style="color: #B8A279;">¿Qué influye en el valor del precio de una propiedad actualmente?</h3>';
            html += '<ul>';
            factores.forEach(function(f) {
                var icono = f.impacto === 'positivo' ? '✅' : '❌';
                html += '<li>' + icono + ' ' + this.escape(f.name) + '</li>';
            }.bind(this));
            html += '</ul></div>';
        }

        // ─────────────────────────────────────────────────────────────
        // ANÁLISIS INTEGRAL Y PRECIO
        // ─────────────────────────────────────────────────────────────
        html += '<div style="margin-bottom: 20px;">';
        html += '<h3 style="color: #B8A279;">Análisis Integral</h3>';
        html += '<table style="width: 100%; border-collapse: collapse;">';
        html += '<tr style="background: #f5f5f5;"><td style="padding: 8px;"><strong>Síntesis de precio unitario Mts2</strong></td><td style="padding: 8px;"><strong>USD x m²</strong></td><td style="padding: 8px;"><strong>Precio (USD)</strong></td></tr>';
        html += '<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Precio Promedio Máximo</td><td style="padding: 8px; border-bottom: 1px solid #eee;">$ ' + (valorMax > 0 ? valorMax.toFixed(2) : '0,00') + '</td><td style="padding: 8px; border-bottom: 1px solid #eee;">$ ' + (precioMax > 0 ? precioMax.toLocaleString() : '0,00') + '</td></tr>';
        html += '<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Precio Promedio Mínimo</td><td style="padding: 8px; border-bottom: 1px solid #eee;">$ ' + (valorMin > 0 ? valorMin.toFixed(2) : '0,00') + '</td><td style="padding: 8px; border-bottom: 1px solid #eee;">$ ' + (precioMin > 0 ? precioMin.toLocaleString() : '0,00') + '</td></tr>';
        html += '<tr><td style="padding: 8px;">Precio Promedio de salida al mercado</td><td style="padding: 8px;">$ ' + (valorPromedio > 0 ? valorPromedio.toFixed(2) : '0,00') + '</td><td style="padding: 8px;">$ ' + (precioOriginal > 0 ? precioOriginal.toLocaleString() : '0,00') + '</td></tr>';
        html += '</table>';

        html += '<div style="background: #B8A279; color: white; padding: 15px; border-radius: 8px; text-align: center; margin-top: 15px;">';
        html += '<strong>Rango de Precio para salir al mercado: entre $ ' + (precioMin > 0 ? precioMin.toLocaleString() : '0') + ' y $ ' + (precioMax > 0 ? precioMax.toLocaleString() : '0') + '</strong>';
        html += '<br><span style="font-size: 14px;">Precio Sugerido: $ ' + (precioSugerido > 0 ? precioSugerido.toLocaleString() : '0,00') + ' (Ajuste: ' + ajustePrecio + '%)</span>';
        html += '<br><span style="font-size: 12px;">Ponderación: ' + pesoOfertas + '% Ofertas / ' + pesoVentas + '% Ventas</span>';
        html += '</div>';
        html += '</div>';

        // ─────────────────────────────────────────────────────────────
        // OPCIONES DE DECISIÓN
        // ─────────────────────────────────────────────────────────────
        if (decisiones.length > 0) {
            html += '<div style="margin-bottom: 20px;">';
            html += '<h3 style="color: #B8A279;">4. OPCIONES DE DECISIÓN</h3>';
            decisiones.forEach(function(d, idx) {
                html += '<div style="margin-bottom: 10px;">';
                html += '<strong>' + (idx + 1) + '. ' + this.escape(d.name) + '</strong>';
                if (d.descripcion) html += '<p style="margin-left: 20px; color: #666;">' + this.escape(d.descripcion) + '</p>';
                html += '</div>';
            }.bind(this));
            html += '</div>';
        }

        // ─────────────────────────────────────────────────────────────
        // PLAN DE TRABAJO Y MEDIOS
        // ─────────────────────────────────────────────────────────────
        if (planes.length > 0 || canales.length > 0) {
            html += '<div style="margin-bottom: 20px;">';
            html += '<h3 style="color: #B8A279;">5. PLAN DE TRABAJO</h3>';
            if (planes.length > 0) {
                planes.forEach(function(p, idx) {
                    html += '<div style="margin-bottom: 10px;">';
                    html += '<strong>' + (idx + 1) + '. ' + this.escape(p.name) + '</strong>';
                    if (p.descripcion) html += '<p style="margin-left: 20px; color: #666;">' + this.escape(p.descripcion) + '</p>';
                    html += '</div>';
                }.bind(this));
            }
            if (canales.length > 0) {
                html += '<h4 style="color: #B8A279;">Medios publicitarios</h4>';
                html += '<div style="display: flex; flex-wrap: wrap; gap: 10px;">';
                canales.forEach(function(c) {
                    html += '<span style="background: #e0e0e0; padding: 5px 10px; border-radius: 20px;">' + this.escape(c.name) + '</span>';
                }.bind(this));
                html += '</div>';
            }
            html += '</div>';
        }

        // ─────────────────────────────────────────────────────────────
        // FOOTER
        // ─────────────────────────────────────────────────────────────
        html += '<div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #B8A279; text-align: center; color: #999; font-size: 12px;">';
        html += '<p>Nuestra mayor satisfacción es poner a su disposición la información necesaria y datos referenciales que le sirvan de apoyo para tomar la mejor decisión.</p>';
        html += '<p><strong>Saludos cordiales,</strong><br>Equipo AVE<br>' + new Date().toLocaleDateString('es-ES') + '</p>';
        html += '</div>';

        html += '</div>'; // cierre container

        return html;
    };

    PreviewManager.prototype.formatTipo = function(tipo) {
        var map = {
            habitacional: 'Residencial',
            comercial: 'Comercial',
            industrial: 'Industrial',
            vacacional: 'Vacacional',
            terreno: 'Terreno'
        };
        return map[tipo] || tipo || '-';
    };

    PreviewManager.prototype.formatSubtipo = function(subtipo) {
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

    PreviewManager.prototype.escape = function(text) {
        if (!text) return '';
        return String(text).replace(/[&<>"']/g, function(m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
        });
    };

    return PreviewManager;
});