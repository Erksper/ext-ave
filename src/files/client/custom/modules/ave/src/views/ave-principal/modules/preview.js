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
            '<p style="margin-top:12px;color:var(--ave-text-muted);">Generando vista previa...</p>' +
            '</div>'
        );

        setTimeout(function () {
            var html = '';

            // ── Encabezado ──
            html += '<div class="ave-preview-section">';
            html += '<div class="ave-preview-section-title"><i class="fas fa-file-invoice-dollar"></i> Avalúo de Inmueble</div>';
            html += '<div class="ave-preview-grid">';
            html += PreviewManager.field('N° AVE',        view.$el.find('#numeroAve').val()             || '-');
            html += PreviewManager.field('Cliente',       view.$el.find('#nombreCliente').val()         || '-');
            html += PreviewManager.field('Identificación',
                (view.$el.find('#tipoIdentificacion').val() || '') + ' ' +
                (view.$el.find('#identificacionCliente').val() || '-')
            );
            html += PreviewManager.field('Correo',    view.$el.find('#correoCliente').val()   || '-');
            html += PreviewManager.field('Teléfono',  view.$el.find('#telefonoCliente').val() || '-');
            html += '</div>';
            html += '</div>';

            // ── Inmueble ──
            var inmNombre = view.$el.find('#inm-nombre-propietario').text();
            if (inmNombre && inmNombre !== '-') {
                html += '<div class="ave-preview-section">';
                html += '<div class="ave-preview-section-title"><i class="fas fa-building"></i> Inmueble</div>';
                html += '<div class="ave-preview-grid">';
                html += PreviewManager.field('Propietario',     inmNombre);
                html += PreviewManager.field('Tipo',            view.$el.find('#inm-tipo').text()     || '-');
                html += PreviewManager.field('Sub Tipo',        view.$el.find('#inm-subtipo').text()  || '-');
                html += PreviewManager.field('Área Construida', view.$el.find('#inm-area').text()     || '-');
                html += PreviewManager.field('Hab / Baños',     view.$el.find('#inm-hab-ban').text()  || '-');
                html += PreviewManager.field('Ubicación',       view.$el.find('#inm-ubicacion').text()|| '-');
                html += '</div>';
                html += '</div>';
            }

            // ── Situación Legal ──
            var legal = [];
            if (view.$el.find('#chk-cedulaCatastral').is(':checked'))   legal.push({ doc: 'Cédula Catastral',            nota: view.$el.find('#cedCatNota').val() });
            if (view.$el.find('#chk-registroPropiedad').is(':checked'))  legal.push({ doc: 'Registro de Propiedad',       nota: view.$el.find('#regProNota').val() });
            if (view.$el.find('#chk-solvenciaMunicipal').is(':checked')) legal.push({ doc: 'Solvencia Municipal',         nota: view.$el.find('#solMunNota').val() });
            if (view.$el.find('#chk-comentarioLegal').is(':checked'))    legal.push({ doc: 'Comentario Legal Adicional',  nota: view.$el.find('#comLegNota').val() });

            if (legal.length > 0) {
                html += '<div class="ave-preview-section">';
                html += '<div class="ave-preview-section-title"><i class="fas fa-gavel"></i> Situación Legal</div>';
                html += '<div class="ave-preview-grid">';
                legal.forEach(function (l) {
                    html += PreviewManager.field(l.doc, l.nota || '—');
                });
                html += '</div></div>';
            }

            // ── Referencias ──
            var refsMgr = view.referenciasManager;
            ['promocion', 'vendido'].forEach(function (tipo) {
                var refs = refsMgr.items[tipo];
                if (refs.length === 0) return;
                var titulo = tipo === 'promocion' ? 'Referencias en Promoción' : 'Referencias Vendidas';
                html += '<div class="ave-preview-section">';
                html += '<div class="ave-preview-section-title"><i class="fas fa-tag"></i> ' + titulo + '</div>';
                refs.forEach(function (ref, idx) {
                    html += '<div style="margin-bottom:10px;padding:10px;background:#f8f9fa;border-radius:6px;border-left:3px solid var(--ave-primary);">';
                    html += '<strong style="color:var(--ave-primary);">#' + (idx + 1) + ' — ' + (ref.tipoPropiedad || '') + ' ' + (ref.subtipoPropiedad || '') + '</strong>';
                    html += '<div class="ave-preview-grid" style="margin-top:8px;">';
                    if (ref.valorReferencial) html += PreviewManager.field('Valor', '$ ' + parseFloat(ref.valorReferencial).toLocaleString());
                    if (ref.areaConstruida)   html += PreviewManager.field('Área',  ref.areaConstruida + ' m²');
                    if (ref.valorm2)          html += PreviewManager.field('$/m²',  '$ ' + parseFloat(ref.valorm2).toFixed(2));
                    html += '</div></div>';
                });
                html += '</div>';
            });

            // ── FODA ──
            var foda = view.fodaManager.items;
            if (foda.fortaleza.length > 0 || foda.debilidad.length > 0) {
                html += '<div class="ave-preview-section">';
                html += '<div class="ave-preview-section-title"><i class="fas fa-balance-scale"></i> Análisis FODA</div>';
                html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">';

                html += '<div>';
                html += '<div style="font-weight:700;color:#155724;margin-bottom:8px;"><i class="fas fa-thumbs-up"></i> Fortalezas</div>';
                foda.fortaleza.forEach(function (f) {
                    html += '<div style="padding:6px 10px;background:#d4edda;border-radius:4px;margin-bottom:4px;font-size:13px;">';
                    html += '<strong>' + PreviewManager.escape(f.name) + '</strong>';
                    if (f.detalle) html += '<br><span style="color:#555;">' + PreviewManager.escape(f.detalle) + '</span>';
                    html += '</div>';
                });
                html += '</div>';

                html += '<div>';
                html += '<div style="font-weight:700;color:#721c24;margin-bottom:8px;"><i class="fas fa-thumbs-down"></i> Debilidades</div>';
                foda.debilidad.forEach(function (d) {
                    html += '<div style="padding:6px 10px;background:#f8d7da;border-radius:4px;margin-bottom:4px;font-size:13px;">';
                    html += '<strong>' + PreviewManager.escape(d.name) + '</strong>';
                    if (d.detalle) html += '<br><span style="color:#555;">' + PreviewManager.escape(d.detalle) + '</span>';
                    html += '</div>';
                });
                html += '</div>';

                html += '</div></div>';
            }

            // ── Precio Sugerido ──
            var sugerido = parseFloat(view.$el.find('#precioSugerido').val()) || 0;
            if (sugerido > 0) {
                html += '<div class="ave-preview-section">';
                html += '<div class="ave-preview-section-title"><i class="fas fa-calculator"></i> Análisis de Precio</div>';
                html += '<div class="ave-preview-grid">';
                html += PreviewManager.field('Valor Máximo/m²',    '$ ' + (parseFloat(view.$el.find('#valorMax').val())      || 0).toLocaleString());
                html += PreviewManager.field('Precio Máximo',       '$ ' + (parseFloat(view.$el.find('#precioMax').val())     || 0).toLocaleString());
                html += PreviewManager.field('Valor Mínimo/m²',    '$ ' + (parseFloat(view.$el.find('#valorMin').val())      || 0).toLocaleString());
                html += PreviewManager.field('Precio Mínimo',       '$ ' + (parseFloat(view.$el.find('#precioMin').val())     || 0).toLocaleString());
                html += PreviewManager.field('Valor Promedio/m²',   '$ ' + (parseFloat(view.$el.find('#valorPromedio').val()) || 0).toLocaleString());
                html += PreviewManager.field('Precio Original',      '$ ' + (parseFloat(view.$el.find('#precioOriginal').val())|| 0).toLocaleString());
                html += PreviewManager.field('Ajuste',               (view.$el.find('#ajustePrecio').val() || '0') + '%');
                html += '</div>';
                html += '<div style="margin-top:16px;padding:16px;background:linear-gradient(135deg,var(--ave-primary),var(--ave-primary-light));border-radius:8px;text-align:center;">';
                html += '<div style="color:rgba(255,255,255,0.85);font-size:12px;text-transform:uppercase;font-weight:600;">Precio Sugerido</div>';
                html += '<div style="color:white;font-size:28px;font-weight:700;margin-top:4px;">$ ' +
                    sugerido.toLocaleString('es-VE', { minimumFractionDigits: 2 }) + '</div>';
                html += '</div>';
                html += '</div>';
            }

            // ── Decisiones ──
            var decisiones = view.decisionesManager.decisiones;
            if (decisiones.length > 0) {
                html += '<div class="ave-preview-section">';
                html += '<div class="ave-preview-section-title"><i class="fas fa-check-square"></i> Opciones de Decisión</div>';
                decisiones.forEach(function (d, idx) {
                    html += '<div style="padding:8px 12px;border-left:3px solid var(--ave-primary);margin-bottom:8px;background:#fafafa;border-radius:0 6px 6px 0;">';
                    html += '<strong>' + (idx + 1) + '. ' + PreviewManager.escape(d.name) + '</strong>';
                    if (d.descripcion) html += '<div style="color:#555;font-size:13px;margin-top:3px;">' + PreviewManager.escape(d.descripcion) + '</div>';
                    html += '</div>';
                });
                html += '</div>';
            }

            // ── Medios ──
            var canales = view.decisionesManager.canales;
            if (canales.length > 0) {
                html += '<div class="ave-preview-section">';
                html += '<div class="ave-preview-section-title"><i class="fas fa-bullhorn"></i> Medios Publicitarios</div>';
                html += '<div style="display:flex;flex-wrap:wrap;gap:8px;">';
                canales.forEach(function (c) {
                    html += '<span class="ave-badge ave-badge-primary">' + PreviewManager.escape(c.name) + '</span>';
                });
                html += '</div></div>';
            }

            // ── Plan ──
            var planes = view.decisionesManager.planes;
            if (planes.length > 0) {
                html += '<div class="ave-preview-section">';
                html += '<div class="ave-preview-section-title"><i class="fas fa-tasks"></i> Plan de Trabajo</div>';
                planes.forEach(function (p, idx) {
                    html += '<div style="padding:8px 12px;border-left:3px solid var(--ave-success);margin-bottom:8px;background:#fafafa;border-radius:0 6px 6px 0;">';
                    html += '<strong>' + (idx + 1) + '. ' + PreviewManager.escape(p.name) + '</strong>';
                    if (p.descripcion) html += '<div style="color:#555;font-size:13px;margin-top:3px;">' + PreviewManager.escape(p.descripcion) + '</div>';
                    html += '</div>';
                });
                html += '</div>';
            }

            $container.html(html);

        }, 600);
    };

    // ─── Helpers estáticos ───
    PreviewManager.field = function (label, value) {
        return '<div class="ave-preview-field">' +
            '<div class="ave-preview-field-label">' + label + '</div>' +
            '<div class="ave-preview-field-value">' + PreviewManager.escape(String(value)) + '</div>' +
            '</div>';
    };

    PreviewManager.escape = function (text) {
        if (!text) return '';
        return String(text).replace(/[&<>"']/g, function (m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
        });
    };

    return PreviewManager;
});
